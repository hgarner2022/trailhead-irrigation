// @vitest-environment node
import { readFileSync } from "node:fs"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "@/api/core/call"
import { scheduleSlots } from "@/api/v1/schedule/handlers"
import { apiDb, ctxFor, readKey } from "@/api/test-helpers"
import { blockedMinutes, capacityAfterBlocks } from "@/lib/admin/calendar"
import { drain, enqueue } from "@/lib/queue"
import { handlers } from "@/lib/queue/handlers"
import { loadBlocks, syncTruckFeed, toBlocks } from "./index"
import { parseIcs } from "./ical"

const ics = readFileSync(new URL("./fixtures/truck-1.ics", import.meta.url), "utf8")
const feedResponse = (body: string, status = 200) => vi.fn(async () => new Response(body, { status })) as unknown as typeof fetch
let db: TestDb
let org: string
const truck = () => db.select().from(s.truck).where(eq(s.truck.id, "truck-1")).then((r) => r[0]!)
const feedRows = () => db.select().from(s.jobberVisit).where(and(eq(s.jobberVisit.truckId, "truck-1"))).then((r) => r.sort((a, b) => a.id.localeCompare(b.id)))

beforeAll(async () => {
  db = await apiDb()
  org = (await truck()).organizationId
  await db.update(s.truck).set({ calendarFeedUrl: "webcal://calendar.example.com/truck-1.ics" }).where(eq(s.truck.id, "truck-1"))
})
afterAll(() => db.close())

describe("toBlocks", () => {
  it("makes an all-day event a full working-day block for each day it covers", () => {
    const blocks = toBlocks("truck-1", parseIcs(ics))
    const training = blocks.filter((b) => b.id.includes("visit-1004"))
    expect(training.map((b) => [b.startAt.toISOString(), b.endAt.toISOString()])).toEqual([
      ["2027-05-10T13:00:00.000Z", "2027-05-10T23:00:00.000Z"],
      ["2027-05-11T13:00:00.000Z", "2027-05-11T23:00:00.000Z"],
    ])
    expect(blocks).toHaveLength(5)
  })
})

describe("syncTruckFeed", () => {
  it("writes busy blocks keyed by uid, reading webcal as https", async () => {
    const fetchStub = feedResponse(ics)
    const out = await syncTruckFeed(db, await truck(), { fetch: fetchStub, now: new Date("2027-05-01T10:00:00Z") })
    expect(out).toEqual({ upserted: 5, removed: 0 })
    expect(vi.mocked(fetchStub).mock.calls[0]![0]).toBe("https://calendar.example.com/truck-1.ics")
    const rows = await feedRows()
    expect(rows.every((r) => r.isBlock && r.organizationId === org)).toBe(true)
    expect(rows.find((r) => r.id === "feed:truck-1:visit-1001@jobber")).toMatchObject({ title: "Sprinkler repair - Andrea, Erie" })
  })
  it("updates in place on a re-run and drops an event that left the feed", async () => {
    const changed = ics.replace("SUMMARY:Sprinkler repair - Andrea\\, Erie", "SUMMARY:Moved repair").replace("DTSTART:20270505T150000Z", "DTSTART:20270505T170000Z").replace(/BEGIN:VEVENT\nUID:visit-1004@jobber[\s\S]*?END:VEVENT\n/, "")
    const out = await syncTruckFeed(db, await truck(), { fetch: feedResponse(changed), now: new Date("2027-05-01T10:05:00Z") })
    expect(out).toEqual({ upserted: 3, removed: 2 })
    const rows = await feedRows()
    expect(rows.map((r) => r.id)).toEqual(["feed:truck-1:visit-1001@jobber", "feed:truck-1:visit-1002@jobber", "feed:truck-1:visit-1003@jobber:2027-05-06"])
    expect(rows[0]).toMatchObject({ title: "Moved repair" })
    expect(rows[0]!.startAt!.toISOString()).toBe("2027-05-05T17:00:00.000Z")
  })
  it("leaves the old blocks standing when the feed fails, and never touches other mirror rows", async () => {
    const before = (await feedRows()).length
    await expect(syncTruckFeed(db, await truck(), { fetch: feedResponse("nope", 500), now: new Date("2027-05-01T10:10:00Z") })).rejects.toThrow("500")
    await expect(syncTruckFeed(db, await truck(), { fetch: feedResponse("<html>", 200) })).rejects.toThrow("not an iCalendar")
    expect(await feedRows()).toHaveLength(before)
    const others = await db.select().from(s.jobberVisit).then((r) => r.filter((x) => !x.id.startsWith("feed:")))
    expect(others.length).toBeGreaterThan(0)
  })
  it("does nothing for a truck without a URL", async () => {
    expect(await syncTruckFeed(db, { id: "truck-2", organizationId: org, calendarFeedUrl: null })).toEqual({ upserted: 0, removed: 0 })
  })
})

describe("busy time in capacity", () => {
  it("blocks a full working day for an all-day event and part of one for a timed event", async () => {
    const blocks = await loadBlocks(db, org, new Date("2027-05-01T00:00:00Z"))
    expect(blockedMinutes(blocks, "truck-1", "2027-05-06", "America/Denver")).toBe(600)
    // After the re-run: the moved repair starts 11:00 Mountain with an end before its start, so it lasts the default hour; the install is 13:30 to 14:30 Mountain.
    expect(blockedMinutes(blocks, "truck-1", "2027-05-05", "America/Denver")).toBe(120)
    expect(blockedMinutes(blocks, "truck-2", "2027-05-06", "America/Denver")).toBe(0)
    expect(capacityAfterBlocks(8, 0)).toBe(8)
    expect(capacityAfterBlocks(8, 600)).toBe(0)
    expect(capacityAfterBlocks(8, 150)).toBe(6)
  })
  it("removes a blocked day from schedule.slots and shrinks a partly blocked one", async () => {
    const out = await callApi(ctxFor(db, readKey), scheduleSlots, { service: "turn-on-8", town: "Louisville", from: "2027-05-05", days: 2 })
    const t1 = (day: string) => out.data.find((d) => d.day === day && d.truckId === "truck-1")
    expect(t1("2027-05-06")).toBeUndefined()
    expect(out.data.find((d) => d.day === "2027-05-06" && d.truckId === "truck-2")).toBeDefined()
    expect(t1("2027-05-05")?.remaining).toBeLessThan(8)
  })
})

describe("the jobber-feed-sync queue handler", () => {
  it("syncs the truck named in the payload", async () => {
    vi.stubGlobal("fetch", feedResponse(ics))
    await enqueue(db, org, "jobber-feed-sync", "truck-1:1", { truckId: "truck-1" })
    expect(await drain(db, handlers)).toEqual({ done: 1, failed: 0 })
    expect((await feedRows()).length).toBe(5)
    vi.unstubAllGlobals()
  })
})
