import "server-only"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { visitName } from "@/lib/events/names"
import { whoOf } from "@/lib/events/record"
import { openInvoiceOf } from "../invoices/queries"
import { cancelOpenBill } from "../invoices/cancel"
import { ApiError } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { Day, Id, today } from "../shared"
import { recordChange } from "../passes/queries"
import { emitEvent } from "../webhooks/deliver"
import { loadVisit, visitOut } from "./queries"
import { VisitOut } from "./schemas"

export const visitsMarkClosed = defineHandler({
  name: "visits.markClosed",
  method: "POST",
  path: "/visits/{id}/close",
  scope: "admin",
  summary: "Mark a visit done, and nothing else: no charge, no payment row, no invoice, no message. How it is paid is a separate step, started by its own button: `payments.chargeCard` (the card on file), `payments.record` (check, Venmo or cash), `invoices.send` (a pay link), or nothing yet (it reads Unpaid). `undo: true` reverses a done visit that has no payment row on its job, and cancels the job's open unpaid invoice with it (its card form on Stripe is closed); once a payment row exists it is refused and the office refunds from the job.",
  input: z.object({ id: Id, completedOn: Day.optional().describe("Defaults to today."), undo: z.boolean().optional() }),
  output: VisitOut,
  async run(ctx, input) {
    const { visit } = await loadVisit(ctx, input.id)
    if (input.undo) {
      if (visit.status !== "completed") throw new ApiError("unprocessable", "This visit is not marked done")
      // Nothing is ever deleted: once the job has a payment row, the office refunds it from the job and the visit stays Done.
      const [paid] = await ctx.db.select({ id: s.charge.id }).from(s.charge).where(and(eq(s.charge.organizationId, ctx.organizationId), eq(s.charge.jobId, visit.jobId))).limit(1)
      if (paid) throw new ApiError("unprocessable", "A payment was recorded. Refund it from the job first.")
      // A invoice sent after Done is for a visit that is done: undoing the Done takes the unpaid invoice back (it stays on record, cancelled, and its card form is closed).
      const open = await openInvoiceOf(ctx.db, ctx.organizationId, visit.jobId)
      if (open) await cancelOpenBill(ctx, open)
      // A charge queued by the old Done (before this change) never runs for a visit that is no longer done.
      await ctx.db.update(s.queueItem).set({ status: "done", lastError: "marked done was undone", doneAt: ctx.now }).where(and(eq(s.queueItem.kind, "pass-charge"), eq(s.queueItem.key, visit.id), eq(s.queueItem.status, "pending")))
      await ctx.db.update(s.visit).set({ status: "scheduled", completedOn: null }).where(eq(s.visit.id, visit.id))
      await recordChange(ctx, { customerId: visit.customerId, jobId: visit.jobId, visitId: visit.id, kind: "done-undone", detail: { name: visitName(visit.kind) } })
      return visitOut(ctx, await loadVisit(ctx, visit.id))
    }
    if (visit.status === "completed") return visitOut(ctx, await loadVisit(ctx, visit.id))
    if (!(["scheduled", "not-closed"] as string[]).includes(visit.status)) throw new ApiError("unprocessable", `A ${visit.status} visit cannot be closed`)
    const day = input.completedOn ?? today(ctx)
    await ctx.db.update(s.visit).set({ status: "completed", completedOn: day }).where(eq(s.visit.id, visit.id))
    await emitEvent(ctx.db, ctx.organizationId, "visit.done", { visitId: visit.id, completedOn: day }, {
      about: "visit", aboutId: visit.id, customerId: visit.customerId, jobId: visit.jobId, visitId: visit.id, who: whoOf(ctx), at: ctx.now,
      detail: { name: visitName(visit.kind), completedOn: day },
    })
    return visitOut(ctx, await loadVisit(ctx, visit.id))
  },
})
