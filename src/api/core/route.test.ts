// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { z } from "zod"
import type { TestDb } from "@/db/test-db"
import { createApiKey } from "@/lib/auth/api-key"
import { apiDb, owner, ORG, OWNER_EMAIL } from "../test-helpers"
import { defineHandler } from "./handler"
import { route } from "./route"

let db: TestDb
let readSecret: string
let writeSecret: string
beforeAll(async () => {
  db = await apiDb()
  readSecret = (await createApiKey(db, ORG, OWNER_EMAIL, { name: "r", scopes: ["read"] })).key
  writeSecret = (await createApiKey(db, ORG, OWNER_EMAIL, { name: "w", scopes: ["read", "write"] })).key
})
afterAll(() => db.close())

let count = 0
const handler = defineHandler({
  name: "test.thing", method: "POST", path: "/things/{id}", scope: "write", status: 201, summary: "Makes a thing",
  input: z.object({ id: z.string(), size: z.number() }),
  output: z.object({ id: z.string(), size: z.number(), count: z.number() }),
  async run(_ctx, input) { return { ...input, count: ++count } },
})
const call = route(handler, { database: () => db, getSession: async () => null })
const post = (body: string, headers: Record<string, string> = {}) =>
  new Request("https://x.test/api/v1/things/a", { method: "POST", body, headers: { "content-type": "application/json", ...headers } })
const params = { params: Promise.resolve({ id: "t1" }) }

describe("route", () => {
  it("answers 401 without a key and 403 with a read key", async () => {
    expect((await call(post("{}"), params)).status).toBe(401)
    const res = await call(post("{}", { authorization: `Bearer ${readSecret}` }), params)
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ error: { code: "forbidden" } })
  })
  it("merges the path parameter into the input, sets the status and the request id", async () => {
    const res = await call(post('{"size":3}', { authorization: `Bearer ${writeSecret}`, "x-request-id": "req-1" }), params)
    expect(res.status).toBe(201)
    expect(res.headers.get("x-request-id")).toBe("req-1")
    expect(await res.json()).toMatchObject({ id: "t1", size: 3 })
  })
  it("answers 400 with the one error shape for bad JSON and bad input", async () => {
    const auth = { authorization: `Bearer ${writeSecret}` }
    expect(await (await call(post("not json", auth), params)).json()).toMatchObject({ error: { code: "invalid" } })
    const res = await call(post('{"size":"big"}', auth), params)
    expect(res.status).toBe(400)
    expect((await res.json()).error.issues[0].path).toBe("size")
  })
  it("replays an Idempotency-Key and answers 409 for a different body", async () => {
    const headers = { authorization: `Bearer ${writeSecret}`, "idempotency-key": "route-1" }
    const first = await (await call(post('{"size":5}', headers), params)).json()
    const again = await (await call(post('{"size":5}', headers), params)).json()
    expect(again).toEqual(first)
    expect((await call(post('{"size":6}', headers), params)).status).toBe(409)
  })
  it("accepts a signed-in person", async () => {
    const withSession = route(handler, { database: () => db, getSession: async () => owner })
    expect((await withSession(post('{"size":1}'), params)).status).toBe(201)
  })
})
