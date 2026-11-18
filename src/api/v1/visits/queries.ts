import "server-only"
import { and, eq, sql } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import type { Ctx } from "../../core/context"
import { notFound } from "../../core/errors"
import { jobTotal } from "@/lib/jobs/lines"
import { isPaid } from "@/lib/money/words"
import { canSeeContact } from "../shared"
import { yardOut } from "../customers/handlers"
import type { PaymentOutType } from "../payments/schemas"
import type { VisitOutType } from "./schemas"

/** The job's lines as the database hands them: one JSON array per visit, oldest first. */
interface LineJson { id: string; name: string; description: string | null; quantity: number; unit_price: number; taxable: boolean; cancelled_at: string | null; visit_id: string | null }

/** A payment row as the database hands it inside JSON. */
interface PaymentJson { id: string; job_id: string | null; visit_id: string | null; customer_id: string | null; amount: number; method: PaymentOutType["method"]; reference: string | null; status: PaymentOutType["status"]; paid_on: string | null; receipt_url: string | null; refunds_payment_id: string | null; created_at: string }

export const visitSelect = {
  visit: s.visit,
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

export type VisitJoined = Awaited<ReturnType<ReturnType<typeof visitsQuery>["limit"]>>[number]

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

export function visitOut(ctx: Ctx, row: VisitJoined): VisitOutType {
  const v = row.visit
  const lineItems = (row.lines ?? []).map((l) => ({
    id: l.id, name: l.name, description: l.description, quantity: l.quantity, unitPrice: l.unit_price, taxable: l.taxable,
    cancelledAt: l.cancelled_at ? isoOf(l.cancelled_at) : null, visitId: l.visit_id,
  }))
  // The visit's own line is what it costs (nothing once cancelled); only a visit with no line of its own keeps the legacy amount.
  const own = lineItems.filter((l) => l.visitId === v.id)
  const amount = own.length ? jobTotal(own.map((l) => ({ ...l, cancelledAt: l.cancelledAt ? new Date(l.cancelledAt) : null }))) : v.amount
  const seeNotes = canSeeContact(ctx)
  return {
    id: v.id,
    passId: v.passId,
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
    payments: (row.payments ?? []).map((c) => ({
      id: c.id, jobId: c.job_id, visitId: c.visit_id, customerId: c.customer_id, amount: c.amount, method: c.method, reference: seeNotes ? c.reference : null, status: c.status,
      paidOn: c.paid_on, receiptUrl: seeNotes ? c.receipt_url : null, refundsPaymentId: c.refunds_payment_id, createdAt: isoOf(c.created_at),
    })),
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
    notes: v.notes,
    notDoneReason: v.notDoneReason,
    ...newestPayment(row.payments ?? [], amount),
    stopOrder: v.stopOrder,
    confirmedAt: v.confirmedAt?.toISOString() ?? null,
    completedOn: v.completedOn,
    chargedAt: v.chargedAt?.toISOString() ?? null,
    exception: v.exception ?? null,
    jobberRequestUrl: v.jobberJobUrl,
    lat: row.lat,
    lng: row.lng,
    ...(seeNotes ? { address: row.address } : {}),
    property: yardOut(ctx, row.yard),
  }
}

export async function loadVisit(ctx: Ctx, id: string): Promise<VisitJoined> {
  const [row] = await visitsQuery(ctx.db).where(and(eq(s.visit.id, id), eq(s.visit.organizationId, ctx.organizationId)))
  if (!row) throw notFound("Visit")
  return row
}
