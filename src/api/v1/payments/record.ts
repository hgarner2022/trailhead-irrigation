import "server-only"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import { readAppUrl } from "@/lib/env"
import { setVisitLinePrice } from "@/lib/jobs/write-lines"
import { baseData } from "@/lib/messaging/data"
import { queueMessage } from "@/lib/messaging/queue"
import { recordPaymentRow } from "@/lib/money/record"
import { kindName } from "@/lib/pass/server/messages"
import type { Ctx } from "../../core/context"
import { ApiError, notFound } from "../../core/errors"
import { emitEvent } from "../webhooks/deliver"

export const RECEIVED_BY = { check: "check", venmo: "Venmo", cash: "cash" } as const
export type ReceivedBy = keyof typeof RECEIVED_BY

export interface OfficePayment {
  jobId: string
  visitId?: string | null
  /** whole dollars received */
  amount: number
  method: ReceivedBy
  reference?: string | null
  paidOn?: string
}

/**
 * Money the office was handed (check, Venmo or cash) as a succeeded payment row on the job: the one path under
 * `payments.record` and the Done and `visits.recordPayment` aliases. A visit with no price yet takes the amount as its
 * price (visit, job and line); `visit.charged_at` is written as the alias; the receipt is queued; the events are emitted.
 */
export async function recordOfficePayment(ctx: Ctx, input: OfficePayment) {
  const [job] = await ctx.db.select().from(s.job).where(and(eq(s.job.id, input.jobId), eq(s.job.organizationId, ctx.organizationId)))
  if (!job) throw notFound("Job")
  let visit: typeof s.visit.$inferSelect | undefined
  if (input.visitId) {
    ;[visit] = await ctx.db.select().from(s.visit).where(and(eq(s.visit.id, input.visitId), eq(s.visit.organizationId, ctx.organizationId)))
    if (!visit) throw notFound("Visit")
    if (visit.jobId !== job.id) throw new ApiError("invalid", "That visit is not on this job", [{ path: "visitId", message: "Choose a visit of the job" }])
  }
  if (visit && visit.amount === 0) {
    await ctx.db.update(s.visit).set({ amount: input.amount }).where(eq(s.visit.id, visit.id))
    await ctx.db.update(s.job).set({ price: input.amount }).where(eq(s.job.id, job.id))
    await setVisitLinePrice(ctx.db, visit, input.amount, ctx.now)
  }
  const row = await recordPaymentRow(ctx.db, {
    organizationId: ctx.organizationId, jobId: job.id, visitId: visit?.id ?? null, customerId: job.customerId, passId: visit?.passId ?? null,
    amount: input.amount, method: input.method, reference: input.reference, paidOn: input.paidOn, status: "succeeded", now: ctx.now,
  })
  if (!row) throw new ApiError("conflict", "That payment was already recorded")
  if (visit) await ctx.db.update(s.visit).set({ chargedAt: ctx.now }).where(eq(s.visit.id, visit.id))
  const [customer] = await ctx.db.select().from(s.customer).where(eq(s.customer.id, job.customerId))
  if (customer) {
    const passNumber = job.passNumber
    await queueMessage(ctx.db, {
      organizationId: ctx.organizationId, customerId: customer.id, visitId: visit?.id ?? null, kind: "receipt", key: `payment-${row.id}`,
      data: { ...baseData(readAppUrl(), customer), passNumber: passNumber ?? null, amount: input.amount, visitName: visit ? kindName(visit.kind) : job.kind === "pass" ? "Season Pass" : kindName(job.kind), card: null, paidBy: RECEIVED_BY[input.method], nextLine: "", receiptUrl: null },
    })
  }
  await emitEvent(ctx.db, ctx.organizationId, "payment.succeeded", { paymentId: row.id, jobId: job.id, ...(visit ? { visitId: visit.id } : {}), amount: input.amount, method: input.method })
  // The old event name, for subscribers written before payments were rows.
  if (visit) await emitEvent(ctx.db, ctx.organizationId, "charge.succeeded", { visitId: visit.id, ...(visit.passId ? { passId: visit.passId } : {}), amount: input.amount, method: input.method })
  return row
}
