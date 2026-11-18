import { readAppUrl } from "@/lib/env"
import { aboutOfLegacy, eventKindOfLegacy, type EventKind } from "@/lib/events/kinds"
import { recordEvent, whoOf } from "@/lib/events/record"
import { passInspection, passPreferences, passStatus } from "@/lib/pass/facts"
import { resolvePassJob } from "@/lib/pass/server/resolve"
import { visitCalendarUrl } from "@/lib/messaging/tokens"
import "server-only"
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Ctx } from "../../core/context"
import { notFound } from "../../core/errors"
import { assertOwnsCustomer, canSeeContact, today } from "../shared"
import { consentOut, latestConsent } from "../customers/handlers"
import { visitOut, visitsQuery, withJobCredit } from "../visits/queries"

/** A pass is a job with a season: its id is the job's, its number, season and sold day are the job's own columns, its zones the property's. */
export const passSelect = {
  pass: { id: s.job.id, organizationId: s.job.organizationId, customerId: s.job.customerId, propertyId: s.job.propertyId, createdAt: s.job.createdAt },
  job: { passNumber: s.job.passNumber, season: s.job.season, soldOn: s.job.soldOn, cancelledAt: s.job.cancelledAt },
  firstName: s.customer.firstName,
  lastName: s.customer.lastName,
  email: s.customer.email,
  phone: s.customer.phone,
  // The card on file is the customer's.
  card: { paymentMethodId: s.customer.stripePaymentMethodId, brand: s.customer.cardBrand, last4: s.customer.cardLast4, expires: s.customer.cardExpires, failedAt: s.customer.cardFailedAt },
  town: s.property.town,
  address: s.property.address,
  yard: s.property,
}

export const passesQuery = (ctx: Ctx) =>
  ctx.db
    .select(passSelect)
    .from(s.job)
    .innerJoin(s.customer, eq(s.customer.id, s.job.customerId))
    .innerJoin(s.property, eq(s.property.id, s.job.propertyId))

/** Only a job with a season is a Season Pass, and only the organization's: every `passesQuery` where starts with this. */
export const passScope = (ctx: Ctx) => and(isNotNull(s.job.season), eq(s.job.organizationId, ctx.organizationId))

export type PassJoined = Awaited<ReturnType<ReturnType<typeof passesQuery>["limit"]>>[number]

/** What a pass is, read from its job, its visits and its lines (`src/lib/pass/facts.ts`). */
export type PassFacts = { status: ReturnType<typeof passStatus>; inspection: boolean; turnOnPreference: "earlier" | "recommended" | "later"; blowoutPreference: "earlier" | "recommended" | "later"; cancelledAt: Date | null }
export type PassRow = PassJoined & { facts: PassFacts }

/** The facts of each row's pass, from one load of the visits and one of the lines of the rows' jobs. */
export async function withPassFacts(ctx: Ctx, rows: PassJoined[]): Promise<PassRow[]> {
  if (rows.length === 0) return []
  const jobIds = rows.map((r) => r.pass.id)
  const visits = await ctx.db.select({ jobId: s.visit.jobId, kind: s.visit.kind, status: s.visit.status, completedOn: s.visit.completedOn, preference: s.visit.preference }).from(s.visit).where(inArray(s.visit.jobId, jobIds))
  const lines = await ctx.db.select({ jobId: s.lineItem.jobId, name: s.lineItem.name, serviceId: s.lineItem.serviceId, cancelledAt: s.lineItem.cancelledAt }).from(s.lineItem).where(inArray(s.lineItem.jobId, jobIds))
  const day = today(ctx)
  return rows.map((row) => {
    const mine = visits.filter((v) => v.jobId === row.pass.id)
    return {
      ...row,
      facts: {
        status: passStatus(row.job, day),
        inspection: passInspection(lines.filter((l) => l.jobId === row.pass.id)),
        ...passPreferences(mine),
        cancelledAt: row.job.cancelledAt,
      },
    }
  })
}

export function passOut(ctx: Ctx, row: PassRow) {
  const p = row.pass
  return {
    id: p.id,
    number: row.job.passNumber ?? "",
    season: row.job.season ?? 0,
    customerId: p.customerId,
    propertyId: p.propertyId,
    firstName: row.firstName,
    town: row.town,
    zones: row.yard.zones ?? 0,
    inspection: row.facts.inspection,
    status: row.facts.status,
    turnOnPreference: row.facts.turnOnPreference,
    blowoutPreference: row.facts.blowoutPreference,
    needsCustomerHome: row.yard.mustBeHome,
    ...(canSeeContact(ctx) ? { accessNote: row.yard.accessNote } : {}),
    // Only a card Stripe holds is a card: a last four with no payment method reads as no card, so Done asks how it was paid.
    cardBrand: row.card.paymentMethodId ? row.card.brand : null,
    cardLast4: row.card.paymentMethodId ? row.card.last4 : null,
    cardExpires: row.card.paymentMethodId ? row.card.expires : null,
    cardFailedAt: row.card.failedAt?.toISOString() ?? null,
    cancelledAt: row.facts.cancelledAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  }
}

/** A pass of the organization, by its job id or by the old pass id it had before the move (`resolvePassJob`); a customer may load only their own. */
export async function loadPass(ctx: Ctx, id: string): Promise<PassRow> {
  const job = await resolvePassJob(ctx.db, ctx.organizationId, id)
  if (!job) throw notFound("Pass")
  const [found] = await passesQuery(ctx).where(and(passScope(ctx), eq(s.job.id, job.id)))
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
  const visits = await withJobCredit(ctx.db, ctx.organizationId, await visitsQuery(ctx.db).where(eq(s.visit.jobId, row.pass.id)).orderBy(sql`case ${s.visit.kind} when 'turn-on' then 1 when 'inspection' then 2 when 'blowout' then 3 else 4 end`, asc(s.visit.createdAt), asc(s.visit.id)))
  const charges = await ctx.db.select().from(s.charge).where(and(eq(s.charge.organizationId, ctx.organizationId), eq(s.charge.jobId, row.pass.id))).orderBy(desc(s.charge.createdAt))
  const consent = await latestConsent(ctx.db, row.pass.customerId)
  const contact = canSeeContact(ctx)
  const out = visits.map((v) => ({ ...visitOut(ctx, v), calendarUrl: calendarLink(v.visit) }))
  return {
    ...passOut(ctx, row),
    visits: out,
    charges: charges.filter((c): c is typeof c & { visitId: string } => c.visitId !== null).map((c) => ({ id: c.id, visitId: c.visitId, attempt: c.attempt, amount: c.amount, status: c.status, failureMessage: c.failureMessage, createdAt: c.createdAt.toISOString() })),
    consent: consent ? consentOut(consent) : null,
    // the pass's price is its visits' lines, the ones not canceled
    price: out.filter((v) => v.status !== "cancelled").reduce((sum, v) => sum + v.amount, 0),
    ...(contact
      ? { customer: { id: row.pass.customerId, firstName: row.firstName, lastName: row.lastName, email: row.email, phone: row.phone }, address: row.address }
      : {}),
  }
}

/**
 * What changed, by whom: writes the `event` row (the kind translated by `LEGACY_EVENT_KIND`, about the visit, the job or the
 * customer, with `jobId` and `visitId` filled) and nothing else. `jobId` is the job the change is about; a change that gives only
 * a visit takes that visit's job.
 */
export async function recordChange(ctx: Ctx, change: { customerId: string; jobId?: string | null; visitId?: string; kind: string; detail?: Record<string, unknown>; eventKind?: EventKind }) {
  const jobId = change.jobId ?? (await jobOfVisit(ctx, change.visitId))
  // `eventKind` names the event when the old kind cannot (a picked day is `visit.scheduled` the first time, `visit.moved` after).
  const kind = change.eventKind ?? eventKindOfLegacy(change.kind)
  const about = aboutOfLegacy(kind, { visitId: change.visitId, jobId })
  await recordEvent(ctx.db, {
    organizationId: ctx.organizationId,
    about,
    aboutId: about === "visit" ? change.visitId! : about === "job" ? jobId! : change.customerId,
    customerId: change.customerId,
    jobId,
    visitId: change.visitId ?? null,
    kind,
    detail: change.detail ?? {},
    who: whoOf(ctx),
    at: ctx.now,
  })
}

/** The job a visit belongs to (a change about a one-off gives its visit and no job). */
async function jobOfVisit(ctx: Ctx, visitId?: string): Promise<string | null> {
  if (!visitId) return null
  const [visit] = await ctx.db.select({ jobId: s.visit.jobId }).from(s.visit).where(and(eq(s.visit.id, visitId), eq(s.visit.organizationId, ctx.organizationId)))
  return visit?.jobId ?? null
}
