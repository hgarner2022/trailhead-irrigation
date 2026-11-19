// Test helper (no server-only: tests import it): a seeded in-memory organization and the principals the handler tests call as.
import { vi } from "vitest"
import { readFileSync } from "node:fs"
import { and, asc, eq, isNotNull, or, sql } from "drizzle-orm"
import * as s from "@/db/schema"
import { seed } from "@/db/seed"
import { testDb, type TestDb } from "@/db/test-db"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import type { ApiKeyPrincipal, PersonPrincipal, Principal } from "@/lib/auth/types"
import { passInspection, passPreferences, passStatus } from "@/lib/pass/facts"
import { makePassRows } from "@/lib/pass/server/rows"
import type { PassRecord } from "@/lib/pass/server/record"
import { passVisits } from "@/lib/season-pass"
import { makeCtx } from "./core/context"

export const ORG = (snapshot as AdminData).organizationId
export const OWNER_EMAIL = "owner@example.com"

/** A fresh database with the organization, trucks, areas, services, the fixture passes and the Jobber mirror. */
export async function apiDb(): Promise<TestDb> {
  vi.stubEnv("API_KEY_PEPPER", "test-pepper")
  const db = await testDb()
  await seed(db, snapshot as AdminData, { organizationId: ORG, admins: [OWNER_EMAIL], passes: true, mirror: true })
  // Production's services got their bookable dates from the windows in migration 0024; the seed inserts them after the migrations ran, so the fixture gets the same dates.
  await db.execute(sql.raw(readFileSync(new URL("../../drizzle/0024_backfill_bookable_from_windows.sql", import.meta.url), "utf8")))
  return db
}

export const owner: PersonPrincipal = { kind: "person", id: "u-owner", email: OWNER_EMAIL, organizationId: ORG, type: "admin", role: "owner" }
export const tech: PersonPrincipal = { ...owner, id: "u-tech", email: "tech@example.com", role: "tech" }
export const customerPerson = (customerId: string, email = "andrea@example.com"): PersonPrincipal => ({
  kind: "person", id: `u-${customerId}`, email, organizationId: ORG, type: "customer", customerId,
})
export const key = (...scopes: string[]): ApiKeyPrincipal => ({ kind: "api-key", id: `k-${scopes.join("-") || "none"}`, organizationId: ORG, scopes })
export const readKey = key("read")
export const writeKey = key("read", "write")
export const adminKey = key("read", "write", "admin")

export const ctxFor = (db: TestDb, principal: Principal, now = "2027-04-20T15:00:00Z") => makeCtx(db, principal, { now: new Date(now) })

const KIND_ORDER: Record<string, number> = { "turn-on": 0, inspection: 1, blowout: 2 }

/** A job's lines, oldest first and pass visits in season order, each with its service's key and its visit's kind and status. */
export async function linesOfJob(db: TestDb, jobId: string) {
  const rows = await db
    .select({ line: s.lineItem, serviceKey: s.service.key, visitKind: s.visit.kind, visitStatus: s.visit.status })
    .from(s.lineItem)
    .leftJoin(s.service, eq(s.service.id, s.lineItem.serviceId))
    .leftJoin(s.visit, eq(s.visit.id, s.lineItem.visitId))
    .where(eq(s.lineItem.jobId, jobId))
  return rows
    .map((r) => ({ ...r.line, serviceKey: r.serviceKey, visitKind: r.visitKind, visitStatus: r.visitStatus }))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || (KIND_ORDER[a.visitKind ?? ""] ?? 9) - (KIND_ORDER[b.visitKind ?? ""] ?? 9))
}

/** The job a Season Pass is, by its job id or by the old pass id the fixtures were seeded with ("p3"); throws when there is none. */
export async function passJobOf(db: TestDb, passId: string) {
  const rows = await db.select().from(s.job).where(and(isNotNull(s.job.season), or(eq(s.job.id, passId), eq(s.job.legacyPassId, passId))))
  const job = rows.find((j) => j.id === passId) ?? rows[0]
  if (!job) throw new Error(`No pass job for ${passId}`)
  return job
}

/** The job id of a pass, new or old. */
export const jobIdOfPassId = async (db: TestDb, passId: string) => (await passJobOf(db, passId)).id

/** The lines of a pass's job. */
export async function linesOfPass(db: TestDb, passId: string) {
  return linesOfJob(db, await jobIdOfPassId(db, passId))
}

/** A pass as the old `season_pass` row read, assembled from its job, its property, its customer, its visits and its lines (tests only). */
export async function passViewOf(db: TestDb, passId: string, today = "2027-04-20") {
  const job = await passJobOf(db, passId)
  const [property] = await db.select().from(s.property).where(eq(s.property.id, job.propertyId))
  const [customer] = await db.select().from(s.customer).where(eq(s.customer.id, job.customerId))
  const visits = await db.select().from(s.visit).where(eq(s.visit.jobId, job.id))
  const lines = await db.select().from(s.lineItem).where(eq(s.lineItem.jobId, job.id))
  return {
    id: job.id,
    jobId: job.id,
    organizationId: job.organizationId,
    customerId: job.customerId,
    propertyId: job.propertyId,
    number: job.passNumber!,
    season: job.season!,
    status: passStatus(job, today),
    cancelledAt: job.cancelledAt,
    soldOn: job.soldOn,
    createdAt: job.createdAt,
    zones: property!.zones,
    needsCustomerHome: property!.mustBeHome,
    accessNote: property!.accessNote,
    inspection: passInspection(lines),
    ...passPreferences(visits),
    stripePaymentMethodId: customer!.stripePaymentMethodId,
    cardBrand: customer!.cardBrand,
    cardLast4: customer!.cardLast4,
    cardExpires: customer!.cardExpires,
    cardFailedAt: customer!.cardFailedAt,
  }
}

/** Changes what a fixture pass says about itself where that now lives: its status on the job (`sold_on`, `cancelled_at`), the yard on the property, the card on the customer, the timing on its visits. */
export async function setPass(
  db: TestDb,
  passId: string,
  patch: { status?: "pending" | "active" | "cancelled"; needsCustomerHome?: boolean; accessNote?: string | null; zones?: number; season?: number; cardExpires?: string | null; cardLast4?: string | null; stripePaymentMethodId?: string | null; cardFailedAt?: Date | null; turnOnPreference?: "earlier" | "recommended" | "later"; blowoutPreference?: "earlier" | "recommended" | "later"; createdAt?: Date },
) {
  const job = await passJobOf(db, passId)
  const onJob: Partial<typeof s.job.$inferInsert> = {}
  if (patch.status === "pending") Object.assign(onJob, { soldOn: null, cancelledAt: null })
  if (patch.status === "active") Object.assign(onJob, { soldOn: job.soldOn ?? "2027-04-20", cancelledAt: null })
  if (patch.status === "cancelled") Object.assign(onJob, { soldOn: job.soldOn ?? "2027-04-20", cancelledAt: new Date("2027-04-19T12:00:00Z") })
  if (patch.season !== undefined) onJob.season = patch.season
  if (patch.createdAt) onJob.createdAt = patch.createdAt
  if (Object.keys(onJob).length) await db.update(s.job).set(onJob).where(eq(s.job.id, job.id))
  const onProperty: Partial<typeof s.property.$inferInsert> = {}
  if (patch.needsCustomerHome !== undefined) onProperty.mustBeHome = patch.needsCustomerHome
  if (patch.accessNote !== undefined) onProperty.accessNote = patch.accessNote
  if (patch.zones !== undefined) onProperty.zones = patch.zones
  if (Object.keys(onProperty).length) await db.update(s.property).set(onProperty).where(eq(s.property.id, job.propertyId))
  const onCustomer: Partial<typeof s.customer.$inferInsert> = {}
  for (const k of ["cardExpires", "cardLast4", "stripePaymentMethodId", "cardFailedAt"] as const) if (patch[k] !== undefined) (onCustomer as Record<string, unknown>)[k] = patch[k]
  if (Object.keys(onCustomer).length) await db.update(s.customer).set(onCustomer).where(eq(s.customer.id, job.customerId))
  for (const [kind, preference] of [["turn-on", patch.turnOnPreference], ["blowout", patch.blowoutPreference]] as const)
    if (preference) await db.update(s.visit).set({ preference }).where(and(eq(s.visit.jobId, job.id), eq(s.visit.kind, kind)))
}

/**
 * Builds a Season Pass job for a customer the fixtures already hold (the one helper tests use where they once inserted a `season_pass`
 * row): the job with its season, number and sold day, its turn-on and blowout visits (and the inspection when asked) priced per zone,
 * and their lines. `status` says whether it is pending (no sold day), active or canceled.
 */
export async function passFixture(
  db: TestDb,
  over: { customerId: string; propertyId?: string; season?: number; status?: "pending" | "active" | "cancelled"; zones?: number; inspection?: boolean; now?: Date },
): Promise<PassRecord> {
  const [customer] = await db.select().from(s.customer).where(eq(s.customer.id, over.customerId))
  const [property] = over.propertyId
    ? await db.select().from(s.property).where(eq(s.property.id, over.propertyId))
    : await db.select().from(s.property).where(eq(s.property.customerId, over.customerId)).limit(1)
  const now = over.now ?? new Date("2027-04-20T15:00:00Z")
  const record = await makePassRows(db, {
    organizationId: customer!.organizationId, customerId: customer!.id, propertyId: property!.id, season: over.season ?? 2027, onSale: passVisits(over.inspection ?? false),
    zones: over.zones ?? property!.zones ?? 6, inspection: over.inspection ?? false, status: over.status === "pending" ? "pending" : "active", source: "checkout", now,
  })
  if (over.status === "cancelled") await db.update(s.job).set({ cancelledAt: now }).where(eq(s.job.id, record.jobId))
  return record
}

/** The events matching every given column, in the order they were written (tests only; `at` is the handler's fixed test clock, so two events of one call tie on it). */
export async function eventsOf(db: TestDb, where: { kind?: string; about?: string; aboutId?: string; customerId?: string; jobId?: string; visitId?: string }) {
  const filters = [
    where.kind ? eq(s.event.kind, where.kind) : undefined,
    where.about ? eq(s.event.about, where.about as "customer") : undefined,
    where.aboutId ? eq(s.event.aboutId, where.aboutId) : undefined,
    where.customerId ? eq(s.event.customerId, where.customerId) : undefined,
    where.jobId ? eq(s.event.jobId, where.jobId) : undefined,
    where.visitId ? eq(s.event.visitId, where.visitId) : undefined,
  ]
  return db.select().from(s.event).where(and(eq(s.event.organizationId, ORG), ...filters)).orderBy(asc(s.event.createdAt), asc(s.event.id))
}
