import "server-only"
import { and, asc, eq } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { visitName } from "@/lib/events/names"
import { whoOf } from "@/lib/events/record"
import { recordPaymentRow } from "@/lib/money/record"
import { paidTotal } from "@/lib/money/words"
import { getStripe, toCents } from "@/lib/stripe/client"
import { ApiError, notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { Day, Id } from "../shared"
import { emitEvent } from "../webhooks/deliver"
import { recordOfficePayment } from "./record"
import { paymentOut } from "./queries"
import { PaymentOut } from "./schemas"

export const paymentsList = defineHandler({
  name: "payments.list",
  method: "GET",
  path: "/payments",
  scope: "read",
  summary: "List payment rows, oldest first, for a job or for a customer. A refund is a row with a negative amount and the id of the payment it reverses.",
  input: z.object({ jobId: Id.optional(), customerId: Id.optional() }),
  output: z.object({ data: z.array(PaymentOut) }),
  async run(ctx, input) {
    if (!input.jobId && !input.customerId) throw new ApiError("invalid", "Give a jobId or a customerId", [{ path: "jobId", message: "A job or a customer is needed" }])
    const rows = await ctx.db
      .select()
      .from(s.charge)
      .where(and(eq(s.charge.organizationId, ctx.organizationId), input.jobId ? eq(s.charge.jobId, input.jobId) : undefined, input.customerId ? eq(s.charge.customerId, input.customerId) : undefined))
      .orderBy(asc(s.charge.createdAt), asc(s.charge.id))
    return { data: rows.map((r) => paymentOut(ctx, r)) }
  },
})

export const paymentsRecord = defineHandler({
  name: "payments.record",
  method: "POST",
  path: "/payments",
  scope: "write",
  status: 201,
  summary: "Record money the office was handed (check, Venmo or cash) on a job, with the visit it covers when there is one. A visit with no price yet takes the amount as its price. The receipt, which says how it was paid, is queued.",
  input: z.object({
    jobId: Id,
    visitId: Id.optional(),
    amount: z.number().int().min(1).max(100000).describe("Whole dollars received."),
    method: z.enum(["check", "venmo", "cash"]),
    reference: z.string().trim().max(80).optional().describe("A check number or a Venmo handle."),
    paidOn: Day.optional().describe("The day the money arrived; today when left out."),
  }),
  output: PaymentOut,
  async run(ctx, input) {
    return paymentOut(ctx, await recordOfficePayment(ctx, input))
  },
})

export const paymentsRefund = defineHandler({
  name: "payments.refund",
  method: "POST",
  path: "/payments/refund",
  scope: "admin",
  summary: "Refund a succeeded payment, all of what is left or an amount. A card payment is refunded through Stripe; a check, Venmo or cash payment is a record only. Both write a negative payment row that names the payment it reverses.",
  input: z.object({ paymentId: Id, amount: z.number().int().min(1).max(100000).optional().describe("Whole dollars; the whole of what is left when left out."), reason: z.string().trim().max(200).optional() }),
  output: PaymentOut,
  async run(ctx, input) {
    const [payment] = await ctx.db.select().from(s.charge).where(and(eq(s.charge.id, input.paymentId), eq(s.charge.organizationId, ctx.organizationId)))
    if (!payment) throw notFound("Payment")
    if (payment.status !== "succeeded" || payment.amount <= 0 || payment.refundsPaymentId) throw new ApiError("unprocessable", "Only a payment that went through can be refunded")
    if (!payment.jobId || !payment.customerId) throw new ApiError("unprocessable", "This payment has no job to refund it on")
    const earlier = await ctx.db.select().from(s.charge).where(and(eq(s.charge.refundsPaymentId, payment.id), eq(s.charge.organizationId, ctx.organizationId)))
    const left = payment.amount + paidTotal(earlier)
    const amount = input.amount ?? left
    if (left <= 0) throw new ApiError("conflict", "This payment was already refunded")
    if (amount > left) throw new ApiError("unprocessable", `Only $${left} is left to refund`, [{ path: "amount", message: `At most $${left}` }])
    let reference = input.reason ?? null
    if (payment.method === "card_on_file" || payment.method === "card_now") {
      if (!payment.stripePaymentIntentId) throw new ApiError("unprocessable", "This card payment has no Stripe payment to refund")
      const refund = await getStripe().refunds.create({ payment_intent: payment.stripePaymentIntentId, amount: toCents(amount), metadata: { paymentId: payment.id } }, { idempotencyKey: `refund-${payment.id}-${earlier.length}-${amount}` })
      reference = refund.id
    }
    const row = await recordPaymentRow(ctx.db, {
      organizationId: ctx.organizationId, jobId: payment.jobId, visitId: payment.visitId, customerId: payment.customerId,
      amount: -amount, method: payment.method, reference, status: "succeeded", refundsPaymentId: payment.id, now: ctx.now,
    })
    if (!row) throw new ApiError("conflict", "That refund was already recorded")
    const [owner] = payment.visitId ? await ctx.db.select({ kind: s.visit.kind }).from(s.visit).where(and(eq(s.visit.id, payment.visitId), eq(s.visit.organizationId, ctx.organizationId))) : []
    await emitEvent(ctx.db, ctx.organizationId, "payment.refunded", { paymentId: payment.id, refundId: row.id, jobId: payment.jobId, amount, method: payment.method, ...(input.reason ? { reason: input.reason } : {}) }, {
      about: "payment", aboutId: row.id, customerId: payment.customerId, jobId: payment.jobId, visitId: payment.visitId, who: whoOf(ctx), at: ctx.now,
      detail: { amount, method: payment.method, refunds: payment.id, ...(input.reason ? { reason: input.reason } : {}), ...(owner ? { name: visitName(owner.kind) } : {}) },
    })
    return paymentOut(ctx, row)
  },
})
