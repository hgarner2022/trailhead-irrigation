import "server-only"
import { and, eq, sql } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import type { Ctx } from "../../core/context"
import { notFound } from "../../core/errors"
import { jobTotal } from "@/lib/jobs/lines"
import { canSeeContact } from "../shared"
import type { VisitOutType } from "./schemas"

/** The job's lines as the database hands them: one JSON array per visit, oldest first. */
interface LineJson { id: string; name: string; description: string | null; quantity: number; unit_price: number; taxable: boolean; cancelled_at: string | null; visit_id: string | null }

export const visitSelect = {
  visit: s.visit,
  firstName: s.customer.firstName,
  town: s.property.town,
  lat: s.property.lat,
  lng: s.property.lng,
  address: s.property.address,
  personName: s.person.name,
  // the newest charge attempt on the visit: how it was paid and whether it went through
  chargeMethod: sql<string | null>`(select c.method from charge c where c.visit_id = ${s.visit.id} order by c.attempt desc limit 1)`,
  // what was sold on the visit's job: its lines are the truth for what the visit costs
  lines: sql<LineJson[] | null>`(select json_agg(json_build_object('id', l.id, 'name', l.name, 'description', l.description, 'quantity', l.quantity, 'unit_price', l.unit_price, 'taxable', l.taxable, 'cancelled_at', l.cancelled_at, 'visit_id', l.visit_id) order by l.created_at, l.id) from line_item l where l.job_id = ${s.visit.jobId})`,
  chargeStatus: sql<string | null>`(select c.status from charge c where c.visit_id = ${s.visit.id} order by c.attempt desc limit 1)`,
}

/** Visits with the customer's first name, the property's town and point, and the name of the person assigned. Add `.where(...)` in the caller. */
export const visitsQuery = (db: Database) =>
  db.select(visitSelect).from(s.visit).innerJoin(s.customer, eq(s.customer.id, s.visit.customerId)).innerJoin(s.property, eq(s.property.id, s.visit.propertyId)).leftJoin(s.person, eq(s.person.id, s.visit.personId))

export type VisitJoined = Awaited<ReturnType<ReturnType<typeof visitsQuery>["limit"]>>[number]

/** A timestamp as Postgres prints it inside JSON, as an ISO string (zone-less text is UTC). */
const isoOf = (at: string) => new Date(/(Z|[+-]\d\d(:?\d\d)?)$/.test(at) ? at : `${at}Z`).toISOString()

export function visitOut(ctx: Ctx, row: VisitJoined): VisitOutType {
  const v = row.visit
  const lineItems = (row.lines ?? []).map((l) => ({
    id: l.id, name: l.name, description: l.description, quantity: l.quantity, unitPrice: l.unit_price, taxable: l.taxable,
    cancelledAt: l.cancelled_at ? isoOf(l.cancelled_at) : null, visitId: l.visit_id,
  }))
  // The visit's own line is what it costs (nothing once cancelled); only a visit with no line of its own keeps the legacy amount.
  const own = lineItems.filter((l) => l.visitId === v.id)
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
    amount: own.length ? jobTotal(own.map((l) => ({ ...l, cancelledAt: l.cancelledAt ? new Date(l.cancelledAt) : null }))) : v.amount,
    lineItems,
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
    paidBy: row.chargeMethod ?? null,
    paymentStatus: row.chargeStatus === "succeeded" ? "paid" : row.chargeStatus === "failed" ? "failed" : row.chargeStatus === "pending" ? "pending" : "none",
    stopOrder: v.stopOrder,
    confirmedAt: v.confirmedAt?.toISOString() ?? null,
    completedOn: v.completedOn,
    chargedAt: v.chargedAt?.toISOString() ?? null,
    exception: v.exception ?? null,
    jobberRequestUrl: v.jobberJobUrl,
    lat: row.lat,
    lng: row.lng,
    ...(canSeeContact(ctx) ? { address: row.address } : {}),
  }
}

export async function loadVisit(ctx: Ctx, id: string): Promise<VisitJoined> {
  const [row] = await visitsQuery(ctx.db).where(and(eq(s.visit.id, id), eq(s.visit.organizationId, ctx.organizationId)))
  if (!row) throw notFound("Visit")
  return row
}
