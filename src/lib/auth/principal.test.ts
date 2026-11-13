// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { testDb, type TestDb } from "@/db/test-db"
import * as s from "@/db/schema"
import { createApiKey, revokeApiKey } from "./api-key"
import { hasScope, logApiCall, principalFromRequest } from "./principal"
import type { PersonPrincipal } from "./types"
import { ORG, OWNER, seedAuth } from "./test-seed"

let db: TestDb
beforeAll(async () => {
  db = await testDb()
  await seedAuth(db)
})
afterAll(() => db.close())
beforeEach(() => vi.stubEnv("API_KEY_PEPPER", "test-pepper"))

const person = (role: PersonPrincipal["role"], type: PersonPrincipal["type"] = "admin"): PersonPrincipal => ({
  kind: "person", id: "u1", email: OWNER, organizationId: ORG, type, role,
})
const request = (authorization?: string) => new Request("https://x.test/api/v1/passes", { headers: authorization ? { authorization } : {} })

describe("hasScope", () => {
  it("gives an owner and an admin everything and a tech read only", () => {
    for (const scope of ["read", "write", "admin"] as const) {
      expect(hasScope(person("owner"), scope)).toBe(true)
      expect(hasScope(person("admin"), scope)).toBe(true)
    }
    expect(hasScope(person("tech"), "read")).toBe(true)
    expect(hasScope(person("tech"), "write")).toBe(false)
    expect(hasScope(person("tech"), "admin")).toBe(false)
  })
  it("gives a customer and nobody nothing", () => {
    expect(hasScope(person(undefined, "customer"), "read")).toBe(false)
    expect(hasScope(null, "read")).toBe(false)
  })
  it("gives a key exactly what it was given", () => {
    const key = { kind: "api-key" as const, id: "k", organizationId: ORG, scopes: ["read"] }
    expect(hasScope(key, "read")).toBe(true)
    expect(hasScope(key, "write")).toBe(false)
  })
})

describe("principalFromRequest", () => {
  it("reads a key from a bearer header", async () => {
    const { key, id } = await createApiKey(db, ORG, OWNER, { name: "Agent", scopes: ["read"] })
    expect(await principalFromRequest(db, request(`Bearer ${key}`), async () => null)).toMatchObject({ kind: "api-key", id })
  })
  it("refuses a revoked, unknown or malformed bearer without falling back to the session", async () => {
    const session = vi.fn().mockResolvedValue(person("owner"))
    const { key, id } = await createApiKey(db, ORG, OWNER, { name: "Old", scopes: ["read"] })
    await revokeApiKey(db, ORG, id)
    expect(await principalFromRequest(db, request(`Bearer ${key}`), session)).toBeNull()
    expect(await principalFromRequest(db, request("Bearer th_live_nope"), session)).toBeNull()
    expect(await principalFromRequest(db, request("Basic abc"), session)).toBeNull()
    expect(session).not.toHaveBeenCalled()
  })
  it("reads a person from the session when there is no header", async () => {
    expect(await principalFromRequest(db, request(), async () => person("owner"))).toMatchObject({ kind: "person", type: "admin" })
    expect(await principalFromRequest(db, request(), async () => null)).toBeNull()
  })
})

describe("logApiCall", () => {
  it("logs who made the call", async () => {
    await logApiCall(db, { kind: "api-key", id: "k1", organizationId: ORG, scopes: ["read"] }, { method: "GET", path: "/api/v1/passes", status: 200, durationMs: 12 })
    const [row] = await db.select().from(s.apiCall)
    expect(row).toMatchObject({ organizationId: ORG, principalKind: "api-key", principalId: "k1", method: "GET", status: 200 })
  })
})
