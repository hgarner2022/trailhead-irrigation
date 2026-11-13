// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { z } from "zod"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ctxFor, owner, readKey, writeKey, ORG } from "../test-helpers"
import { callApi, RATE_LIMIT_PER_MINUTE } from "./call"
import { ApiError } from "./errors"
import { defineHandler } from "./handler"

let db: TestDb
let runs = 0
beforeAll(async () => {
  db = await apiDb()
})
afterAll(() => db.close())

const read = defineHandler({
  name: "test.read", method: "GET", path: "/test", scope: "read", summary: "Reads",
  input: z.object({ n: z.coerce.number().int() }),
  output: z.object({ n: z.number() }),
  async run(_ctx, input) { return { n: input.n, secret: "leak" } as { n: number } },
})
const write = defineHandler({
  name: "test.write", method: "POST", path: "/test", scope: "write", summary: "Writes",
  input: z.object({ n: z.number() }),
  output: z.object({ n: z.number(), run: z.number() }),
  async run(_ctx, input) { return { n: input.n, run: ++runs } },
})
const self = defineHandler({
  name: "test.self", method: "GET", path: "/self", scope: "write", customerSelf: true, summary: "Self",
  input: z.object({}), output: z.object({ ok: z.boolean() }),
  async run() { return { ok: true } },
})

describe("callApi", () => {
  it("enforces the scope: a read key cannot call a write handler", async () => {
    await expect(callApi(ctxFor(db, readKey), write, { n: 1 })).rejects.toMatchObject({ code: "forbidden", status: 403 })
    await expect(callApi(ctxFor(db, writeKey), write, { n: 1 })).resolves.toMatchObject({ n: 1 })
  })
  it("lets a customer call only the handlers marked customerSelf", async () => {
    const customer = { kind: "person" as const, id: "u", email: "a@b.c", organizationId: ORG, type: "customer" as const, customerId: "c1" }
    await expect(callApi(ctxFor(db, customer), self, {})).resolves.toEqual({ ok: true })
    await expect(callApi(ctxFor(db, customer), read, { n: 1 })).rejects.toMatchObject({ code: "forbidden" })
  })
  it("rejects bad input with the issues", async () => {
    const error = await callApi(ctxFor(db, owner), read, { n: "x" }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ code: "invalid", status: 400 })
    expect((error as ApiError).issues?.[0]?.path).toBe("n")
  })
  it("never lets a field the output schema does not name out", async () => {
    expect(await callApi(ctxFor(db, owner), read, { n: "4" })).toEqual({ n: 4 })
  })
  it("logs one api_call row per call, including refusals", async () => {
    const before = (await db.select().from(s.apiCall)).length
    await callApi(ctxFor(db, owner), read, { n: 1 })
    await callApi(ctxFor(db, readKey), write, { n: 1 }).catch(() => undefined)
    const rows = (await db.select().from(s.apiCall)).slice(before)
    expect(rows.map((r) => r.status)).toEqual([200, 403])
    expect(rows[0]).toMatchObject({ principalKind: "person", principalId: owner.id, path: "/test" })
  })
  it("replays a write with the same Idempotency-Key and refuses a different request on it", async () => {
    const ctx = { ...ctxFor(db, writeKey), idempotencyKey: "key-1" }
    const first = await callApi(ctx, write, { n: 7 })
    const second = await callApi(ctx, write, { n: 7 })
    expect(second).toEqual(first)
    expect(runs).toBe(2)
    await expect(callApi(ctx, write, { n: 8 })).rejects.toMatchObject({ code: "conflict", status: 409 })
  })
  it("releases the key when the run fails so it can be retried", async () => {
    const ctx = { ...ctxFor(db, writeKey), idempotencyKey: "key-2" }
    await expect(callApi(ctx, write, { n: "bad" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctx, write, { n: 2 })).resolves.toMatchObject({ n: 2 })
  })
  it("limits a key to 120 requests a minute", async () => {
    const key = { kind: "api-key" as const, id: "busy", organizationId: ORG, scopes: ["read"] }
    await db.insert(s.apiCall).values(
      Array.from({ length: RATE_LIMIT_PER_MINUTE }, () => ({ organizationId: ORG, principalKind: "api-key" as const, principalId: "busy", method: "GET", path: "/x", status: 200 })),
    )
    await expect(callApi(ctxFor(db, key), read, { n: 1 })).rejects.toMatchObject({ code: "rate_limited", status: 429 })
    expect(await callApi(ctxFor(db, readKey), read, { n: 1 })).toEqual({ n: 1 })
  })
})
