import "server-only"
import { and, asc, desc, eq, sql } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Ctx } from "../../core/context"
import { notFound } from "../../core/errors"
import { assertOwnsCustomer, canSeeContact } from "../shared"
import { consentOut, latestConsent } from "../customers/handlers"
import { visitOut, visitsQuery } from "../visits/queries"

export const passSelect = {
  pass: s.seasonPass,
  firstName: s.customer.firstName,
  lastName: s.customer.lastName,
  email: s.customer.email,
  phone: s.customer.phone,
  town: s.property.town,
  address: s.property.address,
}

export const passesQuery = (ctx: Ctx) =>
  ctx.db
    .select(passSelect)
    .from(s.seasonPass)
    .innerJoin(s.customer, eq(s.customer.id, s.seasonPass.customerId))
    .innerJoin(s.property, eq(s.property.id, s.seasonPass.propertyId))

export type PassJoined = Awaited<ReturnType<ReturnType<typeof passesQuery>["limit"]>>[number]

export function passOut(ctx: Ctx, row: PassJoined) {
  const p = row.pass
  return {
    id: p.id,
    number: p.number,
    season: p.season,
    customerId: p.customerId,
    propertyId: p.propertyId,
    firstName: row.firstName,
    town: row.town,
    zones: p.zones,
    inspection: p.inspection,
    status: p.status,
    turnOnPreference: p.turnOnPreference,
    blowoutPreference: p.blowoutPreference,
    needsCustomerHome: p.needsCustomerHome,
    ...(canSeeContact(ctx) ? { accessNote: p.accessNote } : {}),
    cardBrand: p.cardBrand,
    cardLast4: p.cardLast4,
    cardExpires: p.cardExpires,
    cardFailedAt: p.cardFailedAt?.toISOString() ?? null,
    cancelledAt: p.cancelledAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  }
}

/** A pass of the organization; a customer may load only their own. */
export async function loadPass(ctx: Ctx, id: string): Promise<PassJoined> {
  const [row] = await passesQuery(ctx).where(and(eq(s.seasonPass.id, id), eq(s.seasonPass.organizationId, ctx.organizationId)))
  if (!row) throw notFound("Pass")
  assertOwnsCustomer(ctx, row.pass.customerId)
  return row
}

export async function passDetail(ctx: Ctx, row: PassJoined) {
  const visits = await visitsQuery(ctx.db).where(eq(s.visit.passId, row.pass.id)).orderBy(sql`case ${s.visit.kind} when 'turn-on' then 1 when 'inspection' then 2 when 'blowout' then 3 else 4 end`, asc(s.visit.createdAt), asc(s.visit.id))
  const charges = await ctx.db.select().from(s.charge).where(eq(s.charge.passId, row.pass.id)).orderBy(desc(s.charge.createdAt))
  const consent = await latestConsent(ctx.db, row.pass.customerId)
  const contact = canSeeContact(ctx)
  return {
    ...passOut(ctx, row),
    visits: visits.map((v) => visitOut(ctx, v)),
    charges: charges.map((c) => ({ id: c.id, visitId: c.visitId, attempt: c.attempt, amount: c.amount, status: c.status, failureMessage: c.failureMessage, createdAt: c.createdAt.toISOString() })),
    consent: consent ? consentOut(consent) : null,
    price: visits.filter((v) => v.visit.status !== "cancelled").reduce((sum, v) => sum + v.visit.amount, 0),
    ...(contact
      ? { customer: { id: row.pass.customerId, firstName: row.firstName, lastName: row.lastName, email: row.email, phone: row.phone }, address: row.address }
      : {}),
  }
}

/** A row in `pass_change`: what changed, by whom. */
export async function recordChange(ctx: Ctx, change: { customerId: string; passId?: string | null; visitId?: string; kind: string; detail?: Record<string, unknown> }) {
  const by = ctx.principal.kind === "person" ? ctx.principal.email : `${ctx.principal.kind}:${ctx.principal.id}`
  await ctx.db.insert(s.passChange).values({ organizationId: ctx.organizationId, byPrincipal: by, at: ctx.now, detail: {}, ...change })
}
