// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ORG } from "../../test-helpers"
import { deliverEvent, emitEvent, handleOutboundWebhook, signBody } from "./deliver"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
  await db.insert(s.webhookEndpoint).values([
    { id: "e-pass", organizationId: ORG, url: "https://hooks.example.com/pass", secret: "whsec_pass", events: ["pass.bought"] },
    { id: "e-visit", organizationId: ORG, url: "https://hooks.example.com/visit", secret: "whsec_visit", events: ["visit.done"] },
    { id: "e-off", organizationId: ORG, url: "https://hooks.example.com/off", secret: "whsec_off", events: ["pass.bought"], active: false },
  ])
})
afterAll(() => db.close())

describe("emitEvent", () => {
  it("queues one event for each active endpoint subscribed to it and none for the rest", async () => {
    expect(await emitEvent(db, ORG, "pass.bought", { passId: "p1" })).toBe(1)
    const events = await db.select().from(s.outboundEvent)
    expect(events.map((e) => e.endpointId)).toEqual(["e-pass"])
    const queue = await db.select().from(s.queueItem).where(eq(s.queueItem.kind, "outbound-webhook"))
    expect(queue).toHaveLength(1)
    expect(queue[0]!.payload).toEqual({ eventId: events[0]!.id })
    expect(await emitEvent(db, ORG, "charge.failed", {})).toBe(0)
  })
})

describe("deliverEvent", () => {
  it("signs the body so it verifies with the secret, and marks the event delivered", async () => {
    await emitEvent(db, ORG, "visit.done", { visitId: "v1" })
    const [event] = await db.select().from(s.outboundEvent).where(eq(s.outboundEvent.endpointId, "e-visit"))
    const fetchFn = vi.fn(async () => new Response("ok", { status: 200 }))
    expect(await deliverEvent(db, event!.id, fetchFn as unknown as typeof fetch)).toMatchObject({ delivered: true, status: 200 })
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(url).toBe("https://hooks.example.com/visit")
    expect(headers["x-trailhead-event"]).toBe("visit.done")
    expect(headers["x-trailhead-signature"]).toBe(signBody(init.body as string, "whsec_visit"))
    expect(headers["x-trailhead-signature"]).not.toBe(signBody(init.body as string, "other"))
    const [after] = await db.select().from(s.outboundEvent).where(eq(s.outboundEvent.id, event!.id))
    expect(after!.deliveredAt).toBeInstanceOf(Date)
    await deliverEvent(db, event!.id, fetchFn as unknown as typeof fetch)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it("records a 500 and retries it through the queue handler until it lands", async () => {
    await emitEvent(db, ORG, "pass.bought", { passId: "p2" })
    const [event] = (await db.select().from(s.outboundEvent).where(eq(s.outboundEvent.event, "pass.bought"))).filter((e) => !e.deliveredAt)
    const failing = vi.fn(async () => new Response("no", { status: 500 }))
    await expect(handleOutboundWebhook(db, { eventId: event!.id }, failing as unknown as typeof fetch)).rejects.toThrow("500")
    const [failed] = await db.select().from(s.outboundEvent).where(eq(s.outboundEvent.id, event!.id))
    expect(failed).toMatchObject({ attempts: 1, deliveredAt: null })
    const working = vi.fn(async () => new Response("ok", { status: 200 }))
    await handleOutboundWebhook(db, { eventId: event!.id }, working as unknown as typeof fetch)
    const [done] = await db.select().from(s.outboundEvent).where(eq(s.outboundEvent.id, event!.id))
    expect(done!.attempts).toBe(2)
    expect(done!.deliveredAt).toBeInstanceOf(Date)
  })

  it("records a network failure", async () => {
    await emitEvent(db, ORG, "pass.bought", { passId: "p3" })
    const [event] = (await db.select().from(s.outboundEvent)).filter((e) => !e.deliveredAt)
    const down = vi.fn(async () => { throw new Error("connection refused") })
    expect(await deliverEvent(db, event!.id, down as unknown as typeof fetch)).toEqual({ delivered: false, error: "connection refused" })
  })
})
