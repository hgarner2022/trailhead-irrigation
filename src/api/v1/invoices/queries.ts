import "server-only"
import { and, eq, isNull } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { readAppUrl } from "@/lib/env"
import { payUrl } from "@/lib/messaging/tokens"
import { invoiceStatus } from "@/lib/money/invoice"
import type { Ctx } from "../../core/context"
import { notFound } from "../../core/errors"
import { canSeeContact, today } from "../shared"
import type { InvoiceOutType } from "./schemas"

export type InvoiceRow = typeof s.invoice.$inferSelect

/** The customer's pay link for a bill, or undefined where the site address is not configured. */
export function payLinkOf(invoiceId: string): string | undefined {
  try {
    return payUrl(readAppUrl(), invoiceId)
  } catch {
    return undefined
  }
}

/** A bill as the API shows it. The pay link is a bearer link, so it goes only to a key or person that may write (a tech's read never carries it). */
export function invoiceOut(ctx: Ctx, r: InvoiceRow): InvoiceOutType {
  const link = canSeeContact(ctx) ? payLinkOf(r.id) : undefined
  return {
    id: r.id, jobId: r.jobId, customerId: r.customerId, number: r.number, lines: r.lines, amount: r.amount, tax: r.tax, total: r.total,
    sentOn: r.sentOn, dueOn: r.dueOn, paidOn: r.paidOn, paymentId: r.paymentId, cancelledAt: r.cancelledAt ? r.cancelledAt.toISOString() : null,
    status: invoiceStatus(r, today(ctx)), ...(link ? { payUrl: link } : {}), createdAt: r.createdAt.toISOString(),
  }
}

/** One of the organization's bills; another organization's is not found. */
export async function loadInvoice(ctx: Ctx, id: string): Promise<InvoiceRow> {
  const [row] = await ctx.db.select().from(s.invoice).where(and(eq(s.invoice.id, id), eq(s.invoice.organizationId, ctx.organizationId)))
  if (!row) throw notFound("Invoice")
  return row
}

/** The job's open bill (not paid, not cancelled), if it has one. */
export async function openInvoiceOf(db: Database, organizationId: string, jobId: string): Promise<InvoiceRow | undefined> {
  const [row] = await db
    .select()
    .from(s.invoice)
    .where(and(eq(s.invoice.organizationId, organizationId), eq(s.invoice.jobId, jobId), isNull(s.invoice.paidOn), isNull(s.invoice.cancelledAt)))
  return row
}
