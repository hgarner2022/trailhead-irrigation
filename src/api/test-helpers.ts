// Test helper (no server-only: tests import it): a seeded in-memory organization and the principals the handler tests call as.
import { vi } from "vitest"
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
