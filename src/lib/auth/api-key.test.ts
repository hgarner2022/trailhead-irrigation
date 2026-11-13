// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import { testDb, type TestDb } from "@/db/test-db"
import * as s from "@/db/schema"
import { checkApiKey, createApiKey, hashApiKey, revokeApiKey } from "./api-key"
import { ORG, OWNER, seedAuth } from "./test-seed"

let db: TestDb
beforeAll(async () => {
  db = await testDb()
  await seedAuth(db)
})
afterAll(() => db.close())
beforeEach(() => vi.stubEnv("API_KEY_PEPPER", "test-pepper"))

describe("API keys", () => {
  it("creates a th_live_ key of 32 base62 characters that checks out", async () => {
    const { key, id, prefix } = await createApiKey(db, ORG, OWNER, { name: "Home", scopes: ["read", "write"] })
    expect(key).toMatch(/^th_live_[0-9A-Za-z]{32}$/)
    expect(prefix).toBe(key.slice(0, 12))
    expect(await checkApiKey(db, key)).toEqual({ kind: "api-key", id, organizationId: ORG, scopes: ["read", "write"] })
  })

  it("never stores the key, only its peppered hash, and touches last_used_at", async () => {
    const { key, id } = await createApiKey(db, ORG, OWNER, { name: "Hash", scopes: ["read"] })
    const [before] = await db.select().from(s.apiKey).where(eq(s.apiKey.id, id))
    expect(JSON.stringify(before)).not.toContain(key.slice(8))
    expect(before!.hash).toBe(hashApiKey(key))
    expect(before!.lastUsedAt).toBeNull()
    await checkApiKey(db, key)
    const [after] = await db.select().from(s.apiKey).where(eq(s.apiKey.id, id))
    expect(after!.lastUsedAt).toBeInstanceOf(Date)
  })

  it("does not check a changed pepper, an unknown key or a non-key", async () => {
    const { key } = await createApiKey(db, ORG, OWNER, { name: "Pepper", scopes: ["read"] })
    expect(await checkApiKey(db, "th_live_" + "x".repeat(32))).toBeNull()
    expect(await checkApiKey(db, "not-a-key")).toBeNull()
    vi.stubEnv("API_KEY_PEPPER", "another")
    expect(await checkApiKey(db, key)).toBeNull()
  })

  it("does not check a revoked key", async () => {
    const { key, id } = await createApiKey(db, ORG, OWNER, { name: "Gone", scopes: ["read"] })
    expect(await revokeApiKey(db, ORG, id)).toBe(true)
    expect(await checkApiKey(db, key)).toBeNull()
    expect(await revokeApiKey(db, ORG, id)).toBe(false)
  })

  it("revokes only inside its own organization", async () => {
    const { id } = await createApiKey(db, ORG, OWNER, { name: "Mine", scopes: ["read"] })
    expect(await revokeApiKey(db, "other-org", id)).toBe(false)
  })

  it("grants the admin scope only when an owner asks", async () => {
    await expect(createApiKey(db, ORG, "a@x.com", { name: "X", scopes: ["admin"], byRole: "admin" })).rejects.toThrow("owner")
    await expect(createApiKey(db, ORG, "a@x.com", { name: "X", scopes: ["admin"] })).rejects.toThrow("owner")
    const { key } = await createApiKey(db, ORG, OWNER, { name: "Root", scopes: ["admin"], byRole: "owner" })
    expect((await checkApiKey(db, key))?.scopes).toEqual(["admin"])
  })

  it("rejects an unknown scope", async () => {
    await expect(createApiKey(db, ORG, OWNER, { name: "X", scopes: ["everything"] })).rejects.toThrow("unknown scope")
  })
})
