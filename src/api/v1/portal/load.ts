import "server-only"
import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm"
import * as s from "@/db/schema"
import { loadJobKinds } from "@/lib/jobs/kind-load"
import { jobTotal, linesOfVisit, visitPrice } from "@/lib/jobs/lines"
import { stageOf } from "@/lib/jobs/stage"
import { visitName } from "@/lib/events/names"
import { signToken } from "@/lib/messaging/tokens"
import { invoiceStatus } from "@/lib/money/invoice"
import { loadTaxRule } from "@/lib/money/tax-rule"
import { jobMoney, jobOwed } from "@/lib/money/words"
import { passStatus } from "@/lib/pass/facts"
import { changeFor } from "@/lib/portal/change-day"
import { customerFacingFirstName } from "@/lib/portal/words"
import type { Ctx } from "../../core/context"
import { canSeeContact, today } from "../shared"
import { selfCustomerId } from "./self"
import type { PortalJobType } from "./schemas"

const iso = (d: Date | null) => (d ? d.toISOString() : null)

/** The relative pay link of one open invoice, signed so the pay page opens it without a sign-in; the customer gets it only from their own account. */
export const payPath = (invoiceId: string) => `/pay/${invoiceId}?token=${signToken("invoice-pay", invoiceId)}`

/**
 * One customer's jobs as their account shows them, newest sale first: the jobs that were sold (a quote still waiting is not shown), each with its
 * visits, lines, payments and invoices. Everything is read for `customerId` in the caller's organization and shaped to the customer-safe schema:
 * no notes, no events, no payment that failed, no voided invoice, a person by first name. `only` limits it to one job id.
 */
export async function loadPortalJobs(ctx: Ctx, customerId: string, only?: string): Promise<PortalJobType[]> {
  const { db, organizationId: org } = ctx
  const day = today(ctx)
  // Check numbers, card receipt links and the signed pay links are for the customer they belong to and for people who may write, as `paymentOut` and `invoiceOut` read them.
  const seeMoney = selfCustomerId(ctx) === customerId || canSeeContact(ctx)
  const jobs = await db
    .select()
    .from(s.job)
    .where(and(eq(s.job.customerId, customerId), eq(s.job.organizationId, org), isNotNull(s.job.soldOn), only ? eq(s.job.id, only) : undefined))
    .orderBy(desc(s.job.soldOn), desc(s.job.createdAt), desc(s.job.id))
  if (!jobs.length) return []
  const ids = jobs.map((j) => j.id)
  const [visits, lineRows, paymentRows, invoiceRows, properties, people, rule, [orgRow]] = await Promise.all([
    db.select().from(s.visit).where(and(inArray(s.visit.jobId, ids), eq(s.visit.organizationId, org))).orderBy(asc(s.visit.scheduledOn), asc(s.visit.createdAt), asc(s.visit.id)),
    db.select().from(s.lineItem).where(and(inArray(s.lineItem.jobId, ids), eq(s.lineItem.organizationId, org))).orderBy(asc(s.lineItem.createdAt), asc(s.lineItem.id)),
    db.select().from(s.charge).where(and(inArray(s.charge.jobId, ids), eq(s.charge.organizationId, org))).orderBy(asc(s.charge.createdAt), asc(s.charge.id)),
    db.select().from(s.invoice).where(and(inArray(s.invoice.jobId, ids), eq(s.invoice.organizationId, org))).orderBy(asc(s.invoice.sentOn), asc(s.invoice.createdAt), asc(s.invoice.id)),
    db.select().from(s.property).where(and(inArray(s.property.id, jobs.map((j) => j.propertyId)), eq(s.property.organizationId, org))),
    db.select({ id: s.person.id, name: s.person.name }).from(s.person).where(eq(s.person.organizationId, org)),
    loadTaxRule(db, org),
    db.select({ settings: s.organization.settings }).from(s.organization).where(eq(s.organization.id, org)),
  ])
  const kinds = await loadJobKinds(db, org, jobs)
  const windowKinds = new Set((orgRow?.settings.windows ?? []).map((w) => w.kind as string))
  const nameOf = new Map(people.map((p) => [p.id, p.name]))
  return jobs.map((j) => {
    const lines = lineRows.filter((l) => l.jobId === j.id)
    const jobVisits = visits.filter((v) => v.jobId === j.id)
    const payments = paymentRows.filter((p) => p.jobId === j.id)
    const property = properties.find((p) => p.id === j.propertyId)
    // A voided invoice never reaches the customer; an open one on a job that owes nothing is not shown as owing.
    const invoices = invoiceRows.filter((i) => i.jobId === j.id && !i.cancelledAt)
    const owed = jobOwed(lines, payments, rule)
    const open = owed > 0 ? invoices.find((i) => !i.paidOn) : undefined
    const paidInvoiceVisits = invoices.filter((i) => i.paidOn).flatMap((i) => i.lines.map((l) => l.visitId).filter((v): v is string => Boolean(v)))
    const money = jobMoney(
      lines,
      payments,
      jobVisits.map((v) => ({ id: v.id, cancelled: v.status === "cancelled" || v.status === "skipped", price: visitPrice(linesOfVisit(lines, v.id), rule), done: v.status === "completed", doneOn: v.completedOn })),
      rule,
      open,
      paidInvoiceVisits,
    )
    const kind = kinds.get(j.id)!
    const stage = stageOf({ kind, cancelledAt: j.cancelledAt, soldOn: j.soldOn, quoteSentOn: j.quoteSentOn, quoteAcceptedOn: j.quoteAcceptedOn, lines, visits: jobVisits })
    const live = lines.find((l) => !l.cancelledAt)
    const jobOpen = j.season !== null ? passStatus(j, day) === "active" : !j.cancelledAt
    return {
      id: j.id,
      name: j.season !== null ? `Season Pass ${j.season}` : (live?.name ?? (jobVisits[0] ? visitName(jobVisits[0].kind) : "Work at your property")),
      kind,
      passId: j.season !== null ? j.id : null,
      season: j.season,
      passNumber: j.passNumber,
      soldOn: j.soldOn!,
      canceled: Boolean(j.cancelledAt),
      open: jobOpen,
      stage: stage === "done" ? "done" : stage === "cancelled" ? "cancelled" : "open",
      address: property?.address ?? "",
      lines: lines.map((l) => ({ id: l.id, name: l.name, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, taxable: l.taxable, cancelledAt: iso(l.cancelledAt), visitId: l.visitId })),
      total: jobTotal(lines, rule),
      money: { paid: money.paid, owed: money.owed, words: money.words },
      visits: jobVisits.map((v) => ({
        id: v.id,
        jobId: v.jobId,
        kind: v.kind,
        name: visitName(v.kind),
        status: v.status,
        scheduledOn: v.scheduledOn,
        completedOn: v.completedOn,
        startTime: v.startTime,
        durationMinutes: v.durationMinutes,
        window: v.window,
        personFirstName: customerFacingFirstName(v.personId ? nameOf.get(v.personId) : null),
        mustBeHome: properties.find((p) => p.id === v.propertyId)?.mustBeHome ?? false,
        notDoneReason: v.status === "unscheduled" ? v.notDoneReason : null,
        change: changeFor({ status: v.status, scheduledOn: v.scheduledOn, hasWindow: windowKinds.has(v.kind), jobOpen }, day),
      })),
      payments: payments
        .filter((p) => p.status === "succeeded")
        .map((p) => ({ id: p.id, visitId: p.visitId, amount: p.amount, method: p.method, reference: seeMoney ? p.reference : null, paidOn: p.paidOn, refundsPaymentId: p.refundsPaymentId, receiptUrl: p.refundsPaymentId || !seeMoney ? null : p.receiptUrl })),
      invoices: invoices.map((i) => ({
        id: i.id,
        number: i.number,
        total: i.total,
        sentOn: i.sentOn,
        dueOn: i.dueOn,
        paidOn: i.paidOn,
        status: invoiceStatus(i, day) as "sent" | "paid" | "overdue",
        payUrl: seeMoney && !i.paidOn && owed > 0 ? payPath(i.id) : null,
      })),
    }
  })
}
