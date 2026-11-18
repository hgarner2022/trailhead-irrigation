import "server-only"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import { linesOfVisit } from "@/lib/jobs/lines"
import { fullName } from "@/lib/admin/format"
import { PHONE_DISPLAY } from "@/lib/nav"
import { notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { assertOwnsCustomer, idInput } from "../shared"
import { ReceiptOut } from "./schemas"

export const paymentsReceipt = defineHandler({
  name: "payments.receipt",
  method: "GET",
  path: "/payments/{id}/receipt",
  scope: "read",
  customerSelf: true,
  summary: "A printable receipt built from one payment row: who paid, for what, how and when. It is the receipt for a check, Venmo or cash payment, which has no card receipt; a card payment also carries its Stripe receipt link. A customer asks only about their own payment; a refund has no receipt.",
  input: idInput,
  output: ReceiptOut,
  async run(ctx, input) {
    const [pay] = await ctx.db.select().from(s.charge).where(and(eq(s.charge.id, input.id), eq(s.charge.organizationId, ctx.organizationId)))
    if (!pay || pay.status !== "succeeded" || pay.amount <= 0 || pay.refundsPaymentId || !pay.customerId) throw notFound("Receipt")
    assertOwnsCustomer(ctx, pay.customerId)
    const [org] = await ctx.db.select({ name: s.organization.name }).from(s.organization).where(eq(s.organization.id, ctx.organizationId))
    const [customer] = await ctx.db.select({ firstName: s.customer.firstName, lastName: s.customer.lastName }).from(s.customer).where(eq(s.customer.id, pay.customerId))
    const [job] = pay.jobId ? await ctx.db.select().from(s.job).where(eq(s.job.id, pay.jobId)) : []
    const [property] = job ? await ctx.db.select({ address: s.property.address }).from(s.property).where(eq(s.property.id, job.propertyId)) : []
    const all = job ? await ctx.db.select().from(s.lineItem).where(and(eq(s.lineItem.jobId, job.id), eq(s.lineItem.organizationId, ctx.organizationId))).orderBy(s.lineItem.createdAt, s.lineItem.id) : []
    const live = all.filter((l) => !l.cancelledAt)
    // A payment for one visit is a receipt for that visit's lines; a payment on the job as a whole covers the job's.
    const lines = pay.visitId ? linesOfVisit(live, pay.visitId) : live
    return {
      id: pay.id,
      business: { name: org?.name ?? "Trailhead Lawn & Irrigation LLC", phone: PHONE_DISPLAY },
      customerName: fullName(customer?.firstName ?? "", customer?.lastName),
      address: property?.address ?? null,
      jobName: job ? (job.season !== null ? `Season Pass ${job.season}` : (live[0]?.name ?? null)) : null,
      lines: lines.map((l) => ({ name: l.name, quantity: l.quantity, unitPrice: l.unitPrice })),
      amount: pay.amount,
      method: pay.method,
      reference: pay.reference,
      paidOn: pay.paidOn,
      receiptUrl: pay.receiptUrl,
    }
  },
})
