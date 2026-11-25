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
  await callApi(ctxFor(db, writeKey), visitsMove, { id: "p3-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-05", startTime: "08:00" })
  await callApi(ctxFor(db, writeKey), visitsMove, { id: "p4-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-05", startTime: "09:00" })
  await db.update(s.property).set({ lat: 39.93, lng: -105.05 }).where(eq(s.property.id, "property-c167"))
})
afterAll(() => db.close())

describe("schedule.week", () => {
  it("returns the week's visits, the people and the tray", async () => {
    const out = await callApi(ctxFor(db, readKey), scheduleWeek, { from: "2027-05-03" })
    expect(out.to).toBe("2027-05-09")
    expect(out.people.map((t) => [t.id, t.name, t.truck])).toEqual([["person_truck-1", "Ryan Garner", "Truck 1"], ["person_truck-2", "Tech Two", "Truck 2"]])
    expect(out.visits.map((v) => v.id)).toEqual(expect.arrayContaining(["p1-turn-on", "p3-turn-on", "p4-turn-on"]))
    expect(out.tray.every((v) => v.status === "unscheduled")).toBe(true)
    expect(out.visits.every((v) => v.address === undefined)).toBe(true)
    await expect(callApi(ctxFor(db, readKey), scheduleWeek, { from: "next monday" })).rejects.toMatchObject({ code: "invalid" })
  })
})

describe("schedule.day", () => {
  it("orders a person's stops and carries the points", async () => {
    const out = await callApi(ctxFor(db, readKey), scheduleDay, { day: "2027-05-05", personId: "person_truck-1" })
    expect(out.stops.map((s2) => [s2.visitId, s2.order])).toEqual([["p3-turn-on", 1], ["p4-turn-on", 2]])
    expect(out.stops[0]).toMatchObject({ town: "Broomfield", startTime: "09:00" })
    expect((await callApi(ctxFor(db, readKey), scheduleDay, { day: "2027-05-06" })).stops).toEqual([])
  })
  it("takes `truckId` as the legacy truck id for one season", async () => {
    const byPerson = (await callApi(ctxFor(db, readKey), scheduleDay, { day: "2027-05-05", personId: "person_truck-1" })).stops
    expect(byPerson).toHaveLength(2)
    expect((await callApi(ctxFor(db, readKey), scheduleDay, { day: "2027-05-05", truckId: "truck-1" })).stops).toEqual(byPerson)
    await expect(callApi(ctxFor(db, readKey), scheduleDay, { day: "2027-05-05", truckId: "nope" })).rejects.toMatchObject({ code: "not_found" })
  })
})

describe("schedule.slots", () => {
  it("offers each person's open starts for a day: a booked hour is not offered, and `remaining` counts the starts", async () => {
    const out = await callApi(ctxFor(db, readKey), scheduleSlots, { service: "turn-on-8", town: "Erie", from: "2027-05-05", days: 3 })
    // Wed May 5: Ryan has two pass visits there (their 8:00 and 9:00 are only the stack the day was ordered in: busy time with no place), so he is still offered starts.
    const ryan = out.data.find((d) => d.day === "2027-05-05" && d.personId === "person_truck-1")
    expect(ryan?.starts.length ?? 0).toBeGreaterThan(0)
    expect(ryan?.remaining).toBe(ryan?.starts.length)
    expect(ryan).toMatchObject({ slotMinutes: 60 })
    expect(ryan!.starts[0]).toBe("09:00")
    expect(ryan!.starts).toEqual([...ryan!.starts].sort())
    // One person per start, the one already working that day: the second truck has the same starts but is not listed beside him on May 5.
    expect(out.data.some((d) => d.day === "2027-05-05" && d.personId === "person_truck-2")).toBe(false)  })
  it("starts tomorrow by default, skips Saturdays for a person who does not work them, and rejects bad input", async () => {
    // The service opens Apr 15 (its dates) and the test's today is Apr 20, so tomorrow, Apr 21, is the first day offered; May 1 is a Saturday.
    const out = await callApi(ctxFor(db, readKey), scheduleSlots, { service: "turn-on-8", town: "Erie", days: 7 })
    expect(out.data.map((d) => d.day).sort()[0]).toBe("2027-04-21")
    const saturday = await callApi(ctxFor(db, readKey), scheduleSlots, { service: "turn-on-8", town: "Erie", from: "2027-05-01", days: 1 })
    expect(saturday.data.some((d) => d.personId === "person_truck-1")).toBe(false)
    expect(saturday.data.some((d) => d.personId === "person_truck-2")).toBe(true)
    await expect(callApi(ctxFor(db, readKey), scheduleSlots, { service: "nope", town: "Erie" })).rejects.toMatchObject({ code: "not_found" })
    await expect(callApi(ctxFor(db, readKey), scheduleSlots, { service: "turn-on-8", town: "Denver" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, readKey), scheduleSlots, { service: "turn-on-8", town: "Erie", zones: 12 })).rejects.toMatchObject({ code: "unprocessable" })
  })
})

describe("schedule.slots on a service's dates", () => {
  const dates = (from: string | null, to: string | null) => db.update(s.service).set({ bookableFrom: from, bookableTo: to }).where(eq(s.service.key, "blowout"))
  const days = async (from: string, count: number) => [...new Set((await callApi(ctxFor(db, readKey), scheduleSlots, { service: "blowout", town: "Erie", from, days: count })).data.map((d) => d.day))]
  it("offers no day outside the span and refuses a stretch with none in it", async () => {
    await dates("09-28", "11-15")
    try {
      await expect(callApi(ctxFor(db, readKey), scheduleSlots, { service: "blowout", town: "Erie", from: "2027-05-05", days: 3 })).rejects.toMatchObject({ code: "unprocessable", message: expect.stringContaining("Sep 28 to Nov 15") })
      // a stretch that starts the day before the span opens offers only the days inside it
      const open = await days("2027-09-27", 4)
      expect(open).not.toContain("2027-09-27")
      expect(open.every((d) => d >= "2027-09-28")).toBe(true)
      expect(open.length).toBeGreaterThan(0)
      expect((await days("2027-11-14", 4)).every((d) => d <= "2027-11-15")).toBe(true)
    } finally {
      await dates(null, null)
    }
  })
  it("wraps New Year when the end is before the start, and offers every day with no dates", async () => {
    await dates("11-01", "06-15")
    try {
      expect((await days("2027-05-05", 3)).length).toBeGreaterThan(0)
      await expect(callApi(ctxFor(db, readKey), scheduleSlots, { service: "blowout", town: "Erie", from: "2027-07-05", days: 3 })).rejects.toMatchObject({ code: "unprocessable" })
    } finally {
      await dates(null, null)
    }
    expect((await days("2027-07-05", 3)).length).toBeGreaterThan(0)
  })
})

describe("schedule.slots on an inactive service", () => {
  it("refuses it even when bookable is still set", async () => {
    await db.update(s.service).set({ active: false }).where(eq(s.service.key, "turn-on-8"))
    await expect(callApi(ctxFor(db, readKey), scheduleSlots, { service: "turn-on-8", town: "Erie" })).rejects.toMatchObject({ code: "unprocessable" })
    await db.update(s.service).set({ active: true }).where(eq(s.service.key, "turn-on-8"))
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

  it("offers the three best of the soonest five open days inside the dates, each with a two-hour window, and the offers carry the labels and open starts", async () => {
    const { days, offers } = await offer()
    expect(days).toHaveLength(3)
    expect(days.map((d) => d.day)).toEqual([...days.map((d) => d.day)].sort())
    for (const d of days) {
      expect(d.day >= "2027-04-15" && d.day <= "2027-05-31").toBe(true)
      expect(d.window).toMatch(/^\d+:\d{2} (am|pm)$/)
    }
    // soonest first: all three sit inside the first five working days that have room
    expect(days[2]!.day <= "2027-05-07").toBe(true)
    expect(offers.map((o) => o.day)).toEqual(days.map((d) => d.day))
    expect(offers.filter((o) => o.best)).toHaveLength(1)
    expect(offers.every((o) => o.slots.length > 0 && o.slots[0]!.personName !== "")).toBe(true)
    expect(days.map((d) => d.start)).toEqual(offers.map((o) => o.slots[0]!.start))
  })

  it("puts the visit on a person who works the weekday and the town's area", async () => {
    const { days } = await offer({ town: "Lafayette" })
    for (const d of days) {
      const [truck] = await db.select().from(s.person).where(eq(s.person.id, d.personId))
      expect(truck!.workingDays).toContain(["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date(`${d.day}T12:00:00Z`).getUTCDay()])
    }
    // Wed May 5: Ryan already works the south area, so a Lafayette visit goes on it.
    const wed = await callApi(ctxFor(db, readKey), scheduleOfferDays, { town: "Erie", kind: "turn-on", season: 2027, zones: 8 })
    expect(wed.days.find((d) => d.day === "2027-05-05")?.personId ?? "person_truck-2").toBe("person_truck-2")
  })

  it("skips a day with no room left", async () => {
    const { days } = await offer({ town: "Longmont" })
    const first = days[0]!
    const trucks = (await db.select().from(s.person)).filter((p) => p.truck !== null)
    const insert = trucks.map((t, i) => ({ id: `feed:${t.id}:fill-${i}`, organizationId: t.organizationId, isBlock: true, title: "Full", startAt: new Date(`${first.day}T06:00:00Z`), endAt: new Date(`${first.day}T23:59:00Z`) }))
    await db.insert(s.jobberVisit).values(insert)
    const after = await offer({ town: "Longmont" })
    expect(after.days.map((d) => d.day)).not.toContain(first.day)
    await db.delete(s.jobberVisit).where(eq(s.jobberVisit.title, "Full"))
  })

  it("respects a Jobber feed block that starts the day", async () => {
    const { days } = await offer({ town: "Longmont", kind: "blowout" })
    const first = days[0]!
    const truck = await db.select().from(s.person).where(eq(s.person.id, first.personId))
    // a block over the morning moves the window later, or the day off the list
    await db.insert(s.jobberVisit).values({ id: `feed:${first.personId}:morning`, organizationId: truck[0]!.organizationId, isBlock: true, title: "Morning", startAt: new Date(`${first.day}T13:00:00Z`), endAt: new Date(`${first.day}T16:00:00Z`) })
    const after = await offer({ town: "Longmont", kind: "blowout" })
    const same = after.days.find((d) => d.day === first.day && d.personId === first.personId)
    if (same) expect(same.start >= "10:00").toBe(true)
    await db.delete(s.jobberVisit).where(eq(s.jobberVisit.id, `feed:${first.personId}:morning`))
  })

  it("returns what exists when the window has fewer open days, and nothing when nothing fits", async () => {
    const set = async (from: string | null, to: string | null) => db.update(s.service).set({ bookableFrom: from, bookableTo: to }).where(eq(s.service.kind, "inspection"))
    try {
      await set("07-07", "07-08")
      expect((await offer({ kind: "inspection" })).days.map((d) => d.day)).toEqual(["2027-07-07", "2027-07-08"])
      // July 11 2027 is a Sunday: the one day of the dates has nobody working it, and the next year is not searched.
      await set("07-11", "07-11")
      expect((await offer({ kind: "inspection" })).days).toEqual([])
    } finally {
      await set(null, null)
    }
  })

  it("is open to the checkout visitor", async () => {
    const out = await callApi(ctxFor(db, { kind: "public", id: "checkout", organizationId: ORG, scopes: ["checkout"] }), scheduleOfferDays, { town: "Erie", kind: "turn-on", season: 2027, zones: 8 })
    expect(out.days.length).toBeGreaterThan(0)
  })
})
