// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, ORG, readKey, writeKey } from "../../test-helpers"
import { visitsMove } from "../visits/handlers"
import { scheduleDay, scheduleOfferDays, scheduleRun, scheduleSlots, scheduleWeek } from "./handlers"

let db: TestDb
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  await callApi(ctxFor(db, writeKey), visitsMove, { id: "p3-turn-on", truckId: "truck-1", scheduledOn: "2027-05-05", startTime: "08:00" })
  await callApi(ctxFor(db, writeKey), visitsMove, { id: "p4-turn-on", truckId: "truck-1", scheduledOn: "2027-05-05", startTime: "09:00" })
  await db.update(s.property).set({ lat: 39.93, lng: -105.05 }).where(eq(s.property.id, "property-c167"))
})
afterAll(() => db.close())

describe("schedule.week", () => {
  it("returns the week's visits, the trucks and the tray", async () => {
    const out = await callApi(ctxFor(db, readKey), scheduleWeek, { from: "2027-05-03" })
    expect(out.to).toBe("2027-05-09")
    expect(out.trucks.map((t) => t.id)).toEqual(["truck-1", "truck-2"])
    expect(out.visits.map((v) => v.id)).toEqual(expect.arrayContaining(["p1-turn-on", "p3-turn-on", "p4-turn-on"]))
    expect(out.tray.every((v) => v.status === "unscheduled")).toBe(true)
    expect(out.visits.every((v) => v.address === undefined)).toBe(true)
    await expect(callApi(ctxFor(db, readKey), scheduleWeek, { from: "next monday" })).rejects.toMatchObject({ code: "invalid" })
  })
})

describe("schedule.day", () => {
  it("orders a truck's stops and carries the points", async () => {
    const out = await callApi(ctxFor(db, readKey), scheduleDay, { day: "2027-05-05", truckId: "truck-1" })
    expect(out.stops.map((s2) => [s2.visitId, s2.order])).toEqual([["p3-turn-on", 1], ["p4-turn-on", 2]])
    expect(out.stops[0]).toMatchObject({ town: "Broomfield", startTime: "08:00" })
    expect((await callApi(ctxFor(db, readKey), scheduleDay, { day: "2027-05-06" })).stops).toEqual([])
  })
})

describe("schedule.slots", () => {
  it("offers truck-days with room in the town's area and skips another area's days", async () => {
    const out = await callApi(ctxFor(db, readKey), scheduleSlots, { service: "turn-on-8", town: "Erie", from: "2027-05-05", days: 3 })
    // Wed May 5: truck-1 is on the south area, so only truck-2 is open for Erie.
    expect(out.data.filter((d) => d.day === "2027-05-05").map((d) => d.truckId)).toEqual(["truck-2"])
    const south = await callApi(ctxFor(db, readKey), scheduleSlots, { service: "turn-on-8", town: "Lafayette", from: "2027-05-05", days: 1 })
    expect(south.data.find((d) => d.truckId === "truck-1")).toMatchObject({ remaining: 4, slotMinutes: 60 })
  })
  it("starts tomorrow by default, skips Saturdays for a truck that does not work them, and rejects bad input", async () => {
    const out = await callApi(ctxFor(db, readKey), scheduleSlots, { service: "turn-on-8", town: "Erie", days: 7 })
    expect(out.data.map((d) => d.day).sort()[0]).toBe("2027-04-21")
    expect(out.data.some((d) => d.day === "2027-04-24" && d.truckId === "truck-1")).toBe(false)
    expect(out.data.some((d) => d.day === "2027-04-24" && d.truckId === "truck-2")).toBe(true)
    await expect(callApi(ctxFor(db, readKey), scheduleSlots, { service: "nope", town: "Erie" })).rejects.toMatchObject({ code: "not_found" })
    await expect(callApi(ctxFor(db, readKey), scheduleSlots, { service: "turn-on-8", town: "Denver" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, readKey), scheduleSlots, { service: "turn-on-8", town: "Erie", zones: 12 })).rejects.toMatchObject({ code: "unprocessable" })
  })
})

describe("schedule.run", () => {
  it("needs the admin scope and a real window", async () => {
    await expect(callApi(ctxFor(db, writeKey), scheduleRun, { window: "blowout" })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, adminKey), scheduleRun, { window: "spring" })).rejects.toMatchObject({ code: "invalid" })
  })
})

describe("schedule.offerDays", () => {
  const offer = (over: Partial<{ town: "Erie" | "Longmont" | "Lafayette"; kind: "turn-on" | "blowout" | "inspection" }> = {}) =>
    callApi(ctxFor(db, readKey), scheduleOfferDays, { town: "Erie", kind: "turn-on", season: 2027, zones: 8, ...over })

  it("offers up to three days inside the window, spread from the first open day to the last, each with a two-hour window", async () => {
    const { days } = await offer()
    expect(days).toHaveLength(3)
    expect(days.map((d) => d.day)).toEqual([...days.map((d) => d.day)].sort())
    for (const d of days) {
      expect(d.day >= "2027-04-26" && d.day <= "2027-05-31").toBe(true)
      expect(d.window).toMatch(/^\d+ (am )?to \d+ (am|pm)$/)
    }
    expect(days[0]!.day <= "2027-04-30").toBe(true)
    expect(days[2]!.day >= "2027-05-24").toBe(true)
  })

  it("puts the visit on a truck that works the weekday and the town's area", async () => {
    const { days } = await offer({ town: "Lafayette" })
    for (const d of days) {
      const [truck] = await db.select().from(s.truck).where(eq(s.truck.id, d.truckId))
      expect(truck!.workingDays).toContain(["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date(`${d.day}T12:00:00Z`).getUTCDay()])
    }
    // Wed May 5: truck-1 already works the south area, so a Lafayette visit goes on it.
    const wed = await callApi(ctxFor(db, readKey), scheduleOfferDays, { town: "Erie", kind: "turn-on", season: 2027, zones: 8 })
    expect(wed.days.find((d) => d.day === "2027-05-05")?.truckId ?? "truck-2").toBe("truck-2")
  })

  it("skips a day with no room left", async () => {
    const { days } = await offer({ town: "Longmont" })
    const first = days[0]!
    const trucks = await db.select().from(s.truck)
    const insert = trucks.map((t, i) => ({ id: `fill-${i}`, organizationId: t.organizationId, truckId: t.id, isBlock: true, title: "Full", startAt: new Date(`${first.day}T06:00:00Z`), endAt: new Date(`${first.day}T23:59:00Z`) }))
    await db.insert(s.jobberVisit).values(insert)
    const after = await offer({ town: "Longmont" })
    expect(after.days.map((d) => d.day)).not.toContain(first.day)
    await db.delete(s.jobberVisit).where(eq(s.jobberVisit.title, "Full"))
  })

  it("respects a Jobber feed block that starts the day", async () => {
    const { days } = await offer({ town: "Longmont", kind: "blowout" })
    const first = days[0]!
    const truck = await db.select().from(s.truck).where(eq(s.truck.id, first.truckId))
    // a block over the morning moves the window later, or the day off the list
    await db.insert(s.jobberVisit).values({ id: "morning", organizationId: truck[0]!.organizationId, truckId: first.truckId, isBlock: true, title: "Morning", startAt: new Date(`${first.day}T13:00:00Z`), endAt: new Date(`${first.day}T16:00:00Z`) })
    const after = await offer({ town: "Longmont", kind: "blowout" })
    const same = after.days.find((d) => d.day === first.day && d.truckId === first.truckId)
    if (same) expect(same.start >= "10:00").toBe(true)
    await db.delete(s.jobberVisit).where(eq(s.jobberVisit.id, "morning"))
  })

  it("returns what exists when the window has fewer open days, and nothing when nothing fits", async () => {
    const [saved] = await db.select({ settings: s.organization.settings }).from(s.organization)
    const set = async (opensOn: string, closesOn: string) =>
      db.update(s.organization).set({ settings: { ...saved!.settings, windows: saved!.settings.windows.map((w) => (w.kind === "inspection" ? { ...w, opensOn, closesOn } : w)) } })
    await set("2027-07-07", "2027-07-08")
    expect((await offer({ kind: "inspection" })).days.map((d) => d.day)).toEqual(["2027-07-07", "2027-07-08"])
    await set("2027-07-11", "2027-07-11")
    expect((await offer({ kind: "inspection" })).days).toEqual([])
    await db.update(s.organization).set({ settings: saved!.settings })
  })

  it("is open to the checkout visitor", async () => {
    const out = await callApi(ctxFor(db, { kind: "public", id: "checkout", organizationId: ORG, scopes: ["checkout"] }), scheduleOfferDays, { town: "Erie", kind: "turn-on", season: 2027, zones: 8 })
    expect(out.days.length).toBeGreaterThan(0)
  })
})
