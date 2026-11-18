import "server-only"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { customerHasCard } from "@/lib/customer/card"
import { visitName } from "@/lib/events/names"
import { whoOf } from "@/lib/events/record"
import { visitBalance } from "@/lib/money/record"
import { enqueue } from "@/lib/queue"
import { openInvoiceOf } from "../invoices/queries"
import { cancelOpenBill } from "../invoices/cancel"
import { checkBill, sendBill } from "../invoices/send"
import type { Ctx } from "../../core/context"
import { ApiError } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { Day, Id, today } from "../shared"
import { recordChange } from "../passes/queries"
import { recordOfficePayment } from "../payments/record"
import { emitEvent } from "../webhooks/deliver"
import { loadVisit, visitOut } from "./queries"
import { VisitOut } from "./schemas"

/** How the money for a visit was dealt with when it did not come by a card on file: a check, Venmo or cash in hand, or `bill` (Send a bill: Done sends the customer a bill with a pay link instead of recording a payment). */
const PaidBy = z.object({
  method: z.enum(["check", "venmo", "cash", "bill"]),
  reference: z.string().trim().max(80).optional(),
  amount: z.number().int().min(1).max(100000).optional().describe("Whole dollars received; only for a visit with no price yet, which then takes this price."),
})
/** What `visits.recordPayment` takes: money in hand only, never a bill. */
const RecordedBy = PaidBy.extend({ method: z.enum(["check", "venmo", "cash"]) })

/** The pass a visit is on, or null for a one-off. */
async function passOf(ctx: Ctx, visit: typeof s.visit.$inferSelect) {
  if (!visit.passId) return null
  const [pass] = await ctx.db.select().from(s.seasonPass).where(eq(s.seasonPass.id, visit.passId))
  return pass ?? null
}

/** Whether the pass's customer has a card on file: the card lives on the customer. */
async function passCustomerHasCard(ctx: Ctx, pass: typeof s.seasonPass.$inferSelect | null): Promise<boolean> {
  if (!pass) return false
  const [customer] = await ctx.db.select().from(s.customer).where(eq(s.customer.id, pass.customerId))
  return customer ? customerHasCard(customer) : false
}

/** A payment the office was handed (check, Venmo or cash), for a one-off visit or a pass visit whose pass has no card: a succeeded payment row on the visit's job (the one writer under `payments.record`), the visit and its job priced if they were not, and the receipt, which says how it was paid. */
async function recordPayment(ctx: Ctx, visit: typeof s.visit.$inferSelect, paidBy: z.infer<typeof RecordedBy>) {
  // A priced visit takes what is still owed on it (the writer refuses more, and refuses a visit already paid); an unpriced one takes the amount said.
  const { price, owed } = await visitBalance(ctx.db, ctx.organizationId, visit)
  if (price > 0 && owed === 0) throw new ApiError("conflict", "This visit is already paid")
  const amount = price > 0 ? owed : (paidBy.amount ?? 0)
  if (amount <= 0) throw new ApiError("invalid", "Say how much was paid", [{ path: "paidBy.amount", message: "This visit has no price yet" }])
  await recordOfficePayment(ctx, { jobId: visit.jobId, visitId: visit.id, amount, method: paidBy.method, reference: paidBy.reference })
}

export const visitsMarkClosed = defineHandler({
  name: "visits.markClosed",
  method: "POST",
  path: "/visits/{id}/close",
  scope: "admin",
  summary: "Mark a visit done. A pass visit whose pass has a card is charged to it with no question and the receipt follows. A one-off visit with a price, and a pass visit whose pass has no card (sold by the office, paid at the visit), says how it was paid (check, Venmo or cash, with an optional reference): that is recorded as a succeeded charge and the receipt, which says how it was paid, is sent. `paidBy.method` `bill` marks the visit done and sends the customer a bill for the job's done lines (frozen as they are, with a pay link; if other visits of the job are still ahead the bill covers only the done visits' lines) instead of recording a payment. `undo: true` reverses a done visit that has no payment on its job and cancels the job's open unpaid bill with it (its card form on Stripe is closed); once a payment row exists it is refused and the office refunds from the job.",
  input: z.object({ id: Id, completedOn: Day.optional().describe("Defaults to today."), paidBy: PaidBy.optional(), undo: z.boolean().optional() }),
  output: VisitOut,
  async run(ctx, input) {
    const { visit } = await loadVisit(ctx, input.id)
    if (input.undo) {
      if (visit.status !== "completed") throw new ApiError("unprocessable", "This visit is not marked done")
      // Nothing is ever deleted: once the job has a payment row, the office refunds it from the job and the visit stays Done.
      const [paid] = await ctx.db.select({ id: s.charge.id }).from(s.charge).where(and(eq(s.charge.organizationId, ctx.organizationId), eq(s.charge.jobId, visit.jobId))).limit(1)
      if (paid) throw new ApiError("unprocessable", "A payment was recorded. Refund it from the job first.")
      // A bill sent by Done is for a visit that is done: undoing the Done takes the unpaid bill back (it stays on record, cancelled, and its card form is closed).
      const open = await openInvoiceOf(ctx.db, ctx.organizationId, visit.jobId)
      if (open) await cancelOpenBill(ctx, open)
      await ctx.db.update(s.queueItem).set({ status: "done", lastError: "marked done was undone", doneAt: ctx.now }).where(and(eq(s.queueItem.kind, "pass-charge"), eq(s.queueItem.key, visit.id), eq(s.queueItem.status, "pending")))
      await ctx.db.update(s.visit).set({ status: "scheduled", completedOn: null, chargedAt: null }).where(eq(s.visit.id, visit.id))
      await recordChange(ctx, { customerId: visit.customerId, passId: visit.passId, visitId: visit.id, kind: "done-undone", detail: { name: visitName(visit.kind) } })
      return visitOut(ctx, await loadVisit(ctx, visit.id))
    }
    if (visit.status === "completed") return visitOut(ctx, await loadVisit(ctx, visit.id))
    if (!(["scheduled", "not-closed"] as string[]).includes(visit.status)) throw new ApiError("unprocessable", `A ${visit.status} visit cannot be closed`)
    const pass = await passOf(ctx, visit)
    // A pass visit is charged to the pass's card; with no card on the pass (an office sale paid at the visit) the money is asked for like a one-off's.
    const cardOnFile = await passCustomerHasCard(ctx, pass)
    if (!cardOnFile && visit.amount > 0 && !input.paidBy) throw new ApiError("invalid", "Say how it was paid: check, Venmo or cash", [{ path: "paidBy", message: "Choose how the money came" }])
    const billing = !cardOnFile && input.paidBy?.method === "bill"
    if (billing) {
      // Every refusal `sendBill` can make (no price, a bill already open, already paid, nothing to bill, no way to reach the customer, no site address) is checked here, with this visit counted as done, before the visit's status is written: a refused bill changes nothing.
      if ((await visitBalance(ctx.db, ctx.organizationId, visit)).price <= 0) throw new ApiError("invalid", "Price the visit before sending a bill", [{ path: "paidBy", message: "This visit has no price yet" }])
      await checkBill(ctx, { jobId: visit.jobId, requireAllDone: false, assumeDone: visit.id })
    }
    const day = input.completedOn ?? today(ctx)
    await ctx.db.update(s.visit).set({ status: "completed", completedOn: day }).where(eq(s.visit.id, visit.id))
    await emitEvent(ctx.db, ctx.organizationId, "visit.done", { visitId: visit.id, completedOn: day }, {
      about: "visit", aboutId: visit.id, customerId: visit.customerId, jobId: visit.jobId, visitId: visit.id, who: whoOf(ctx), at: ctx.now,
      detail: { name: visitName(visit.kind), completedOn: day, ...(!cardOnFile && input.paidBy ? { paidBy: input.paidBy.method } : {}) },
    })
    // Ryan marking it done is the one human path to a charge without a completion signal; the queue and the charge are idempotent.
    if (cardOnFile) await enqueue(ctx.db, ctx.organizationId, "pass-charge", visit.id, { visitId: visit.id })
    else if (billing) await sendBill(ctx, { jobId: visit.jobId, requireAllDone: false })
    else if (input.paidBy && input.paidBy.method !== "bill" && (visit.amount > 0 || input.paidBy.amount)) await recordPayment(ctx, visit, { ...input.paidBy, method: input.paidBy.method })
    return visitOut(ctx, await loadVisit(ctx, visit.id))
  },
})

export const visitsRecordPayment = defineHandler({
  name: "visits.recordPayment",
  method: "POST",
  path: "/visits/{id}/payment",
  scope: "write",
  summary: "Record how a done visit was paid: check, Venmo or cash, with an optional reference. A succeeded charge is written and the receipt, which says how it was paid, is sent. A pass visit whose pass has a card is charged to it and takes no payment here; one whose pass has no card is paid here like a one-off.",
  input: z.object({ id: Id, ...RecordedBy.shape }),
  output: VisitOut,
  async run(ctx, input) {
    const { visit } = await loadVisit(ctx, input.id)
    const pass = await passOf(ctx, visit)
    if (pass && (await passCustomerHasCard(ctx, pass))) throw new ApiError("unprocessable", "A pass visit is charged to the pass's card")
    if (visit.status !== "completed") throw new ApiError("unprocessable", "Mark the visit done first")
    const { id: _id, ...paidBy } = input
    void _id
    await recordPayment(ctx, visit, paidBy)
    return visitOut(ctx, await loadVisit(ctx, visit.id))
  },
})

