import "server-only"
import { and, eq, sql } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import type { Ctx } from "../../core/context"
import { notFound } from "../../core/errors"
import { linesOfVisit, visitPrice } from "@/lib/jobs/lines"
import { loadJobCredit } from "@/lib/money/credit"
import { isPaid } from "@/lib/money/words"
import { hasScope } from "@/lib/auth/principal"
import { eventsOfJson, newestNoteText, visitEventsJson } from "../events/queries"
import { canSeeContact } from "../shared"
import { yardOut } from "../customers/handlers"
import type { PaymentOutType } from "../payments/schemas"
import type { VisitOutType } from "./schemas"

/** The job's lines as the database hands them: one JSON array per visit, oldest first. */
interface LineJson { id: string; name: string; description: string | null; quantity: number; unit_price: number; taxable: boolean; cancelled_at: string | null; visit_id: string | null }

/** A payment row as the database hands it inside JSON. */
interface PaymentJson { id: string; job_id: string | null; visit_id: string | null; customer_id: string | null; amount: number; method: PaymentOutType["method"]; reference: string | null; status: PaymentOutType["status"]; paid_on: string | null; receipt_url: string | null; refunds_payment_id: string | null; created_at: string }

export const visitSelect = {
  // the visit's own story: its newest 50 events, newest first (staff only: `visitOut` leaves them out for a customer)
  events: visitEventsJson(s.visit.id, s.visit.organizationId),
  visit: s.visit,
  // a visit is a pass visit when its job is a Season Pass, which is the job with a season
  isPassVisit: sql<boolean>`exists (select 1 from job pj where pj.id = ${s.visit.jobId} and pj.season is not null)`,
  firstName: s.customer.firstName,
  town: s.property.town,
  lat: s.property.lat,
  lng: s.property.lng,
  address: s.property.address,
  yard: s.property,
  personName: s.person.name,
  // what was sold on the visit's job: its lines are the truth for what the visit costs
  lines: sql<LineJson[] | null>`(select json_agg(json_build_object('id', l.id, 'name', l.name, 'description', l.description, 'quantity', l.quantity, 'unit_price', l.unit_price, 'taxable', l.taxable, 'cancelled_at', l.cancelled_at, 'visit_id', l.visit_id) order by l.created_at, l.id) from line_item l where l.job_id = ${s.visit.jobId} and l.organization_id = ${s.visit.organizationId})`,
  // the visit's own payment rows, oldest first (the job-level ones are on the job)
  payments: sql<PaymentJson[] | null>`(select json_agg(json_build_object('id', c.id, 'job_id', c.job_id, 'visit_id', c.visit_id, 'customer_id', c.customer_id, 'amount', c.amount, 'method', c.method, 'reference', c.reference, 'status', c.status, 'paid_on', c.paid_on, 'receipt_url', c.receipt_url, 'refunds_payment_id', c.refunds_payment_id, 'created_at', c.created_at) order by c.created_at, c.id) from charge c where c.visit_id = ${s.visit.id})`,
}

/** Visits with the customer's first name, the property's town and point, and the name of the person assigned. Add `.where(...)` in the caller. */
export const visitsQuery = (db: Database) =>
  db.select(visitSelect).from(s.visit).innerJoin(s.customer, eq(s.customer.id, s.visit.customerId)).innerJoin(s.property, eq(s.property.id, s.visit.propertyId)).leftJoin(s.person, eq(s.person.id, s.visit.personId))

/** A visit as the query returns it; `credit` is its share of the payments made on the job as a whole, added by `withJobCredit`. */
export type VisitJoined = Awaited<ReturnType<ReturnType<typeof visitsQuery>["limit"]>>[number] & { credit?: PaymentJson[] }

/**
 * Adds to each visit its share of the payments made on its job as a whole (a bill paid on the pay page), by the one allocation rule
 * (`allocateJobPayments`, read with `loadJobCredit`), so `paymentStatus`, `paidBy` and `jobPaymentShares` say a visit that a bill paid is paid.
 * One cheap query when none of the jobs has such a payment.
 */
export async function withJobCredit<T extends VisitJoined>(db: Database, organizationId: string, rows: T[]): Promise<T[]> {
  const credit = await loadJobCredit(db, organizationId, [...new Set(rows.map((r) => r.visit.jobId).filter((id): id is string => Boolean(id)))])
  if (credit.size === 0) return rows
  return rows.map((r) => {
    const shares = credit.get(r.visit.id)
    return shares ? { ...r, credit: shares.map((c): PaymentJson => ({ id: c.id, job_id: c.jobId, visit_id: c.visitId, customer_id: c.customerId, amount: c.amount, method: c.method, reference: c.reference, status: c.status, paid_on: c.paidOn, receipt_url: c.receiptUrl, refunds_payment_id: c.refundsPaymentId, created_at: c.createdAt.toISOString() })) } : r
  })
}

/** A timestamp as Postgres prints it inside JSON, as an ISO string (zone-less text is UTC). */
const isoOf = (at: string) => new Date(/(Z|[+-]\d\d(:?\d\d)?)$/.test(at) ? at : `${at}Z`).toISOString()

/**
 * How the visit was paid and whether it went through, from its payment rows (a refund row is not a payment of its own: the row
 * it reverses is). `paidBy` is the newest payment's method; `paymentStatus` is "paid" while the visit's rows reach its price
 * (`isPaid`, the rule the screens read, so a newer failed attempt does not hide money that arrived), else "failed" or "pending"
 * for a newest row that did not succeed, and "none" with no rows, nothing left paid or only part of the price paid.
 */
export function newestPayment(
  payments: Pick<PaymentJson, "method" | "status" | "amount" | "refunds_payment_id">[],
  price?: number | null,
): { paidBy: string | null; paymentStatus: VisitOutType["paymentStatus"] } {
  const newest = [...payments].reverse().find((p) => !p.refunds_payment_id && p.amount > 0)
  if (!newest) return { paidBy: null, paymentStatus: "none" }
  if (isPaid(payments, price)) return { paidBy: newest.method, paymentStatus: "paid" }
  return { paidBy: newest.method, paymentStatus: newest.status === "failed" ? "failed" : newest.status === "pending" ? "pending" : "none" }
}

/** A payment row as the API shows it; the reference and the receipt link are for people and keys that may write. */
const paymentJsonOut = (seeNotes: boolean) => (c: PaymentJson): PaymentOutType => ({
  id: c.id, jobId: c.job_id, visitId: c.visit_id, customerId: c.customer_id, amount: c.amount, method: c.method, reference: seeNotes ? c.reference : null, status: c.status,
  paidOn: c.paid_on, receiptUrl: seeNotes ? c.receipt_url : null, refundsPaymentId: c.refunds_payment_id, createdAt: isoOf(c.created_at),
})

export function visitOut(ctx: Ctx, row: VisitJoined): VisitOutType {
  const v = row.visit
  const lineItems = (row.lines ?? []).map((l) => ({
    id: l.id, name: l.name, description: l.description, quantity: l.quantity, unitPrice: l.unit_price, taxable: l.taxable,
    cancelledAt: l.cancelled_at ? isoOf(l.cancelled_at) : null, visitId: l.visit_id,
  }))
  // What the visit costs is its own non-cancelled lines (a visit with no line costs nothing).
  const amount = visitPrice(linesOfVisit(lineItems, v.id).map((l) => ({ ...l, cancelledAt: l.cancelledAt ? new Date(l.cancelledAt) : null })))
  const seeNotes = canSeeContact(ctx)
  // The story is staff's: a signed-in customer reading their own pass never gets events, and so no notes.
  const staff = hasScope(ctx.principal, "read")
  const events = staff ? eventsOfJson(ctx, row.events) : []
  const allPayments = [...(row.payments ?? []), ...(row.credit ?? [])]
  // Derived, never stored: the time of the newest payment that arrived, once the visit is paid in full (a refund that leaves it unpaid clears it).
  const arrived = allPayments.filter((p) => p.status === "succeeded" && p.amount > 0).map((p) => isoOf(p.created_at)).sort()
  const chargedAt = isPaid(allPayments, amount) ? (arrived[arrived.length - 1] ?? null) : null
  return {
    id: v.id,
    // the pass is the job: its id is the job id
    passId: row.isPassVisit ? v.jobId : null,
    bookingId: v.bookingId,
    jobId: v.jobId,
    customerId: v.customerId,
    firstName: row.firstName,
    town: row.town,
    kind: v.kind,
    status: v.status,
    window: v.window,
    amount,
    lineItems,
    payments: (row.payments ?? []).map(paymentJsonOut(seeNotes)),
    preference: v.preference,
    awaitingPick: v.awaitingPick,
    personId: v.personId,
    personName: row.personName,
    // aliases for one season: the same person
    truckId: v.personId,
    truckName: row.personName,
    scheduledOn: v.scheduledOn,
    startTime: v.startTime,
    durationMinutes: v.durationMinutes,
    // the text of the newest note event about the visit (a tech's note too); a signed-in customer never reads them
    notes: newestNoteText(events),
    notDoneReason: v.notDoneReason,
    jobPaymentShares: (row.credit ?? []).map(paymentJsonOut(seeNotes)),
    ...newestPayment([...(row.payments ?? []), ...(row.credit ?? [])], amount),
    stopOrder: v.stopOrder,
    confirmedAt: v.confirmedAt?.toISOString() ?? null,
    completedOn: v.completedOn,
    chargedAt,
    exception: v.exception ?? null,
    jobberRequestUrl: v.jobberJobUrl,
    lat: row.lat,
    lng: row.lng,
    ...(seeNotes ? { address: row.address } : {}),
    // events are staff's: a signed-in customer reading their own pass never gets them
    ...(staff ? { events } : {}),
    property: yardOut(ctx, row.yard),
  }
}

export async function loadVisit(ctx: Ctx, id: string): Promise<VisitJoined> {
  const [row] = await visitsQuery(ctx.db).where(and(eq(s.visit.id, id), eq(s.visit.organizationId, ctx.organizationId)))
  if (!row) throw notFound("Visit")
  return (await withJobCredit(ctx.db, ctx.organizationId, [row]))[0]!
}
