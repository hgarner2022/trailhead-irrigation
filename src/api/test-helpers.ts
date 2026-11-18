// Test helper (no server-only: tests import it): a seeded in-memory organization and the principals the handler tests call as.
import { vi } from "vitest"
import { and, asc, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import { seed } from "@/db/seed"
import { testDb, type TestDb } from "@/db/test-db"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import type { ApiKeyPrincipal, PersonPrincipal, Principal } from "@/lib/auth/types"
import { makeCtx } from "./core/context"

export const ORG = (snapshot as AdminData).organizationId
export const OWNER_EMAIL = "owner@example.com"

/** A fresh database with the organization, trucks, areas, services, the fixture passes and the Jobber mirror. */
export async function apiDb(): Promise<TestDb> {
  vi.stubEnv("API_KEY_PEPPER", "test-pepper")
  const db = await testDb()
  await seed(db, snapshot as AdminData, { organizationId: ORG, admins: [OWNER_EMAIL], passes: true, mirror: true })
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

/** The lines of a pass's job. */
export async function linesOfPass(db: TestDb, passId: string) {
  const [pass] = await db.select({ jobId: s.seasonPass.jobId }).from(s.seasonPass).where(eq(s.seasonPass.id, passId))
  return linesOfJob(db, pass!.jobId)
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
