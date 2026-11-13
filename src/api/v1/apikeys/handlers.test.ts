// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { principalFromRequest } from "@/lib/auth/principal"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, key, owner, readKey, writeKey, ORG } from "../../test-helpers"
import { apiKeysCreate, apiKeysList, apiKeysRevoke } from "./handlers"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
})
afterAll(() => db.close())

describe("apiKeys", () => {
  it("lets an owner make a key that then authenticates, shown once and never listed with its secret", async () => {
    const made = await callApi(ctxFor(db, owner), apiKeysCreate, { name: "Agent", scopes: ["read", "write"] })
    expect(made.key).toMatch(/^th_live_/)
    const principal = await principalFromRequest(db, new Request("https://x.test", { headers: { authorization: `Bearer ${made.key}` } }), async () => null)
    expect(principal).toMatchObject({ kind: "api-key", id: made.id, organizationId: ORG, scopes: ["read", "write"] })
    const list = await callApi(ctxFor(db, owner), apiKeysList, {})
    expect(JSON.stringify(list)).not.toContain(made.key)
    expect(JSON.stringify(list)).not.toContain("hash")
    expect(list.data[0]).toMatchObject({ id: made.id, name: "Agent", createdBy: "owner@example.com" })
  })
  it("refuses a read or write key and keeps an agent from granting what it lacks", async () => {
    await expect(callApi(ctxFor(db, readKey), apiKeysList, {})).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, writeKey), apiKeysCreate, { name: "x", scopes: ["read"] })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, key("admin")), apiKeysCreate, { name: "x", scopes: ["read"] })).rejects.toMatchObject({ code: "forbidden" })
  })
  it("lets only an owner grant the admin scope", async () => {
    await expect(callApi(ctxFor(db, adminKey), apiKeysCreate, { name: "x", scopes: ["admin"] })).rejects.toThrow(/only an owner/)
    await expect(callApi(ctxFor(db, owner), apiKeysCreate, { name: "boss", scopes: ["admin"] })).resolves.toMatchObject({ key: expect.stringMatching(/^th_live_/) })
  })
  it("rejects an unknown scope and an empty list", async () => {
    await expect(callApi(ctxFor(db, owner), apiKeysCreate, { name: "x", scopes: ["root"] })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, owner), apiKeysCreate, { name: "x", scopes: [] })).rejects.toMatchObject({ code: "invalid" })
  })
  it("revokes a key so it stops authenticating, once", async () => {
    const made = await callApi(ctxFor(db, owner), apiKeysCreate, { name: "Temp", scopes: ["read"] })
    expect(await callApi(ctxFor(db, owner), apiKeysRevoke, { id: made.id })).toEqual({ ok: true })
    const principal = await principalFromRequest(db, new Request("https://x.test", { headers: { authorization: `Bearer ${made.key}` } }), async () => null)
    expect(principal).toBeNull()
    await expect(callApi(ctxFor(db, owner), apiKeysRevoke, { id: made.id })).rejects.toMatchObject({ code: "not_found" })
  })
  it("honours an Idempotency-Key without ever storing the key: a replay is refused", async () => {
    const ctx = { ...ctxFor(db, owner), idempotencyKey: "key-once" }
    const a = await callApi(ctx, apiKeysCreate, { name: "Once", scopes: ["read"] })
    await expect(callApi(ctx, apiKeysCreate, { name: "Once", scopes: ["read"] })).rejects.toMatchObject({ code: "conflict" })
    expect(JSON.stringify(await db.select().from(s.idempotency))).not.toContain(a.key)
    expect((await callApi(ctxFor(db, owner), apiKeysList, {})).data.filter((k) => k.name === "Once")).toHaveLength(1)
  })
})
