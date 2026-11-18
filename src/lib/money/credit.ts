import "server-only"
import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { allocateJobPayments } from "./words"

type PaymentRow = typeof s.charge.$inferSelect

/**
 * What the payments made on jobs as a whole (a bill paid on the pay page) credit to each visit of those jobs, read from the
 * database: the slices `allocateJobPayments` makes, as copies of the payment row keyed by the visit they credit. A visit's price is its
 * live lines (the legacy `visit.amount` only for a visit with no line); the visits the paid bills name come first. Only the jobs
 * given are read, and only when one of them has a payment of that kind: the common case is one cheap query.
 */
export async function loadJobCredit(db: Database, organizationId: string, jobIds: readonly string[]): Promise<Map<string, PaymentRow[]>> {
  const out = new Map<string, PaymentRow[]>()
  if (jobIds.length === 0) return out
  const onJob = await db
    .selectDistinct({ jobId: s.charge.jobId })
    .from(s.charge)
    .where(and(eq(s.charge.organizationId, organizationId), inArray(s.charge.jobId, [...jobIds]), isNull(s.charge.visitId), eq(s.charge.status, "succeeded")))
  const ids = onJob.map((r) => r.jobId).filter((id): id is string => Boolean(id))
  if (ids.length === 0) return out
  const [payments, visits, lines, bills] = await Promise.all([
    db.select().from(s.charge).where(and(eq(s.charge.organizationId, organizationId), inArray(s.charge.jobId, ids))).orderBy(asc(s.charge.createdAt), asc(s.charge.id)),
    db.select({ id: s.visit.id, jobId: s.visit.jobId, status: s.visit.status, completedOn: s.visit.completedOn, amount: s.visit.amount }).from(s.visit).where(and(eq(s.visit.organizationId, organizationId), inArray(s.visit.jobId, ids))),
    db.select().from(s.lineItem).where(and(eq(s.lineItem.organizationId, organizationId), inArray(s.lineItem.jobId, ids))),
    db.select().from(s.invoice).where(and(eq(s.invoice.organizationId, organizationId), inArray(s.invoice.jobId, ids), isNotNull(s.invoice.paidOn), isNull(s.invoice.cancelledAt))).orderBy(asc(s.invoice.paidOn), asc(s.invoice.id)),
  ])
  for (const jobId of ids) {
    const mine = visits.filter((v) => v.jobId === jobId)
    const priceOf = (v: { id: string; amount: number }) => {
      const own = lines.filter((l) => l.jobId === jobId && l.visitId === v.id)
      return own.length ? own.filter((l) => !l.cancelledAt).reduce((sum, l) => sum + l.quantity * l.unitPrice, 0) : v.amount
    }
    const preferred = bills.filter((b) => b.jobId === jobId).flatMap((b) => b.lines.map((l) => l.visitId).filter((id): id is string => Boolean(id)))
    const slices = allocateJobPayments(
      payments.filter((p) => p.jobId === jobId),
      mine.map((v) => ({ id: v.id, done: v.status === "completed", cancelled: v.status === "cancelled" || v.status === "skipped", price: priceOf(v), doneOn: v.completedOn })),
      preferred,
    )
    for (const [visitId, rows] of slices) out.set(visitId, rows)
  }
  return out
}
