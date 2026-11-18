import "server-only"
import { and, asc, eq, isNull, lt } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { invoiceOpen, invoiceStatus } from "@/lib/money/invoice"
import { ApiError } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { Id, idInput, today } from "../shared"
import { invoiceOut, loadInvoice } from "./queries"
import { InvoiceOut } from "./schemas"
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
  summary: "Cancel a bill that has not been paid. The bill stays on record, marked cancelled, and the job may be billed again. A paid bill is refused: refund the payment instead.",
  input: idInput,
  output: InvoiceOut,
  async run(ctx, input) {
    const row = await loadInvoice(ctx, input.id)
    if (row.cancelledAt) return invoiceOut(ctx, row)
    if (!invoiceOpen(row)) throw new ApiError("conflict", "This bill is already paid. Refund the payment instead.")
    const [updated] = await ctx.db.update(s.invoice).set({ cancelledAt: ctx.now }).where(and(eq(s.invoice.id, row.id), eq(s.invoice.organizationId, ctx.organizationId), isNull(s.invoice.paidOn))).returning()
    if (!updated) throw new ApiError("conflict", "This bill was paid a moment ago. Refund the payment instead.")
    return invoiceOut(ctx, updated)
  },
})
