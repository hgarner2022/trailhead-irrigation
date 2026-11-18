import "server-only"
import { and, asc, eq, isNull, lt } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { invoiceOpen, invoiceStatus } from "@/lib/money/invoice"
import { ApiError, notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { selfCustomerId } from "../portal/self"
import { assertOwnsCustomer, Id, idInput, today } from "../shared"
import { cancelOpenBill } from "./cancel"
import { invoiceOut, loadInvoice } from "./queries"
import { InvoiceOut, PayViewOut } from "./schemas"
import { remindBill, sendBill } from "./send"

export const invoicesSend = defineHandler({
  name: "invoices.send",
  method: "POST",
  path: "/invoices",
  scope: "collect",
  status: 201,
  summary:
    "Send an invoice for a job that is done and still owes money. The job's lines are frozen as they are now, the tax comes from the billing settings, the invoice is due the settings' number of days after today, and one message with the pay link goes to the customer (a text when they have a mobile, an email otherwise). A job with an invoice already open refuses a second one.",
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
  customerSelf: true,
  summary: "List invoices, oldest first, for a job, for a customer, or by status (`overdue` lists every open invoice past its due day). A signed-in customer lists only their own, never a voided one, each with the pay link of an open one.",
  input: z.object({ jobId: Id.optional(), customerId: Id.optional(), status: z.enum(["sent", "paid", "overdue", "cancelled"]).optional() }),
  output: z.object({ data: z.array(InvoiceOut) }),
  async run(ctx, input) {
    // A customer's call is always about themselves: whatever customerId they send, the rows are their own and a voided invoice is not one they hold.
    const own = selfCustomerId(ctx)
    if (own && input.customerId && input.customerId !== own) throw new ApiError("forbidden", "That record belongs to another customer")
    const customerId = own ?? input.customerId
    if (!input.jobId && !customerId && !input.status) throw new ApiError("invalid", "Give a jobId, a customerId or a status", [{ path: "jobId", message: "A job, a customer or a status is needed" }])
    const day = today(ctx)
    const rows = await ctx.db
      .select()
      .from(s.invoice)
      .where(
        and(
          eq(s.invoice.organizationId, ctx.organizationId),
          input.jobId ? eq(s.invoice.jobId, input.jobId) : undefined,
          customerId ? eq(s.invoice.customerId, customerId) : undefined,
          own ? isNull(s.invoice.cancelledAt) : undefined,
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
  customerSelf: true,
  summary: "One invoice with its frozen lines, amounts, dates and status. A customer asks only about their own, and never gets a voided one.",
  input: idInput,
  output: InvoiceOut,
  async run(ctx, input) {
    const row = await loadInvoice(ctx, input.id)
    assertOwnsCustomer(ctx, row.customerId)
    if (selfCustomerId(ctx) && row.cancelledAt) throw notFound("Invoice")
    return invoiceOut(ctx, row)
  },
})

export const invoicesPayView = defineHandler({
  name: "invoices.payView",
  method: "GET",
  path: "/invoices/{id}/pay-view",
  scope: "read",
  checkout: "own-invoice",
  summary: "The invoice as its customer sees it on the pay page: the frozen lines, the amounts, the due day, whether it is open, paid or canceled, the customer's first name and, to the visitor of the link only, the card receipt once paid. The pay page calls it as the visitor of the signed link, who may read only the one invoice that link opens.",
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
  summary: "Send the customer a reminder of an open invoice with the pay link. Two presses in one day send one message. A paid or canceled invoice is refused.",
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
  summary: "Cancel an invoice that has not been paid. The invoice stays on record, marked voided, its card form on Stripe is closed, and the job may be invoiced again. A paid invoice is refused: refund the payment instead.",
  input: idInput,
  output: InvoiceOut,
  async run(ctx, input) {
    const row = await loadInvoice(ctx, input.id)
    if (row.cancelledAt) return invoiceOut(ctx, row)
    if (!invoiceOpen(row)) throw new ApiError("conflict", "This invoice is already paid. Refund the payment instead.")
    const updated = await cancelOpenBill(ctx, row)
    if (!updated) throw new ApiError("conflict", "This invoice was paid a moment ago. Refund the payment instead.")
    return invoiceOut(ctx, updated)
  },
})
