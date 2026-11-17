import { readAppUrl } from "@/lib/env"
import { passInspection, passPreferences, passStatus } from "@/lib/pass/facts"
import { visitCalendarUrl } from "@/lib/messaging/tokens"
import "server-only"
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Ctx } from "../../core/context"
import { notFound } from "../../core/errors"
import { assertOwnsCustomer, canSeeContact, today } from "../shared"
import { consentOut, latestConsent } from "../customers/handlers"
import { visitOut, visitsQuery } from "../visits/queries"

export const passSelect = {
  pass: s.seasonPass,
  // The pass number and season are the job's; `season_pass` holds them only as an alias until step 6.
  job: { passNumber: s.job.passNumber, season: s.job.season, status: s.job.status, cancelledAt: s.job.cancelledAt },
  firstName: s.customer.firstName,
  lastName: s.customer.lastName,
  email: s.customer.email,
  phone: s.customer.phone,
  // The card on file is the customer's.
  card: { brand: s.customer.cardBrand, last4: s.customer.cardLast4, expires: s.customer.cardExpires, failedAt: s.customer.cardFailedAt },
  town: s.property.town,
  address: s.property.address,
  yard: s.property,
}

export const passesQuery = (ctx: Ctx) =>
  ctx.db
    .select(passSelect)
    .from(s.seasonPass)
    .innerJoin(s.job, eq(s.job.id, s.seasonPass.jobId))
    .innerJoin(s.customer, eq(s.customer.id, s.seasonPass.customerId))
    .innerJoin(s.property, eq(s.property.id, s.seasonPass.propertyId))

export type PassJoined = Awaited<ReturnType<ReturnType<typeof passesQuery>["limit"]>>[number]

/** What a pass is, read from its job, its visits and its lines (`src/lib/pass/facts.ts`), never from the `season_pass` alias columns. */
export type PassFacts = { status: ReturnType<typeof passStatus>; inspection: boolean; turnOnPreference: "earlier" | "recommended" | "later"; blowoutPreference: "earlier" | "recommended" | "later"; cancelledAt: Date | null }
export type PassRow = PassJoined & { facts: PassFacts }

/** The facts of each row's pass, from one load of the visits and one of the lines of the rows' jobs. */
export async function withPassFacts(ctx: Ctx, rows: PassJoined[]): Promise<PassRow[]> {
  if (rows.length === 0) return []
  const jobIds = rows.map((r) => r.pass.jobId)
  const visits = await ctx.db.select({ jobId: s.visit.jobId, kind: s.visit.kind, status: s.visit.status, completedOn: s.visit.completedOn, preference: s.visit.preference }).from(s.visit).where(inArray(s.visit.jobId, jobIds))
  const lines = await ctx.db.select({ jobId: s.lineItem.jobId, name: s.lineItem.name, serviceId: s.lineItem.serviceId, cancelledAt: s.lineItem.cancelledAt }).from(s.lineItem).where(inArray(s.lineItem.jobId, jobIds))
  const day = today(ctx)
  return rows.map((row) => {
    const mine = visits.filter((v) => v.jobId === row.pass.jobId)
    return {
      ...row,
      facts: {
        status: passStatus(row.job, mine, day),
        inspection: passInspection(lines.filter((l) => l.jobId === row.pass.jobId)),
        ...passPreferences(mine),
        cancelledAt: row.job.cancelledAt,
      },
    }
  })
}

export function passOut(ctx: Ctx, row: PassRow) {
  const p = row.pass
  // The yard lives on the property; only the zones fall back to the pass (a property with none yet).
  return {
    id: p.id,
    number: row.job.passNumber!,
    season: row.job.season!,
    customerId: p.customerId,
    propertyId: p.propertyId,
    firstName: row.firstName,
    town: row.town,
    zones: row.yard.zones ?? p.zones,
    inspection: row.facts.inspection,
    status: row.facts.status,
    turnOnPreference: row.facts.turnOnPreference,
    blowoutPreference: row.facts.blowoutPreference,
    needsCustomerHome: row.yard.mustBeHome,
    ...(canSeeContact(ctx) ? { accessNote: row.yard.accessNote } : {}),
    cardBrand: row.card.brand,
    cardLast4: row.card.last4,
    cardExpires: row.card.expires,
    cardFailedAt: row.card.failedAt?.toISOString() ?? null,
    cancelledAt: row.facts.cancelledAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  }
}

/** A pass of the organization; a customer may load only their own. */
export async function loadPass(ctx: Ctx, id: string): Promise<PassRow> {
  const [found] = await passesQuery(ctx).where(and(eq(s.seasonPass.id, id), eq(s.seasonPass.organizationId, ctx.organizationId)))
  if (!found) throw notFound("Pass")
  assertOwnsCustomer(ctx, found.pass.customerId)
  const [row] = await withPassFacts(ctx, [found])
  return row!
}

/** The signed .ics link for a visit with a day; null when it has none or the signing key or site address is not set (tests, Storybook). */
function calendarLink(visit: { id: string; scheduledOn: string | null }): string | null {
  if (!visit.scheduledOn) return null
  try {
    return visitCalendarUrl(readAppUrl(), visit.id)
  } catch {
    return null
  }
}

export async function passDetail(ctx: Ctx, row: PassRow) {
  const visits = await visitsQuery(ctx.db).where(eq(s.visit.passId, row.pass.id)).orderBy(sql`case ${s.visit.kind} when 'turn-on' then 1 when 'inspection' then 2 when 'blowout' then 3 else 4 end`, asc(s.visit.createdAt), asc(s.visit.id))
  const charges = await ctx.db.select().from(s.charge).where(eq(s.charge.passId, row.pass.id)).orderBy(desc(s.charge.createdAt))
  const consent = await latestConsent(ctx.db, row.pass.customerId)
  const contact = canSeeContact(ctx)
  return {
    ...passOut(ctx, row),
    visits: visits.map((v) => ({ ...visitOut(ctx, v), calendarUrl: calendarLink(v.visit) })),
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
