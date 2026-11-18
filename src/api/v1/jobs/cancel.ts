import "server-only"
import { and, eq, inArray, isNull, notInArray } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { visitName } from "@/lib/events/names"
import { recordEvent, whoOf } from "@/lib/events/record"
import { orderDay } from "@/lib/scheduling/server/order-day"
import type { Ctx } from "../../core/context"
import { ApiError, notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { cancelOpenBill } from "../invoices/cancel"
import { openInvoiceOf } from "../invoices/queries"
import { recordChange } from "../passes/queries"
import { Id, iso } from "../shared"

const JobCancelled = z.object({
  id: Id,
  cancelledAt: z.string(),
  visitsCancelled: z.number().int().describe("The visits that were not done and are canceled with the job."),
  linesCancelled: z.number().int().describe("The lines that were live and are canceled with the job."),
})

/** What a payment on the job is worth now: its succeeded rows added up, refunds (negative rows) taking away. A job with money held in it cannot be canceled. */
export async function heldMoney(db: Parameters<typeof orderDay>[0], organizationId: string, jobId: string): Promise<number> {
  const rows = await db.select({ amount: s.charge.amount }).from(s.charge).where(and(eq(s.charge.organizationId, organizationId), eq(s.charge.jobId, jobId), eq(s.charge.status, "succeeded")))
  return rows.reduce((sum, r) => sum + r.amount, 0)
}

/**
 * What cancelling a job does, once the guards have passed: the job, every live line and every visit not done are canceled (days freed,
 * no text sent), an open unpaid invoice is voided, and the story reads "Job canceled". Shared by `jobs.cancel` and the customer's own
 * `visits.cancelSelf` (which cancels a one-off's last live visit). Returns how many visits and lines it canceled.
 */
export async function cancelJobRows(ctx: Ctx, job: typeof s.job.$inferSelect, reason?: string): Promise<{ visits: number; lines: number }> {
  const org = ctx.organizationId
  const visits = await ctx.db.select().from(s.visit).where(and(eq(s.visit.jobId, job.id), eq(s.visit.organizationId, org), notInArray(s.visit.status, ["completed", "cancelled", "skipped"])))
  const live = await ctx.db.select({ id: s.lineItem.id }).from(s.lineItem).where(and(eq(s.lineItem.jobId, job.id), eq(s.lineItem.organizationId, org), isNull(s.lineItem.cancelledAt)))

  await ctx.db.update(s.job).set({ cancelledAt: ctx.now }).where(eq(s.job.id, job.id))
  if (live.length) await ctx.db.update(s.lineItem).set({ cancelledAt: ctx.now }).where(inArray(s.lineItem.id, live.map((l) => l.id)))
  const ids = visits.map((v) => v.id)
  if (ids.length) {
    await ctx.db.update(s.visit).set({ status: "cancelled", personId: null, scheduledOn: null, startTime: null, stopOrder: null, awaitingPick: false }).where(inArray(s.visit.id, ids))
    // The "Needs a day" alert of a visit that is gone resolves with it.
    await ctx.db.update(s.adminAlert).set({ resolvedAt: ctx.now }).where(and(eq(s.adminAlert.organizationId, org), eq(s.adminAlert.kind, "unplaced"), inArray(s.adminAlert.key, ids)))
  }
  // A person's day with a canceled visit on it is ordered again, once for each day.
  const days = new Map(visits.filter((v) => v.personId && v.scheduledOn).map((v) => [`${v.personId}|${v.scheduledOn}`, { personId: v.personId!, day: v.scheduledOn! }]))
  for (const d of days.values()) await orderDay(ctx.db, d)
  // An invoice sent and not paid is voided with the job, so no one can pay for work that is not happening.
  const open = await openInvoiceOf(ctx.db, org, job.id)
  if (open) await cancelOpenBill(ctx, open)
  for (const v of visits) await recordChange(ctx, { customerId: v.customerId, jobId: job.id, visitId: v.id, kind: "visit-cancelled", detail: { name: visitName(v.kind), reason: reason ?? null, day: v.scheduledOn } })
  await recordEvent(ctx.db, { organizationId: org, about: "job", aboutId: job.id, customerId: job.customerId, jobId: job.id, kind: "job.cancelled", detail: { reason: reason ?? null, visits: visits.length, lines: live.length }, who: whoOf(ctx), at: ctx.now })
  return { visits: visits.length, lines: live.length }
}

export const jobsCancel = defineHandler({
  name: "jobs.cancel",
  method: "POST",
  path: "/jobs/{id}/cancel",
  scope: "write",
  summary:
    "Cancel a one-off job: the job is canceled, every line is canceled, every visit that is not done is canceled (its day is freed and no text is sent), an open unpaid invoice is voided, and the story reads \"Job canceled\". Nothing is deleted. Visits already done stay done and their lines are canceled with the job's (the panel offers Cancel job only while the job is still being worked). Refused on a Season Pass (it has Cancel pass), on a job already canceled, and on a job that holds a payment: refund it first.",
  input: z.object({ id: Id, reason: z.string().trim().max(300).optional() }),
  output: JobCancelled,
  async run(ctx, input) {
    const org = ctx.organizationId
    const [job] = await ctx.db.select().from(s.job).where(and(eq(s.job.id, input.id), eq(s.job.organizationId, org)))
    if (!job) throw notFound("Job")
    if (job.cancelledAt) throw new ApiError("unprocessable", "This job is already canceled")
    if (job.season !== null || job.passNumber) throw new ApiError("unprocessable", "A Season Pass is canceled with Cancel pass")
    if ((await heldMoney(ctx.db, org, job.id)) > 0) throw new ApiError("conflict", "This job has a payment. Refund it first.")

    const { visits, lines } = await cancelJobRows(ctx, job, input.reason)
    return { id: job.id, cancelledAt: iso(ctx.now)!, visitsCancelled: visits, linesCancelled: lines }
  },
})
