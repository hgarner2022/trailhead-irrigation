import "server-only"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import type { Ctx } from "../../core/context"
import { notFound } from "../../core/errors"
import { canSeeContact } from "../shared"
import type { VisitOutType } from "./schemas"

export const visitSelect = {
  visit: s.visit,
  firstName: s.customer.firstName,
  town: s.property.town,
  lat: s.property.lat,
  lng: s.property.lng,
  address: s.property.address,
}

/** Visits with the customer's first name and the property's town and point. Add `.where(...)` in the caller. */
export const visitsQuery = (db: Database) =>
  db.select(visitSelect).from(s.visit).innerJoin(s.customer, eq(s.customer.id, s.visit.customerId)).innerJoin(s.property, eq(s.property.id, s.visit.propertyId))

export type VisitJoined = Awaited<ReturnType<ReturnType<typeof visitsQuery>["limit"]>>[number]

export function visitOut(ctx: Ctx, row: VisitJoined): VisitOutType {
  const v = row.visit
  return {
    id: v.id,
    passId: v.passId,
    bookingId: v.bookingId,
    customerId: v.customerId,
    firstName: row.firstName,
    town: row.town,
    kind: v.kind,
    status: v.status,
    window: v.window,
    amount: v.amount,
    preference: v.preference,
    awaitingPick: v.awaitingPick,
    truckId: v.truckId,
    scheduledOn: v.scheduledOn,
    startTime: v.startTime,
    durationMinutes: v.durationMinutes,
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
