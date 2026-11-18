import "server-only"
import { and, desc, eq, isNull, like, sql } from "drizzle-orm"
import * as s from "@/db/schema"
import { readAppUrl } from "@/lib/env"
import { whoOf } from "@/lib/events/record"
import { baseData } from "@/lib/messaging/data"
import { messageChannel, queueMessage } from "@/lib/messaging/queue"
import { payUrl } from "@/lib/messaging/tokens"
import { invoiceAmount, invoiceLines, invoiceOpen, invoiceTax, nextInvoiceNumber, type InvoiceLine } from "@/lib/money/invoice"
import { isPaid, jobOwed, paidTotal } from "@/lib/money/words"
import { billingOf } from "../settings/handlers"
import type { Ctx } from "../../core/context"
import { ApiError, notFound } from "../../core/errors"
import { addDays, today } from "../shared"
import { emitEvent } from "../webhooks/deliver"
import { loadInvoice, openInvoiceOf, type InvoiceRow } from "./queries"

/** What the bill is for, as a phrase after "the": "repair", "repair and spring turn-on", "services" when there are more than two. */
export function billName(lines: readonly Pick<InvoiceLine, "name">[]): string {
  const names = [...new Set(lines.map((l) => l.name.toLowerCase()))]
  return names.length === 1 ? names[0]! : names.length === 2 ? `${names[0]} and ${names[1]}` : "services"
}

/** The message's arguments: the frozen lines, the tax, the total, the due day and the signed pay link. */
function billData(origin: string, customer: typeof s.customer.$inferSelect, inv: InvoiceRow) {
  return {
    ...baseData(origin, customer), invoiceNumber: inv.number, visitName: billName(inv.lines),
    lines: inv.lines.map((l) => ({ name: l.name, amount: l.quantity * l.unitPrice })),
    amount: inv.amount, tax: inv.tax, total: inv.total, dueOn: inv.dueOn, payUrl: payUrl(origin, inv.id),
  }
}

/**
 * The visits a paid bill's lines name, which the next bill leaves off. A paid bill whose payment now nets to nothing (refunded in
 * full) bills nothing any more, so its visits can be billed again.
 */
async function paidVisitIds(ctx: Ctx, jobId: string): Promise<Set<string>> {
  const org = ctx.organizationId
  const rows = await ctx.db.select().from(s.invoice).where(and(eq(s.invoice.organizationId, org), eq(s.invoice.jobId, jobId), sql`${s.invoice.paidOn} is not null`, isNull(s.invoice.cancelledAt)))
  const payments = rows.length ? await ctx.db.select().from(s.charge).where(and(eq(s.charge.organizationId, org), eq(s.charge.jobId, jobId))) : []
  const stands = (r: InvoiceRow) => !r.paymentId || paidTotal(payments.filter((p) => p.id === r.paymentId || p.refundsPaymentId === r.paymentId)) > 0
  return new Set(rows.filter(stands).flatMap((r) => r.lines.map((l) => l.visitId).filter((v): v is string => Boolean(v))))
}

export interface SendBill {
  jobId: string
  /** the job's own bill needs every visit done or cancelled (`invoices.send`); Done with Send a bill bills the done visits' lines while others are still ahead */
  requireAllDone: boolean
  /** a visit about to be marked done, counted as done by the checks (Done's own pre-check, before the visit's status is written) */
  assumeDone?: string
}

/** Everything a bill needs, worked out with nothing written: the row to insert and the customer and link its message goes with. */
async function planBill(ctx: Ctx, input: SendBill) {
  const org = ctx.organizationId
  const [job] = await ctx.db.select().from(s.job).where(and(eq(s.job.id, input.jobId), eq(s.job.organizationId, org)))
  if (!job) throw notFound("Job")
  const [visits, lines, payments, [customer], [organization]] = await Promise.all([
    ctx.db.select().from(s.visit).where(and(eq(s.visit.jobId, job.id), eq(s.visit.organizationId, org))),
    ctx.db.select().from(s.lineItem).where(and(eq(s.lineItem.jobId, job.id), eq(s.lineItem.organizationId, org))).orderBy(s.lineItem.createdAt, s.lineItem.id),
    ctx.db.select().from(s.charge).where(and(eq(s.charge.jobId, job.id), eq(s.charge.organizationId, org))),
    ctx.db.select().from(s.customer).where(and(eq(s.customer.id, job.customerId), eq(s.customer.organizationId, org))),
    ctx.db.select().from(s.organization).where(eq(s.organization.id, org)),
  ])
  if (!customer || !organization) throw notFound("Customer")
  const live = visits.filter((v) => v.status !== "cancelled" && v.status !== "skipped")
  const done = live.filter((v) => v.status === "completed" || v.id === input.assumeDone)
  if (done.length === 0 || (input.requireAllDone && done.length !== live.length)) throw new ApiError("unprocessable", "Mark the job done before sending a bill")
  if (await openInvoiceOf(ctx.db, org, job.id)) throw new ApiError("conflict", "A bill is already open for this job")
  const liveLines = lines.filter((l) => !l.cancelledAt)
  const owed = jobOwed(liveLines, payments)
  if (owed <= 0) throw new ApiError("conflict", "This job is already paid")

  const settled = await paidVisitIds(ctx, job.id)
  const doneIds = new Set(done.map((v) => v.id))
  const priceOf = (visitId: string) => liveLines.filter((l) => l.visitId === visitId).reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
  const paidUp = (visitId: string) => isPaid(payments.filter((p) => p.visitId === visitId), priceOf(visitId))
  const billable = liveLines.filter((l) => (l.visitId ? doneIds.has(l.visitId) && !settled.has(l.visitId) && !paidUp(l.visitId) : input.requireAllDone))
  const frozen = invoiceLines(billable)
  const subtotal = invoiceAmount(frozen)
  if (subtotal <= 0) throw new ApiError("unprocessable", "There is nothing to bill yet. Price the visit first.")
  // Money paid on the job that no billed visit explains (a deposit on the job as a whole, part of a visit) comes off the bill.
  const credit = subtotal - owed
  if (credit > 0) frozen.push({ name: "Payments received", description: null, quantity: 1, unitPrice: -credit, taxable: false })
  // Checked before anything is written: a bill nobody can be sent, or one with no site address to link to, is never left open.
  if (!(await messageChannel(ctx.db, customer, "invoice"))) throw new ApiError("unprocessable", "This customer has no mobile or email to send the bill to.")
  const origin = readAppUrl()
  const billing = billingOf(organization.settings)
  const amount = invoiceAmount(frozen)
  const tax = invoiceTax(frozen, billing)
  const day = today(ctx)
  const base = { organizationId: org, jobId: job.id, customerId: customer.id, lines: frozen, amount, tax, total: amount + tax, sentOn: day, dueOn: addDays(day, billing.dueDays) }
  return { job, customer, origin, base, year: Number(day.slice(0, 4)) }
}

/** Every refusal `sendBill` can make, with nothing written: Done with Send a bill runs it before the visit is marked done. */
export async function checkBill(ctx: Ctx, input: SendBill): Promise<void> {
  await planBill(ctx, input)
}

/**
 * The one writer of a bill, under `invoices.send` and Done with Send a bill: the job's lines are frozen as they are now (a
 * later price edit never changes a bill that was sent), the tax comes from Settings › Billing, it is sent today (Mountain)
 * and due `dueDays` later, and one message goes with the pay link, by text when the customer has a mobile and by email
 * otherwise. The bill covers the done visits' lines that are not already paid (by their own payment rows or by an earlier
 * paid bill that still stands); when other money was paid on the job as a whole, a last line takes it off so the bill asks only for what is owed.
 * The job must be Done, still owe money, have no other open bill (a partly-done job's bill covers only its done lines) and
 * a customer who can be reached. The number counts up from the organization's highest of the year; two bills made at once
 * race on the unique index and the loser takes the next number, once.
 */
export async function sendBill(ctx: Ctx, input: SendBill): Promise<InvoiceRow> {
  const org = ctx.organizationId
  const { job, customer, origin, base, year } = await planBill(ctx, input)
  let row: InvoiceRow | undefined
  for (let attempt = 0; attempt < 2 && !row; attempt++) {
    const [max] = await ctx.db.select({ number: s.invoice.number }).from(s.invoice).where(and(eq(s.invoice.organizationId, org), like(s.invoice.number, `INV-${year}-%`))).orderBy(desc(sql`length(${s.invoice.number})`), desc(s.invoice.number)).limit(1)
    ;[row] = await ctx.db.insert(s.invoice).values({ ...base, number: nextInvoiceNumber(year, max?.number) }).onConflictDoNothing().returning()
    // The unique index on the job's open bill also stops an insert: a bill made at the same moment by someone else.
    if (!row && (await openInvoiceOf(ctx.db, org, job.id))) throw new ApiError("conflict", "A bill is already open for this job")
  }
  if (!row) throw new ApiError("conflict", "Another bill was being made at the same moment. Try again.")
  await queueMessage(ctx.db, { organizationId: org, customerId: customer.id, kind: "invoice", key: `invoice-${row.id}`, data: billData(origin, customer, row) })
  await emitEvent(ctx.db, org, "invoice.sent", { invoiceId: row.id, number: row.number, jobId: job.id, customerId: customer.id, total: row.total, sentOn: row.sentOn, dueOn: row.dueOn }, {
    about: "invoice", aboutId: row.id, customerId: customer.id, jobId: job.id, who: whoOf(ctx), at: ctx.now,
    detail: { number: row.number, total: row.total, dueOn: row.dueOn },
  })
  return row
}

/**
 * Sends the bill's reminder: one message with the pay link, with the key `invoice-<id>-<today>` so two presses in a day send
 * one. A paid or cancelled bill is refused. Says so when the customer has neither a mobile nor an email to reach.
 */
export async function remindBill(ctx: Ctx, invoiceId: string): Promise<InvoiceRow> {
  const row = await loadInvoice(ctx, invoiceId)
  if (!invoiceOpen(row)) throw new ApiError("conflict", row.paidOn ? "This bill is already paid" : "This bill was cancelled")
  const [customer] = await ctx.db.select().from(s.customer).where(and(eq(s.customer.id, row.customerId), eq(s.customer.organizationId, ctx.organizationId)))
  if (!customer) throw notFound("Customer")
  const key = `invoice-${row.id}-${today(ctx)}`
  const queued = await queueMessage(ctx.db, { organizationId: ctx.organizationId, customerId: customer.id, kind: "invoice-reminder", key, data: billData(readAppUrl(), customer, row) })
  if (!queued) {
    const [sent] = await ctx.db.select({ id: s.messageLog.id }).from(s.messageLog).where(and(eq(s.messageLog.customerId, customer.id), eq(s.messageLog.kind, "invoice-reminder"), eq(s.messageLog.key, key)))
    if (!sent) throw new ApiError("unprocessable", `${customer.firstName} has no mobile or email to send the reminder to`)
    return row
  }
  await emitEvent(ctx.db, ctx.organizationId, "invoice.reminded", { invoiceId: row.id, number: row.number, jobId: row.jobId, customerId: customer.id, total: row.total, dueOn: row.dueOn }, {
    about: "invoice", aboutId: row.id, customerId: customer.id, jobId: row.jobId, who: whoOf(ctx), at: ctx.now,
    detail: { number: row.number, total: row.total, dueOn: row.dueOn },
  })
  return row
}
