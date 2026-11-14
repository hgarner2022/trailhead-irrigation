"use server"

import "server-only"
import { callApi } from "@/api/core/call"
import { ApiError } from "@/api/core/errors"
import { messagesSend } from "@/api/v1/messages/handlers"
import { trucksList } from "@/api/v1/trucks/handlers"
import { visitsGet, visitsMove } from "@/api/v1/visits/handlers"
import { visitsMarkClosed, visitsRecordPayment } from "@/api/v1/visits/money"
import { visitsCancel, visitsCreate, visitsMarkNotDone, visitsUpdate } from "@/api/v1/visits/office"
import { weekdayOf } from "@/api/v1/shared"
import type { NotDoneReason } from "@/lib/admin/visit-defaults"
import { act, nothing, type ActionOutcome } from "./act"

// The server actions of the visit panel, the customer panel and New visit. Each one runs a handler through
// `callApi` as the signed-in manager (see act.ts). A routine action answers with what the screen needs to offer
// Undo: where the visit was before.

export interface Where {
  day: string | null
  truckId: string | null
  startTime: string | null
}

/** Move to a day and a time (null is any time that day), on the visit's own truck when it works that weekday, else the first truck that does. */
export const moveVisitTo = async (visitId: string, day: string, time: string | null): Promise<ActionOutcome<Where>> =>
  act(async (ctx) => {
    const v = await callApi(ctx, visitsGet, { id: visitId })
    const trucks = (await callApi(ctx, trucksList, {})).data.filter((t) => t.active && t.workingDays.includes(weekdayOf(day)))
    const truck = trucks.find((t) => t.id === v.truckId) ?? trucks[0]
    if (!truck) throw new ApiError("unprocessable", "No truck works that day. Pick another day.")
    await callApi(ctx, visitsMove, { id: visitId, truckId: truck.id, scheduledOn: day, ...(time ? { startTime: time } : {}) })
    return { day: v.scheduledOn, truckId: v.truckId, startTime: v.startTime }
  })

/** The undo of a move: back to the day, truck and time it had, or to Needs a day when it had none. */
export const putBack = async (visitId: string, was: Where): Promise<ActionOutcome> =>
  act((ctx) =>
    nothing(
      was.day && was.truckId
        ? callApi(ctx, visitsMove, { id: visitId, truckId: was.truckId, scheduledOn: was.day, ...(was.startTime ? { startTime: was.startTime } : {}) })
        : callApi(ctx, visitsUpdate, { id: visitId, unscheduled: true }),
    ),
  )

export type PaidBy = { method: "check" | "venmo" | "cash"; reference?: string; amount?: number }

export const markDone = async (visitId: string, opts: { completedOn?: string; paidBy?: PaidBy } = {}): Promise<ActionOutcome> =>
  act((ctx) => nothing(callApi(ctx, visitsMarkClosed, { id: visitId, ...opts })))

export const undoDone = async (visitId: string): Promise<ActionOutcome> => act((ctx) => nothing(callApi(ctx, visitsMarkClosed, { id: visitId, undo: true })))

export const recordPayment = async (visitId: string, paidBy: PaidBy): Promise<ActionOutcome> => act((ctx) => nothing(callApi(ctx, visitsRecordPayment, { id: visitId, ...paidBy })))

export const markNotDone = async (visitId: string, reason: NotDoneReason, note?: string): Promise<ActionOutcome<Where>> =>
  act(async (ctx) => {
    const v = await callApi(ctx, visitsGet, { id: visitId })
    await callApi(ctx, visitsMarkNotDone, { id: visitId, reason, ...(note ? { note } : {}) })
    return { day: v.scheduledOn, truckId: v.truckId, startTime: v.startTime }
  })

export const editVisit = async (visitId: string, changes: { durationMinutes?: number; truckId?: string; notes?: string; accessNote?: string }): Promise<ActionOutcome> =>
  act((ctx) => nothing(callApi(ctx, visitsUpdate, { id: visitId, ...changes })))

export const cancelVisit = async (visitId: string, reason?: string): Promise<ActionOutcome> => act((ctx) => nothing(callApi(ctx, visitsCancel, { id: visitId, ...(reason ? { reason } : {}) })))

export const sendText = async (customerId: string, visitId: string | undefined, text: string): Promise<ActionOutcome> =>
  act((ctx) => nothing(callApi(ctx, messagesSend, { customerId, kind: "note", text, ...(visitId ? { visitId } : {}) })))

export interface NewVisitInput {
  customerId?: string
  newCustomer?: { firstName: string; lastName: string; email?: string; phone?: string; property: { address: string; town: string } }
  kind: "turn-on" | "inspection" | "blowout" | "repair" | "install" | "other"
  scheduledOn?: string
  startTime?: string
  durationMinutes?: number
  truckId?: string
  price?: number
  notes?: string
}

export const createVisit = async (input: NewVisitInput): Promise<ActionOutcome<{ id: string }>> =>
  act(async (ctx) => {
    const made = await callApi(ctx, visitsCreate, input as never)
    return { id: made.id }
  })
