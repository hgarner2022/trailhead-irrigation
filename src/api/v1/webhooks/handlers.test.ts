// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, readKey, writeKey } from "../../test-helpers"
import { signBody } from "./deliver"
import { webhooksCreate, webhooksDelete, webhooksList, webhooksTest } from "./handlers"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
})
afterAll(() => db.close())

describe("webhooks", () => {
  it("creates an endpoint and returns the secret once, never in the list", async () => {
    const made = await callApi(ctxFor(db, adminKey), webhooksCreate, { url: "https://hooks.example.com/a", events: ["pass.bought", "visit.done"] })
    expect(made.secret).toMatch(/^whsec_/)
    const list = await callApi(ctxFor(db, adminKey), webhooksList, {})
    expect(list.data).toEqual([expect.objectContaining({ id: made.id, events: ["pass.bought", "visit.done"], active: true })])
    expect(JSON.stringify(list)).not.toContain(made.secret)
  })
  it("rejects a plain-http URL, an unknown event and no events", async () => {
    await expect(callApi(ctxFor(db, adminKey), webhooksCreate, { url: "http://hooks.example.com", events: ["pass.bought"] })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, adminKey), webhooksCreate, { url: "https://hooks.example.com", events: ["pass.exploded"] })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, adminKey), webhooksCreate, { url: "https://hooks.example.com", events: [] })).rejects.toMatchObject({ code: "invalid" })
  })
  it("needs the admin scope", async () => {
    await expect(callApi(ctxFor(db, writeKey), webhooksCreate, { url: "https://hooks.example.com", events: ["pass.bought"] })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, readKey), webhooksList, {})).rejects.toMatchObject({ code: "forbidden" })
  })
  it("sends a signed test event and reports the answer", async () => {
    const made = await callApi(ctxFor(db, adminKey), webhooksCreate, { url: "https://hooks.example.com/t", events: ["pass.bought"] })
    const fetchFn = vi.fn(async () => new Response("ok", { status: 200 }))
    vi.stubGlobal("fetch", fetchFn)
    expect(await callApi(ctxFor(db, adminKey), webhooksTest, { id: made.id })).toEqual({ delivered: true, status: 200 })
    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>)["x-trailhead-signature"]).toBe(signBody(init.body as string, made.secret))
    fetchFn.mockResolvedValueOnce(new Response("no", { status: 500 }))
    expect(await callApi(ctxFor(db, adminKey), webhooksTest, { id: made.id })).toMatchObject({ delivered: false, status: 500 })
    vi.unstubAllGlobals()
    await expect(callApi(ctxFor(db, adminKey), webhooksTest, { id: "nope" })).rejects.toMatchObject({ code: "not_found" })
  })
  it("deletes an endpoint so it stops receiving events", async () => {
    const made = await callApi(ctxFor(db, adminKey), webhooksCreate, { url: "https://hooks.example.com/d", events: ["pass.bought"] })
    expect(await callApi(ctxFor(db, adminKey), webhooksDelete, { id: made.id })).toEqual({ ok: true })
    const [row] = (await db.select().from(s.webhookEndpoint)).filter((r) => r.id === made.id)
    expect(row!.active).toBe(false)
    await expect(callApi(ctxFor(db, adminKey), webhooksTest, { id: made.id })).rejects.toMatchObject({ code: "unprocessable" })
  })
})
