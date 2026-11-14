import "server-only"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { readAppUrl } from "@/lib/env"
import { baseData } from "@/lib/messaging/data"
import { queueMessage } from "@/lib/messaging/queue"
import { kindName } from "@/lib/pass/server/messages"
import { enqueue } from "@/lib/queue"
import type { Ctx } from "../../core/context"
import { ApiError } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { Day, Id, today } from "../shared"
import { recordChange } from "../passes/queries"
import { emitEvent } from "../webhooks/deliver"
import { loadVisit, visitOut } from "./queries"
import { VisitOut } from "./schemas"

/** How a one-off visit was paid when the money did not come by a card on file. Card now and Send a bill wait for the payment page. */
const PaidBy = z.object({
  method: z.enum(["check", "venmo", "cash"]),
  reference: z.string().trim().max(80).optional(),
  amount: z.number().int().min(1).max(100000).optional().describe("Whole dollars received; only for a visit with no price yet, which then takes this price."),
})
const PAID_WORDS = { check: "check", venmo: "Venmo", cash: "cash" } as const

/** A payment the office was handed (check, Venmo or cash): a succeeded charge on the visit, the visit and its job priced if they were not, and the receipt, which says how it was paid. */
async function recordPayment(ctx: Ctx, visit: typeof s.visit.$inferSelect, paidBy: z.infer<typeof PaidBy>) {
  const amount = visit.amount > 0 ? visit.amount : (paidBy.amount ?? 0)
  if (amount <= 0) throw new ApiError("invalid", "Say how much was paid", [{ path: "paidBy.amount", message: "This visit has no price yet" }])
  if (visit.amount === 0) {
    await ctx.db.update(s.visit).set({ amount }).where(eq(s.visit.id, visit.id))
    await ctx.db.update(s.job).set({ price: amount }).where(eq(s.job.id, visit.jobId))
  }
  const [last] = await ctx.db.select({ attempt: s.charge.attempt }).from(s.charge).where(eq(s.charge.visitId, visit.id)).orderBy(desc(s.charge.attempt)).limit(1)
  await ctx.db.insert(s.charge).values({ organizationId: ctx.organizationId, visitId: visit.id, attempt: (last?.attempt ?? 0) + 1, amount, status: "succeeded", method: paidBy.method, reference: paidBy.reference || null })
  await ctx.db.update(s.visit).set({ chargedAt: ctx.now }).where(eq(s.visit.id, visit.id))
  const [customer] = await ctx.db.select().from(s.customer).where(eq(s.customer.id, visit.customerId))
  if (customer)
    await queueMessage(ctx.db, {
      organizationId: ctx.organizationId, customerId: customer.id, visitId: visit.id, kind: "receipt", key: `visit-${visit.id}-${paidBy.method}`,
      data: { ...baseData(readAppUrl(), customer), passNumber: null, amount, visitName: kindName(visit.kind), card: null, paidBy: PAID_WORDS[paidBy.method], nextLine: "", receiptUrl: null },
    })
  await emitEvent(ctx.db, ctx.organizationId, "charge.succeeded", { visitId: visit.id, amount, method: paidBy.method })
}

export const visitsMarkClosed = defineHandler({
  name: "visits.markClosed",
  method: "POST",
  path: "/visits/{id}/close",
  scope: "admin",
  summary: "Mark a visit done. A pass visit is charged to the card on file with no question and the receipt follows. A one-off visit with a price says how it was paid (check, Venmo or cash, with an optional reference): that is recorded as a succeeded charge and the receipt, which says how it was paid, is sent. `undo: true` reverses a done visit that is not yet charged to a card, or a payment the office recorded.",
  input: z.object({ id: Id, completedOn: Day.optional().describe("Defaults to today."), paidBy: PaidBy.optional(), undo: z.boolean().optional() }),
  output: VisitOut,
  async run(ctx, input) {
    const { visit } = await loadVisit(ctx, input.id)
    if (input.undo) {
      if (visit.status !== "completed") throw new ApiError("unprocessable", "This visit is not marked done")
      const charges = await ctx.db.select().from(s.charge).where(eq(s.charge.visitId, visit.id))
      const recorded = ["check", "venmo", "cash"]
      if (charges.some((c) => !recorded.includes(c.method))) throw new ApiError("unprocessable", "The card was already charged, so this cannot be undone here")
      await ctx.db.delete(s.charge).where(eq(s.charge.visitId, visit.id))
      await ctx.db.update(s.queueItem).set({ status: "done", lastError: "marked done was undone", doneAt: ctx.now }).where(and(eq(s.queueItem.kind, "pass-charge"), eq(s.queueItem.key, visit.id), eq(s.queueItem.status, "pending")))
      await ctx.db.update(s.visit).set({ status: "scheduled", completedOn: null, chargedAt: null }).where(eq(s.visit.id, visit.id))
      await recordChange(ctx, { customerId: visit.customerId, passId: visit.passId, visitId: visit.id, kind: "done-undone", detail: {} })
      return visitOut(ctx, await loadVisit(ctx, visit.id))
    }
    if (visit.status === "completed") return visitOut(ctx, await loadVisit(ctx, visit.id))
    if (!(["scheduled", "not-closed"] as string[]).includes(visit.status)) throw new ApiError("unprocessable", `A ${visit.status} visit cannot be closed`)
    if (!visit.passId && visit.amount > 0 && !input.paidBy) throw new ApiError("invalid", "Say how it was paid: check, Venmo or cash", [{ path: "paidBy", message: "Choose how the money came" }])
    const day = input.completedOn ?? today(ctx)
    await ctx.db.update(s.visit).set({ status: "completed", completedOn: day }).where(eq(s.visit.id, visit.id))
    await emitEvent(ctx.db, ctx.organizationId, "visit.done", { visitId: visit.id, completedOn: day })
    // Ryan marking it done is the one human path to a charge without a completion signal; the queue and the charge are idempotent.
    if (visit.passId) await enqueue(ctx.db, ctx.organizationId, "pass-charge", visit.id, { visitId: visit.id })
    else if (input.paidBy && (visit.amount > 0 || input.paidBy.amount)) await recordPayment(ctx, visit, input.paidBy)
    return visitOut(ctx, await loadVisit(ctx, visit.id))
  },
})

export const visitsRecordPayment = defineHandler({
  name: "visits.recordPayment",
  method: "POST",
  path: "/visits/{id}/payment",
  scope: "write",
  summary: "Record how a done one-off visit was paid: check, Venmo or cash, with an optional reference. A succeeded charge is written and the receipt, which says how it was paid, is sent. A pass visit is charged to its card on file and takes no payment here.",
  input: z.object({ id: Id, ...PaidBy.shape }),
  output: VisitOut,
  async run(ctx, input) {
    const { visit } = await loadVisit(ctx, input.id)
    if (visit.passId) throw new ApiError("unprocessable", "A pass visit is charged to the pass's card")
    if (visit.status !== "completed") throw new ApiError("unprocessable", "Mark the visit done first")
    if (visit.chargedAt) throw new ApiError("conflict", "This visit is already paid")
    const { id: _id, ...paidBy } = input
    void _id
    await recordPayment(ctx, visit, paidBy)
    return visitOut(ctx, await loadVisit(ctx, visit.id))
  },
})

