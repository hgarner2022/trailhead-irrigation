import "server-only"
import { and, asc, eq, isNull, lt } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { invoiceOpen, invoiceStatus } from "@/lib/money/invoice"
import { ApiError } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { Id, idInput, today } from "../shared"
import { cancelOpenBill } from "./cancel"
import { invoiceOut, loadInvoice } from "./queries"
import { InvoiceOut, PayViewOut } from "./schemas"
import { remindBill, sendBill } from "./send"

export const invoicesSend = defineHandler({
  name: "invoices.send",
  method: "POST",
  path: "/invoices",
  scope: "write",
  status: 201,
  summary:
    "Send a bill for a job that is done and still owes money. The job's lines are frozen as they are now, the tax comes from the billing settings, the bill is due the settings' number of days after today, and one message with the pay link goes to the customer (a text when they have a mobile, an email otherwise). A job with a bill already open refuses a second one.",
  input: z.object({ jobId: Id }),
  output: InvoiceOut,
  async run(ctx, input) {
    return invoiceOut(ctx, await sendBill(ctx, { jobId: input.jobId, requireAllDone: true }))
  },
})

export const invoicesList = defineHandler({
  name: "invoices.list",
  method: "GET",
  path: "/invoices",
  scope: "read",
  summary: "List bills, oldest first, for a job, for a customer, or by status (overdue lists every open bill past its due day).",
  input: z.object({ jobId: Id.optional(), customerId: Id.optional(), status: z.enum(["sent", "paid", "overdue", "cancelled"]).optional() }),
  output: z.object({ data: z.array(InvoiceOut) }),
  async run(ctx, input) {
    if (!input.jobId && !input.customerId && !input.status) throw new ApiError("invalid", "Give a jobId, a customerId or a status", [{ path: "jobId", message: "A job, a customer or a status is needed" }])
    const day = today(ctx)
    const rows = await ctx.db
      .select()
      .from(s.invoice)
      .where(
        and(
          eq(s.invoice.organizationId, ctx.organizationId),
          input.jobId ? eq(s.invoice.jobId, input.jobId) : undefined,
          input.customerId ? eq(s.invoice.customerId, input.customerId) : undefined,
          input.status === "overdue" ? and(isNull(s.invoice.paidOn), isNull(s.invoice.cancelledAt), lt(s.invoice.dueOn, day)) : undefined,
        ),
      )
      .orderBy(asc(s.invoice.sentOn), asc(s.invoice.createdAt), asc(s.invoice.id))
    return { data: rows.filter((r) => !input.status || invoiceStatus(r, day) === input.status).map((r) => invoiceOut(ctx, r)) }
  },
})

export const invoicesGet = defineHandler({
  name: "invoices.get",
  method: "GET",
  path: "/invoices/{id}",
  scope: "read",
  summary: "One bill with its frozen lines, amounts, dates and status.",
  input: idInput,
  output: InvoiceOut,
  async run(ctx, input) {
    return invoiceOut(ctx, await loadInvoice(ctx, input.id))
  },
})

export const invoicesPayView = defineHandler({
  name: "invoices.payView",
  method: "GET",
  path: "/invoices/{id}/pay-view",
  scope: "read",
  checkout: "own-invoice",
  summary: "The bill as its customer sees it on the pay page: the frozen lines, the amounts, the due day, whether it is open, paid or cancelled, the customer's first name and, to the visitor of the link only, the card receipt once paid. The pay page calls it as the visitor of the signed link, who may read only the one bill that link opens.",
  input: idInput,
  output: PayViewOut,
  async run(ctx, input) {
    const row = await loadInvoice(ctx, input.id)
    const [customer] = await ctx.db.select({ firstName: s.customer.firstName }).from(s.customer).where(and(eq(s.customer.id, row.customerId), eq(s.customer.organizationId, ctx.organizationId)))
    // The card receipt is a link anyone holding it can open, so only the visitor of the signed pay link is given it (an office view of the page reads none).
    const [payment] = row.paymentId && ctx.principal.kind === "public" ? await ctx.db.select({ receiptUrl: s.charge.receiptUrl }).from(s.charge).where(and(eq(s.charge.id, row.paymentId), eq(s.charge.organizationId, ctx.organizationId))) : []
    return {
      id: row.id, number: row.number, firstName: customer?.firstName ?? "", lines: row.lines.map((l) => ({ name: l.name, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice })),
      amount: row.amount, tax: row.tax, total: row.total, dueOn: row.dueOn, paidOn: row.paidOn, status: invoiceStatus(row, today(ctx)), receiptUrl: payment?.receiptUrl ?? null,
    }
  },
})

export const invoicesRemind = defineHandler({
  name: "invoices.remind",
  method: "POST",
  path: "/invoices/{id}/remind",
  scope: "write",
  summary: "Send the customer a reminder of an open bill with the pay link. Two presses in one day send one message. A paid or cancelled bill is refused.",
  input: idInput,
  output: InvoiceOut,
  async run(ctx, input) {
    return invoiceOut(ctx, await remindBill(ctx, input.id))
  },
})

export const invoicesCancel = defineHandler({
  name: "invoices.cancel",
  method: "POST",
  path: "/invoices/{id}/cancel",
  scope: "admin",
  summary: "Cancel a bill that has not been paid. The bill stays on record, marked cancelled, its card form on Stripe is closed, and the job may be billed again. A paid bill is refused: refund the payment instead.",
  input: idInput,
  output: InvoiceOut,
  async run(ctx, input) {
    const row = await loadInvoice(ctx, input.id)
    if (row.cancelledAt) return invoiceOut(ctx, row)
    if (!invoiceOpen(row)) throw new ApiError("conflict", "This bill is already paid. Refund the payment instead.")
    const updated = await cancelOpenBill(ctx, row)
    if (!updated) throw new ApiError("conflict", "This bill was paid a moment ago. Refund the payment instead.")
    return invoiceOut(ctx, updated)
  },
})
