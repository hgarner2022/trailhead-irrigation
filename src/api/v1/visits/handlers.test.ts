// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, customerPerson, ORG, readKey, writeKey } from "../../test-helpers"
import { visitsGet, visitsList, visitsMarkClosed, visitsMove, visitsRequestMove, visitsStretch } from "./handlers"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
  await db.insert(s.webhookEndpoint).values({ id: "hook", organizationId: ORG, url: "https://hooks.example.com/x", secret: "whsec_x", events: ["visit.scheduled", "visit.moved"] })
})
afterAll(() => db.close())

const move = (input: Record<string, unknown>, principal = writeKey) => callApi(ctxFor(db, principal), visitsMove, input)

describe("visits.list and visits.get", () => {
  it("filters by kind, status, pass and day range", async () => {
    expect((await callApi(ctxFor(db, readKey), visitsList, { passId: "p1" })).data.map((v) => v.kind).sort()).toEqual(["blowout", "inspection", "turn-on"])
    const done = await callApi(ctxFor(db, readKey), visitsList, { status: "completed", kind: "turn-on" })
    expect(done.data.map((v) => v.id)).toContain("p1-turn-on")
    expect((await callApi(ctxFor(db, readKey), visitsList, { from: "2027-05-03", to: "2027-05-03" })).data.map((v) => v.id)).toEqual(["p1-turn-on"])
    await expect(callApi(ctxFor(db, readKey), visitsList, { status: "lost" })).rejects.toMatchObject({ code: "invalid" })
  })
  it("hides addresses from a read key", async () => {
    expect(await callApi(ctxFor(db, readKey), visitsGet, { id: "p1-turn-on" })).not.toHaveProperty("address")
    expect(await callApi(ctxFor(db, writeKey), visitsGet, { id: "p1-turn-on" })).toHaveProperty("address")
    await expect(callApi(ctxFor(db, readKey), visitsGet, { id: "nope" })).rejects.toMatchObject({ code: "not_found" })
  })
})

describe("visits.move", () => {
  it("places a visit, marks it scheduled and queues the visit.scheduled event", async () => {
    const out = await move({ id: "p3-turn-on", truckId: "truck-1", scheduledOn: "2027-05-05", startTime: "08:30" })
    expect(out).toMatchObject({ status: "scheduled", truckId: "truck-1", scheduledOn: "2027-05-05", startTime: "08:30", awaitingPick: false })
    const events = await db.select().from(s.outboundEvent)
    expect(events.map((e) => e.event)).toContain("visit.scheduled")
    await move({ id: "p3-turn-on", truckId: "truck-1", scheduledOn: "2027-05-06" })
    expect((await db.select().from(s.outboundEvent)).map((e) => e.event)).toContain("visit.moved")
  })
  it("refuses a day the truck does not work", async () => {
    await expect(move({ id: "p4-turn-on", truckId: "truck-1", scheduledOn: "2027-05-08" })).rejects.toMatchObject({ code: "unprocessable" })
    await expect(move({ id: "p4-turn-on", truckId: "truck-2", scheduledOn: "2027-05-08" })).resolves.toMatchObject({ scheduledOn: "2027-05-08" })
  })
  it("refuses a day outside the visit's window", async () => {
    await expect(move({ id: "p5-turn-on", truckId: "truck-1", scheduledOn: "2027-06-02" })).rejects.toThrow(/must land between/)
    await expect(move({ id: "p5-blowout", truckId: "truck-1", scheduledOn: "2027-05-05" })).rejects.toThrow(/must land between/)
  })
  it("refuses a second area on a truck-day", async () => {
    await expect(move({ id: "p6-turn-on", truckId: "truck-1", scheduledOn: "2027-05-06" })).rejects.toThrow(/different area/)
    await expect(move({ id: "p7-turn-on", truckId: "truck-1", scheduledOn: "2027-05-06" })).resolves.toMatchObject({ truckId: "truck-1" })
  })
  it("refuses a full truck-day", async () => {
    await db.update(s.truck).set({ capacityByKind: { "turn-on": 1, inspection: 5, blowout: 10, repair: 4, other: 2 } }).where(eq(s.truck.id, "truck-2"))
    await move({ id: "p8-turn-on", truckId: "truck-2", scheduledOn: "2027-05-12" })
    await expect(move({ id: "p10-turn-on", truckId: "truck-2", scheduledOn: "2027-05-12" })).rejects.toThrow(/full of turn-on/)
  })
  it("refuses a finished visit, an unknown truck, a bad day and a read key", async () => {
    await expect(move({ id: "p1-turn-on", truckId: "truck-1", scheduledOn: "2027-05-10" })).rejects.toThrow(/completed/)
    await expect(move({ id: "p11-turn-on", truckId: "nope", scheduledOn: "2027-05-10" })).rejects.toMatchObject({ code: "not_found" })
    await expect(move({ id: "p11-turn-on", truckId: "truck-1", scheduledOn: "May 10" })).rejects.toMatchObject({ code: "invalid" })
    await expect(move({ id: "p11-turn-on", truckId: "truck-1", scheduledOn: "2027-05-10" }, readKey)).rejects.toMatchObject({ code: "forbidden" })
  })
  it("is idempotent on an Idempotency-Key", async () => {
    const ctx = { ...ctxFor(db, writeKey), idempotencyKey: "move-1" }
    const a = await callApi(ctx, visitsMove, { id: "p12-turn-on", truckId: "truck-1", scheduledOn: "2027-05-11" })
    const b = await callApi(ctx, visitsMove, { id: "p12-turn-on", truckId: "truck-1", scheduledOn: "2027-05-11" })
    expect(b).toEqual(a)
  })
})

describe("visits.markClosed and visits.stretch", () => {
  it("closes a scheduled visit for an admin only", async () => {
    await expect(callApi(ctxFor(db, writeKey), visitsMarkClosed, { id: "p3-turn-on" })).rejects.toMatchObject({ code: "forbidden" })
    const out = await callApi(ctxFor(db, adminKey, "2027-05-07T20:00:00Z"), visitsMarkClosed, { id: "p3-turn-on" })
    expect(out).toMatchObject({ status: "completed", completedOn: "2027-05-07" })
    await expect(callApi(ctxFor(db, adminKey), visitsMarkClosed, { id: "p11-blowout" })).rejects.toMatchObject({ code: "unprocessable" })
  })
  it("stretches a scheduled visit in 15-minute steps", async () => {
    expect(await callApi(ctxFor(db, writeKey), visitsStretch, { id: "p4-turn-on", durationMinutes: 120 })).toMatchObject({ durationMinutes: 120 })
    await expect(callApi(ctxFor(db, writeKey), visitsStretch, { id: "p4-turn-on", durationMinutes: 100 })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, writeKey), visitsStretch, { id: "p11-blowout", durationMinutes: 60 })).rejects.toMatchObject({ code: "unprocessable" })
  })
})

describe("visits.requestMove", () => {
  it("records a customer's request on their own visit only", async () => {
    await expect(callApi(ctxFor(db, customerPerson("c104")), visitsRequestMove, { id: "p6-blowout", preferredWeek: "2027-10-18", note: "away that week" })).resolves.toEqual({ ok: true })
    const [change] = await db.select().from(s.passChange).where(eq(s.passChange.kind, "move-requested"))
    expect(change).toMatchObject({ passId: "p6", visitId: "p6-blowout", detail: { preferredWeek: "2027-10-18", note: "away that week" } })
    await expect(callApi(ctxFor(db, customerPerson("c104")), visitsRequestMove, { id: "p7-blowout" })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, readKey), visitsRequestMove, { id: "p6-blowout" })).rejects.toMatchObject({ code: "forbidden" })
  })
})
