import "server-only"
import { and, eq, isNull } from "drizzle-orm"
import * as s from "@/db/schema"
import { readAppUrl } from "@/lib/env"
import { visitName } from "@/lib/events/names"
import { recordEventSafe, whoOf } from "@/lib/events/record"
import { setVisitLinePrice } from "@/lib/jobs/write-lines"
import { baseData } from "@/lib/messaging/data"
import { queueMessage } from "@/lib/messaging/queue"
import { paidDay, recordPaymentRow, visitBalance } from "@/lib/money/record"
import { jobOwed } from "@/lib/money/words"
import { kindName } from "@/lib/pass/server/messages"
import type { Ctx } from "../../core/context"
import { ApiError, notFound } from "../../core/errors"
import { expireCheckoutSession } from "../invoices/cancel"
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
 * Money that covers the job settles its open bill: when the rows now owe nothing, the bill's paid day is the day the money arrived (today,
 * Mountain) and its payment is this row, so Home, Remind, the pay page and the money lines stop treating it as owed. Only the job's own
 * open bill, only while it is unpaid and not cancelled; a part payment leaves the bill open (the pay page then refuses it, and the office sends a new one).
 */
async function settleOpenBill(ctx: Ctx, jobId: string, row: { id: string; method: string }, customerId: string) {
  const org = ctx.organizationId
  const [lines, payments] = await Promise.all([
    ctx.db.select().from(s.lineItem).where(and(eq(s.lineItem.jobId, jobId), eq(s.lineItem.organizationId, org))),
    ctx.db.select().from(s.charge).where(and(eq(s.charge.jobId, jobId), eq(s.charge.organizationId, org))),
  ])
  if (jobOwed(lines.filter((l) => !l.cancelledAt), payments) > 0) return
  const settled = await ctx.db.update(s.invoice).set({ paidOn: paidDay(ctx.now), paymentId: row.id, updatedAt: ctx.now }).where(and(eq(s.invoice.jobId, jobId), eq(s.invoice.organizationId, org), isNull(s.invoice.paidOn), isNull(s.invoice.cancelledAt))).returning({ id: s.invoice.id, number: s.invoice.number, total: s.invoice.total, session: s.invoice.stripeCheckoutSessionId })
  // The card form the customer may still have open is closed too, so the bill is not paid twice.
  for (const b of settled) {
    await expireCheckoutSession(b.session)
    await recordEventSafe(ctx.db, { organizationId: org, about: "invoice", aboutId: b.id, customerId, jobId, kind: "invoice.paid", detail: { number: b.number, total: b.total, how: row.method }, who: whoOf(ctx), at: ctx.now })
  }
}

/**
 * Money the office was handed (check, Venmo or cash) as a succeeded payment row on the job: the one path under
 * `payments.record` and the Done and `visits.recordPayment` aliases. A visit with no price yet takes the amount as its
 * price (visit, job and line). For a visit with a price it refuses what the rows would make wrong: a pass visit whose customer has
 * a card (it is charged to the card), a visit already paid in full, and an amount above what is still owed on it (refused, not
 * clamped: the record must say what was really handed over, so a stale panel or a double submit writes nothing); `visit.charged_at` is written as the alias; the receipt is queued; the events are emitted.
 */
/**
 * Money handed over for a pass visit is recorded whether or not the customer has a card (a check, Venmo or cash for a visit the
 * card was not charged for); the one thing refused is a card charge Stripe is still working on, which would be paid twice.
 */
export async function assertNoCardChargeInFlight(ctx: Pick<Ctx, "db">, visitId: string) {
  const [pending] = await ctx.db.select({ id: s.charge.id }).from(s.charge).where(and(eq(s.charge.visitId, visitId), eq(s.charge.status, "pending")))
  if (pending) throw new ApiError("conflict", "A card charge for this visit is still going through")
}

export async function recordOfficePayment(ctx: Ctx, input: OfficePayment) {
  const [job] = await ctx.db.select().from(s.job).where(and(eq(s.job.id, input.jobId), eq(s.job.organizationId, ctx.organizationId)))
  if (!job) throw notFound("Job")
  let visit: typeof s.visit.$inferSelect | undefined
  if (input.visitId) {
    ;[visit] = await ctx.db.select().from(s.visit).where(and(eq(s.visit.id, input.visitId), eq(s.visit.organizationId, ctx.organizationId)))
    if (!visit) throw notFound("Visit")
    if (visit.jobId !== job.id) throw new ApiError("invalid", "That visit is not on this job", [{ path: "visitId", message: "Choose a visit of the job" }])
  }
  if (visit) {
    await assertNoCardChargeInFlight(ctx, visit.id)
    const { price, owed } = await visitBalance(ctx.db, ctx.organizationId, visit)
    if (price > 0 && owed === 0) throw new ApiError("conflict", "This visit is already paid")
    if (price > 0 && input.amount > owed) throw new ApiError("unprocessable", `Only $${owed} is still owed on this visit`, [{ path: "amount", message: `At most $${owed}` }])
  }
  if (visit && visit.amount === 0) {
    await ctx.db.update(s.visit).set({ amount: input.amount }).where(eq(s.visit.id, visit.id))
    await ctx.db.update(s.job).set({ price: input.amount }).where(eq(s.job.id, job.id))
    await setVisitLinePrice(ctx.db, visit, input.amount, ctx.now)
  }
  const row = await recordPaymentRow(ctx.db, {
    organizationId: ctx.organizationId, jobId: job.id, visitId: visit?.id ?? null, customerId: job.customerId,
    amount: input.amount, method: input.method, reference: input.reference, paidOn: input.paidOn, status: "succeeded", now: ctx.now,
  })
  if (!row) throw new ApiError("conflict", "That payment was already recorded")
  if (visit) await ctx.db.update(s.visit).set({ chargedAt: ctx.now }).where(eq(s.visit.id, visit.id))
  await settleOpenBill(ctx, job.id, row, job.customerId)
  const [customer] = await ctx.db.select().from(s.customer).where(and(eq(s.customer.id, job.customerId), eq(s.customer.organizationId, ctx.organizationId)))
  if (customer) {
    const passNumber = job.passNumber
    await queueMessage(ctx.db, {
      organizationId: ctx.organizationId, customerId: customer.id, visitId: visit?.id ?? null, kind: "receipt", key: `payment-${row.id}`,
      data: { ...baseData(readAppUrl(), customer), passNumber: passNumber ?? null, amount: input.amount, visitName: visit ? kindName(visit.kind) : job.kind === "pass" ? "Season Pass" : kindName(job.kind ?? "other"), card: null, paidBy: RECEIVED_BY[input.method], nextLine: "", receiptUrl: null },
    })
  }
  await emitEvent(ctx.db, ctx.organizationId, "payment.succeeded", { paymentId: row.id, jobId: job.id, ...(visit ? { visitId: visit.id } : {}), amount: input.amount, method: input.method }, {
    about: "payment", aboutId: row.id, customerId: job.customerId, jobId: job.id, visitId: visit?.id ?? null, who: whoOf(ctx), at: ctx.now,
    detail: { amount: input.amount, method: input.method, ...(visit ? { name: visitName(visit.kind) } : {}) },
  })
  // The old event name, for subscribers written before payments were rows.
  if (visit) await emitEvent(ctx.db, ctx.organizationId, "charge.succeeded", { visitId: visit.id, ...(job.season !== null ? { passId: job.id } : {}), amount: input.amount, method: input.method })
  return row
}
