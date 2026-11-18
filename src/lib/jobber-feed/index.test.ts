// @vitest-environment node
import { readFileSync } from "node:fs"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq, like } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "@/api/core/call"
import { scheduleSlots } from "@/api/v1/schedule/handlers"
import { apiDb, ctxFor, readKey } from "@/api/test-helpers"
import { blockedMinutes, capacityAfterBlocks } from "@/lib/admin/calendar"
import { drain, enqueue } from "@/lib/queue"
import { handlers } from "@/lib/queue/handlers"
import { loadBlocks, syncPersonFeed, toBlocks } from "./index"
import { parseIcs } from "./ical"

const ics = readFileSync(new URL("./fixtures/truck-1.ics", import.meta.url), "utf8")
const feedResponse = (body: string, status = 200) => vi.fn(async () => new Response(body, { status })) as unknown as typeof fetch
const RYAN = "person_truck-1"
let db: TestDb
let org: string
const ryan = () => db.select().from(s.person).where(eq(s.person.id, RYAN)).then((r) => r[0]!)
const feedRows = () => db.select().from(s.jobberVisit).where(like(s.jobberVisit.id, `feed:${RYAN}:%`)).then((r) => r.sort((a, b) => a.id.localeCompare(b.id)))

beforeAll(async () => {
  db = await apiDb()
  org = (await ryan()).organizationId
  await db.update(s.person).set({ calendarFeedUrl: "webcal://calendar.example.com/truck-1.ics" }).where(eq(s.person.id, RYAN))
})
afterAll(() => db.close())

describe("toBlocks", () => {
  it("makes an all-day event a full working-day block for each day it covers, under the person's id", () => {
    const blocks = toBlocks(RYAN, parseIcs(ics))
    const training = blocks.filter((b) => b.id.includes("visit-1004"))
    expect(training.map((b) => [b.startAt.toISOString(), b.endAt.toISOString()])).toEqual([
      ["2027-05-10T13:00:00.000Z", "2027-05-10T23:00:00.000Z"],
      ["2027-05-11T13:00:00.000Z", "2027-05-11T23:00:00.000Z"],
    ])
    expect(blocks).toHaveLength(5)
    expect(blocks.every((b) => b.personId === RYAN && b.id.startsWith(`feed:${RYAN}:`))).toBe(true)
  })
})

describe("syncPersonFeed", () => {
  it("replaces blocks written under the truck's id before people existed", async () => {
    await db.insert(s.jobberVisit).values({ id: "feed:truck-1:old@jobber", organizationId: org, title: "Old", startAt: new Date("2027-05-03T15:00:00Z"), endAt: new Date("2027-05-03T16:00:00Z"), isBlock: true, syncedAt: new Date("2027-04-01T00:00:00Z") })
    // Until the first sync the old row still counts, as Ryan's.
    const before = await loadBlocks(db, org, new Date("2027-05-01T00:00:00Z"))
    expect(before).toEqual([{ personId: RYAN, title: "Old", startAt: "2027-05-03T15:00:00.000Z", endAt: "2027-05-03T16:00:00.000Z" }])
    const out = await syncPersonFeed(db, await ryan(), { fetch: feedResponse(ics), now: new Date("2027-05-01T09:00:00Z") })
    expect(out).toEqual({ upserted: 5, removed: 1 })
    expect(await db.select().from(s.jobberVisit).where(eq(s.jobberVisit.id, "feed:truck-1:old@jobber"))).toEqual([])
  })
  it("writes busy blocks keyed by uid under the person's id, reading webcal as https", async () => {
    const fetchStub = feedResponse(ics)
    const out = await syncPersonFeed(db, await ryan(), { fetch: fetchStub, now: new Date("2027-05-01T10:00:00Z") })
    expect(out).toEqual({ upserted: 5, removed: 0 })
    expect(vi.mocked(fetchStub).mock.calls[0]![0]).toBe("https://calendar.example.com/truck-1.ics")
    const rows = await feedRows()
    expect(rows).toHaveLength(5)
    expect(rows.every((r) => r.isBlock && r.organizationId === org)).toBe(true)
    expect(rows.find((r) => r.id === `feed:${RYAN}:visit-1001@jobber`)).toMatchObject({ title: "Sprinkler repair - Andrea, Erie" })
  })
  it("updates in place on a re-run and drops an event that left the feed", async () => {
    const changed = ics.replace("SUMMARY:Sprinkler repair - Andrea\\, Erie", "SUMMARY:Moved repair").replace("DTSTART:20270505T150000Z", "DTSTART:20270505T170000Z").replace(/BEGIN:VEVENT\nUID:visit-1004@jobber[\s\S]*?END:VEVENT\n/, "")
    const out = await syncPersonFeed(db, await ryan(), { fetch: feedResponse(changed), now: new Date("2027-05-01T10:05:00Z") })
    expect(out).toEqual({ upserted: 3, removed: 2 })
    const rows = await feedRows()
    expect(rows.map((r) => r.id)).toEqual([`feed:${RYAN}:visit-1001@jobber`, `feed:${RYAN}:visit-1002@jobber`, `feed:${RYAN}:visit-1003@jobber:2027-05-06`])
    expect(rows[0]).toMatchObject({ title: "Moved repair" })
    expect(rows[0]!.startAt!.toISOString()).toBe("2027-05-05T17:00:00.000Z")
  })
  it("leaves the old blocks standing when the feed fails, and never touches other mirror rows", async () => {
    const before = (await feedRows()).length
    await expect(syncPersonFeed(db, await ryan(), { fetch: feedResponse("nope", 500), now: new Date("2027-05-01T10:10:00Z") })).rejects.toThrow("500")
    await expect(syncPersonFeed(db, await ryan(), { fetch: feedResponse("<html>", 200) })).rejects.toThrow("not an iCalendar")
    expect(await feedRows()).toHaveLength(before)
    const others = await db.select().from(s.jobberVisit).then((r) => r.filter((x) => !x.id.startsWith("feed:")))
    expect(others.length).toBeGreaterThan(0)
  })
  it("does nothing for a person without a URL", async () => {
    expect(await syncPersonFeed(db, { id: "person_truck-2", organizationId: org, calendarFeedUrl: null })).toEqual({ upserted: 0, removed: 0 })
  })
  it("syncs a person made since the trucks, with no old rows to replace", async () => {
    const [made] = await db.insert(s.person).values({ organizationId: org, name: "New Tech", initials: "NT", truck: "Truck 3", calendarFeedUrl: "https://calendar.example.com/t3.ics" }).returning()
    const out = await syncPersonFeed(db, made!, { fetch: feedResponse(ics), now: new Date("2027-05-01T10:20:00Z") })
    expect(out).toEqual({ upserted: 5, removed: 0 })
    const rows = await db.select().from(s.jobberVisit).where(like(s.jobberVisit.id, `feed:${made!.id}:%`))
    expect(rows).toHaveLength(5)
    expect((await loadBlocks(db, org, new Date("2027-05-01T00:00:00Z"))).filter((b) => b.personId === made!.id)).toHaveLength(5)
    await db.delete(s.jobberVisit).where(like(s.jobberVisit.id, `feed:${made!.id}:%`))
    await db.delete(s.person).where(eq(s.person.id, made!.id))
  })
})

describe("busy time in capacity", () => {
  it("blocks a full working day for an all-day event and part of one for a timed event", async () => {
    const blocks = await loadBlocks(db, org, new Date("2027-05-01T00:00:00Z"))
    expect(blockedMinutes(blocks, RYAN, "2027-05-06", "America/Denver")).toBe(600)
    // After the re-run: the moved repair starts 11:00 Mountain with an end before its start, so it lasts the default hour; the install is 13:30 to 14:30 Mountain.
    expect(blockedMinutes(blocks, RYAN, "2027-05-05", "America/Denver")).toBe(120)
    expect(blockedMinutes(blocks, "person_truck-2", "2027-05-06", "America/Denver")).toBe(0)
    expect(capacityAfterBlocks(8, 0)).toBe(8)
    expect(capacityAfterBlocks(8, 600)).toBe(0)
    expect(capacityAfterBlocks(8, 150)).toBe(6)
  })
  it("reads an old busy row, `feed:<truck key>:<uid>`, as the person `person_<key>`'s, and a row nobody owns is left out", async () => {
    await db.insert(s.jobberVisit).values([
      { id: "feed:truck-2:old-block", organizationId: org, title: "Out", startAt: new Date("2027-05-12T15:00:00Z"), endAt: new Date("2027-05-12T16:00:00Z"), isBlock: true },
      { id: "feed:truck-9:nobody", organizationId: org, title: "Lost", startAt: new Date("2027-05-12T15:00:00Z"), endAt: new Date("2027-05-12T16:00:00Z"), isBlock: true },
      { id: "manual-block", organizationId: org, title: "No owner in the id", startAt: new Date("2027-05-12T15:00:00Z"), endAt: new Date("2027-05-12T16:00:00Z"), isBlock: true },
    ])
    const blocks = await loadBlocks(db, org, new Date("2027-05-12T00:00:00Z"), new Date("2027-05-13T00:00:00Z"))
    expect(blocks).toEqual([{ personId: "person_truck-2", title: "Out", startAt: "2027-05-12T15:00:00.000Z", endAt: "2027-05-12T16:00:00.000Z" }])
    await db.delete(s.jobberVisit).where(like(s.jobberVisit.id, "feed:truck-%"))
    await db.delete(s.jobberVisit).where(eq(s.jobberVisit.id, "manual-block"))
  })
  it("removes a blocked day from schedule.slots and shrinks a partly blocked one", async () => {
    const out = await callApi(ctxFor(db, readKey), scheduleSlots, { service: "turn-on-8", town: "Louisville", from: "2027-05-05", days: 2 })
    const t1 = (day: string) => out.data.find((d) => d.day === day && d.personId === RYAN)
    expect(t1("2027-05-06")).toBeUndefined()
    expect(out.data.find((d) => d.day === "2027-05-06" && d.personId === "person_truck-2")).toBeDefined()
    expect(t1("2027-05-05")?.remaining).toBeLessThan(8)
  })
})

describe("the jobber-feed-sync queue handler", () => {
  it("deletes a person's old busy rows (`feed:<truck key>:`) on their first sync and leaves another person's alone", async () => {
    await db.insert(s.jobberVisit).values([
      { id: "feed:truck-1:left-behind", organizationId: org, title: "Old", startAt: new Date("2027-06-01T15:00:00Z"), endAt: new Date("2027-06-01T16:00:00Z"), isBlock: true, syncedAt: new Date("2027-04-01T00:00:00Z") },
      { id: "feed:truck-2:theirs", organizationId: org, title: "Theirs", startAt: new Date("2027-06-01T15:00:00Z"), endAt: new Date("2027-06-01T16:00:00Z"), isBlock: true, syncedAt: new Date("2027-04-01T00:00:00Z") },
    ])
    await syncPersonFeed(db, await ryan(), { fetch: feedResponse(ics), now: new Date("2027-05-01T11:00:00Z") })
    const left = await db.select({ id: s.jobberVisit.id }).from(s.jobberVisit).where(like(s.jobberVisit.id, "feed:truck-%"))
    expect(left.map((r) => r.id)).toEqual(["feed:truck-2:theirs"])
    await db.delete(s.jobberVisit).where(eq(s.jobberVisit.id, "feed:truck-2:theirs"))
  })
  it("syncs the person named in the payload, by their id or the old truck id", async () => {
    vi.stubGlobal("fetch", feedResponse(ics))
    await enqueue(db, org, "jobber-feed-sync", `${RYAN}:1`, { personId: RYAN })
    expect(await drain(db, handlers)).toEqual({ done: 1, failed: 0 })
    expect((await feedRows()).length).toBe(5)
    await enqueue(db, org, "jobber-feed-sync", "truck-1:2", { truckId: "truck-1" })
    expect(await drain(db, handlers)).toEqual({ done: 1, failed: 0 })
    expect((await feedRows()).length).toBe(5)
    vi.unstubAllGlobals()
  })
})
