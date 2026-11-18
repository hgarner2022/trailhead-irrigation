"use server"

import "server-only"
import { callApi } from "@/api/core/call"
import { ApiError } from "@/api/core/errors"
import { messagesSend } from "@/api/v1/messages/handlers"
import { passesSell } from "@/api/v1/passes/sell"
import { isRoutePerson, peopleList } from "@/api/v1/people/handlers"
import { visitsGet, visitsMove } from "@/api/v1/visits/handlers"
import { invoicesRemind, invoicesSend } from "@/api/v1/invoices/handlers"
import { paymentsChargeCard, DECLINED } from "@/api/v1/payments/charge"
import { paymentsRecord, paymentsRefund } from "@/api/v1/payments/handlers"
import { visitsMarkClosed } from "@/api/v1/visits/money"
import { visitsCancel, visitsCreate, visitsMarkNotDone, visitsUpdate } from "@/api/v1/visits/office"
import { weekdayOf } from "@/api/v1/shared"
import { paidTotal } from "@/lib/money/words"
import type { NotDoneReason } from "@/lib/admin/visit-defaults"
import type { NewPassInput, SoldPass } from "@/app/(admin)/admin/_screens/visit-actions-types"
import { act, nothing, type ActionOutcome } from "./act"

// The server actions of the visit panel, the customer panel and New visit. Each one runs a handler through
// `callApi` as the signed-in manager (see act.ts). A routine action answers with what the screen needs to offer
// Undo: where the visit was before.

export interface Where {
  day: string | null
  personId: string | null
  startTime: string | null
}

/** Move to a day and a time (null is any time that day), with the visit's own person when they work that weekday, else the first on the schedule who does. */
export const moveVisitTo = async (visitId: string, day: string, time: string | null): Promise<ActionOutcome<Where>> =>
  act(async (ctx) => {
    const v = await callApi(ctx, visitsGet, { id: visitId })
    const people = (await callApi(ctx, peopleList, { active: "true" })).data.filter((p) => isRoutePerson(p) && p.workingDays.includes(weekdayOf(day)))
    const person = people.find((p) => p.id === v.personId) ?? people[0]
    if (!person) throw new ApiError("unprocessable", "No one works that day. Pick another day.")
    await callApi(ctx, visitsMove, { id: visitId, personId: person.id, scheduledOn: day, ...(time ? { startTime: time } : {}) })
    return { day: v.scheduledOn, personId: v.personId, startTime: v.startTime }
  })

/** The undo of a move: back to the day, person and time it had, or to Unscheduled when it had none. */
export const putBack = async (visitId: string, was: Where): Promise<ActionOutcome> =>
  act((ctx) =>
    nothing(
      was.day && was.personId
        ? callApi(ctx, visitsMove, { id: visitId, personId: was.personId, scheduledOn: was.day, ...(was.startTime ? { startTime: was.startTime } : {}) })
        : callApi(ctx, visitsUpdate, { id: visitId, unscheduled: true }),
    ),
  )

export type PaidBy = { method: "check" | "venmo" | "cash"; reference?: string; amount?: number }

/** Mark done and nothing else (`visits.markClosed`): no charge, no payment row, no invoice. How it is paid is the next step. */
export const markDone = async (visitId: string, opts: { completedOn?: string } = {}): Promise<ActionOutcome> =>
  act((ctx) => nothing(callApi(ctx, visitsMarkClosed, { id: visitId, ...opts })), "tech")

/** The Charge button: `payments.chargeCard` as the signed-in manager. A declined card is a refusal in the panel's words (the row is written and the customer is emailed first), so the screen offers the other ways. */
export const chargeCard = async (visitId: string): Promise<ActionOutcome> =>
  act(async (ctx) => {
    const row = await callApi(ctx, paymentsChargeCard, { visitId })
    if (row.status !== "succeeded") throw new ApiError("unprocessable", DECLINED)
    return undefined
  }, "tech")

/** A Refund: `payments.refund` for the whole of what is left of that payment, a negative row naming it. */
export const refundPayment = async (paymentId: string): Promise<ActionOutcome> => act((ctx) => nothing(callApi(ctx, paymentsRefund, { paymentId })))

export const undoDone = async (visitId: string): Promise<ActionOutcome> => act((ctx) => nothing(callApi(ctx, visitsMarkClosed, { id: visitId, undo: true })), "tech")

/**
 * The Done-and-owed form's Record payment: a payment row on the visit's job through `payments.record`, for what is still unpaid on the
 * visit (its price less what has arrived), or the amount typed for a visit with no price yet. A visit already paid says so and writes
 * nothing, so a double submit or a stale panel cannot post it twice; `payments.record` refuses it again and refuses a pass visit
 * charged to a card.
 */
export const recordPayment = async (visitId: string, paidBy: PaidBy): Promise<ActionOutcome> =>
  act(async (ctx) => {
    const visit = await callApi(ctx, visitsGet, { id: visitId })
    if (visit.status !== "completed") throw new ApiError("unprocessable", "Mark the visit done first")
    const owed = visit.amount - paidTotal([...visit.payments, ...visit.jobPaymentShares])
    if (visit.amount > 0 && owed <= 0) throw new ApiError("conflict", "This visit is already paid")
    await callApi(ctx, paymentsRecord, { jobId: visit.jobId, visitId, amount: visit.amount > 0 ? owed : (paidBy.amount ?? 0), method: paidBy.method, ...(paidBy.reference ? { reference: paidBy.reference } : {}) })
    return undefined
  }, "tech")

/** Send an invoice for a done job that still owes money: `invoices.send` freezes the lines and sends one message with the pay link. */
export const sendBill = async (jobId: string): Promise<ActionOutcome> => act((ctx) => nothing(callApi(ctx, invoicesSend, { jobId })), "tech")

/** Remind: `invoices.remind` sends the open invoice's reminder; two presses in one day send one. */
export const remindBill = async (invoiceId: string): Promise<ActionOutcome> => act((ctx) => nothing(callApi(ctx, invoicesRemind, { id: invoiceId })))

export const markNotDone = async (visitId: string, reason: NotDoneReason, note?: string): Promise<ActionOutcome<Where>> =>
  act(async (ctx) => {
    const v = await callApi(ctx, visitsGet, { id: visitId })
    await callApi(ctx, visitsMarkNotDone, { id: visitId, reason, ...(note ? { note } : {}) })
    return { day: v.scheduledOn, personId: v.personId, startTime: v.startTime }
  })

export const editVisit = async (visitId: string, changes: { durationMinutes?: number; personId?: string; notes?: string; accessNote?: string }): Promise<ActionOutcome> =>
  act((ctx) => nothing(callApi(ctx, visitsUpdate, { id: visitId, ...changes })))

export const cancelVisit = async (visitId: string, reason?: string): Promise<ActionOutcome> => act((ctx) => nothing(callApi(ctx, visitsCancel, { id: visitId, ...(reason ? { reason } : {}) })))

export const sendText = async (customerId: string, visitId: string | undefined, text: string): Promise<ActionOutcome> =>
  act((ctx) => nothing(callApi(ctx, messagesSend, { customerId, kind: "note", text, ...(visitId ? { visitId } : {}) })))

/** The "On my way" button: the on-the-way text for a visit that is today, once per visit per day; the API answers why when it cannot go. */
export const sendOnTheWay = async (visitId: string): Promise<ActionOutcome> =>
  act(async (ctx) => {
    const v = await callApi(ctx, visitsGet, { id: visitId })
    await callApi(ctx, messagesSend, { customerId: v.customerId, kind: "on-the-way", visitId })
    return undefined
  })

export interface NewVisitInput {
  customerId?: string
  newCustomer?: { firstName: string; lastName: string; email?: string; phone?: string; property: { address: string; town: string } }
  /** left out when `serviceKey` is given */
  kind?: "turn-on" | "inspection" | "blowout" | "repair" | "install" | "other"
  /** the catalogue service the job is for; its kind, minutes and price rule apply */
  serviceKey?: string
  scheduledOn?: string
  startTime?: string
  durationMinutes?: number
  personId?: string
  price?: number
  notes?: string
}

export const createVisit = async (input: NewVisitInput): Promise<ActionOutcome<{ id: string; jobId: string }>> =>
  act(async (ctx) => {
    const made = await callApi(ctx, visitsCreate, input as never)
    return { id: made.id, jobId: made.jobId }
  })

/** New pass: `passes.sell` makes the job, the active pass, its visits with their days, the consent and the confirmation in one call. */
export const sellPass = async (input: NewPassInput): Promise<ActionOutcome<SoldPass>> =>
  act(async (ctx) => {
    const sold = await callApi(ctx, passesSell, input as never)
    return { id: sold.id, number: sold.number, firstName: sold.firstName }
  })
