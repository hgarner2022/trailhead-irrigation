// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { and, eq, inArray, ne } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { apiDb, ctxFor, ORG, readKey, writeKey } from "../../test-helpers"
import { visitsAreaDays, visitsPick } from "../visits/handlers"
import { scheduleOfferDays, scheduleSlots } from "./handlers"

/**
 * Ryan's April (docs/plans/2026-11-18-scheduling-engine-design.md, section 4.3), shifted to the dates the fixture's turn-on opens
 * (Mon Apr 26 2027), through the handlers and the database: one person, 12:00 to 18:00; the booked visits sit on real rows.
 */
const NOW = "2027-04-23T15:00:00Z"
const RYAN = "person_truck-1"
const MON = "2027-04-26"
const TUE = "2027-04-27"
const WED = "2027-04-28"
const THU = "2027-04-29"
const FRI = "2027-04-30"
const TARGET = "p3-turn-on"
const BRIGGS = { lat: 40.0503, lng: -105.0498 }

let db: TestDb
const read = () => ctxFor(db, readKey, NOW)
const office = () => ctxFor(db, writeKey, NOW)

beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  // Ryan alone, 12:00 to 18:00; the second truck is off the schedule; the Jobber calendar is empty.
  await db.update(s.person).set({ hoursStart: "12:00", hoursEnd: "18:00" }).where(eq(s.person.id, RYAN))
  await db.update(s.person).set({ truck: null }).where(eq(s.person.id, "person_truck-2"))
  await db.delete(s.jobberVisit).where(eq(s.jobberVisit.isBlock, true))
  // Every other visit leaves the calendar, then seven rows become the April bookings.
  const [target] = await db.select().from(s.visit).where(eq(s.visit.id, TARGET))
  await db.update(s.visit).set({ status: "cancelled" }).where(and(eq(s.visit.organizationId, ORG), ne(s.visit.id, TARGET)))
  await db.update(s.visit).set({ status: "unscheduled", scheduledOn: null, personId: null, startTime: null, durationMinutes: null }).where(eq(s.visit.id, TARGET))
  await db.update(s.property).set({ town: "Erie", ...BRIGGS }).where(eq(s.property.id, target!.propertyId))
  const rows = await db.select({ id: s.visit.id, propertyId: s.visit.propertyId }).from(s.visit).where(and(eq(s.visit.organizationId, ORG), ne(s.visit.propertyId, target!.propertyId)))
  const seen = new Set<string>()
  const distinct = rows.filter((r) => (seen.has(r.propertyId) ? false : (seen.add(r.propertyId), true))).slice(0, 7)
  expect(distinct).toHaveLength(7)
  const booking = [
    { day: TUE, start: "12:00", minutes: 60, kind: "turn-on", town: "Erie", at: { lat: 40.0495, lng: -105.051 } },
    { day: TUE, start: "13:30", minutes: 60, kind: "turn-on", town: "Erie", at: { lat: 40.051, lng: -105.048 } },
    { day: TUE, start: "15:00", minutes: 60, kind: "turn-on", town: "Erie", at: { lat: 40.05, lng: -105.0495 } },
    { day: WED, start: "12:00", minutes: 60, kind: "turn-on", town: "Longmont", at: null },
    { day: WED, start: "14:00", minutes: 120, kind: "repair", town: "Longmont", at: null },
    { day: THU, start: "12:00", minutes: 120, kind: "repair", town: "Erie", at: { lat: 40.056, lng: -105.06 } },
    { day: FRI, start: "13:00", minutes: 60, kind: "turn-on", town: "Lafayette", at: null },
  ] as const
  for (const [i, b] of booking.entries()) {
    const r = distinct[i]!
    await db.update(s.property).set({ town: b.town, lat: b.at?.lat ?? null, lng: b.at?.lng ?? null }).where(eq(s.property.id, r.propertyId))
    await db.update(s.visit).set({ status: "scheduled", personId: RYAN, scheduledOn: b.day, startTime: b.start, durationMinutes: b.minutes, kind: b.kind }).where(eq(s.visit.id, r.id))
  }
})
afterAll(() => db.close())

const starts = (o: { slots: { start: string }[] }) => o.slots.map((x) => x.start).sort()

describe("Ryan's April through the API", () => {
  it("visits.areaDays: Tuesday preselected with exactly two starts, Thursday, then Monday as the soonest; `days` stays the dates in order", async () => {
    const out = await callApi(read(), visitsAreaDays, { id: TARGET })
    expect(out.days).toEqual([MON, TUE, THU])
    expect(out.offers.map((o) => o.day)).toEqual(out.days)
    expect(out.offers.find((o) => o.best)!.day).toBe(TUE)
    const [mon, tue, thu] = out.offers
    expect(mon).toMatchObject({ tier: 2, label: "Soonest open day." })
    expect(starts(mon!)).toHaveLength(11)
    expect(tue).toMatchObject({ tier: 0, same: 3, label: "We're already in Erie that day." })
    expect(starts(tue!)).toEqual(["16:30", "17:00"])
    expect(tue!.slots[0]).toMatchObject({ start: "16:30", personId: RYAN, personName: "Ryan Garner", label: "Next to another Erie visit." })
    expect(thu).toMatchObject({ tier: 0, same: 1 })
    expect(starts(thu!)).toEqual(["14:30", "15:00", "15:30", "16:00", "16:30", "17:00"])
  })

  it("schedule.offerDays gives the same days for a booking with no visit yet (the point from lat and lng); its `days` carry the best start", async () => {
    const out = await callApi(read(), scheduleOfferDays, { town: "Erie", kind: "turn-on", season: 2027, zones: 8, ...BRIGGS })
    expect(out.days.map((d) => d.day)).toEqual([MON, TUE, THU])
    expect(out.days.find((d) => d.day === TUE)).toMatchObject({ personId: RYAN, start: "16:30" })
    expect(out.offers.find((o) => o.best)!.day).toBe(TUE)
  })

  it("schedule.slots for a day returns that day's starts from the same rule", async () => {
    const out = await callApi(read(), scheduleSlots, { service: "turn-on-8", town: "Erie", from: TUE, days: 1, zones: 8 })
    expect(out.data).toHaveLength(1)
    expect(out.data[0]).toMatchObject({ day: TUE, personId: RYAN, starts: ["16:30", "17:00"], remaining: 2, slotMinutes: 60 })
    const wed = await callApi(read(), scheduleSlots, { service: "turn-on-8", town: "Erie", from: WED, days: 1 })
    expect(wed.data[0]!.starts).toEqual(["17:00"])
  })

  it("visits.pick accepts an offered day only, and puts the visit on the person whose slot adds the least drive, with no time written", async () => {
    // Any of the soonest five open days may be picked (Wednesday has one start); a day beyond them, or a Sunday, was not offered.
    await expect(callApi(office(), visitsPick, { id: TARGET, day: "2027-05-04" })).rejects.toMatchObject({ code: "unprocessable" })
    await expect(callApi(office(), visitsPick, { id: TARGET, day: "2027-05-02" })).rejects.toMatchObject({ code: "unprocessable" })
    const out = await callApi(office(), visitsPick, { id: TARGET, day: TUE })
    expect(out).toMatchObject({ status: "scheduled", scheduledOn: TUE, personName: "Ryan Garner", startTime: null })
    // Her own booking leaves the day when she asks again: Tuesday is still offered to her, and her day is never offered back.
    const again = await callApi(office(), visitsAreaDays, { id: TARGET })
    expect(again.days).not.toContain(TUE)
  })

  it("a cancelled visit frees its slot: Tuesday gets more starts back", async () => {
    await db.update(s.visit).set({ status: "unscheduled", scheduledOn: null, personId: null }).where(eq(s.visit.id, TARGET))
    const [lastTue] = await db.select({ id: s.visit.id }).from(s.visit).where(and(eq(s.visit.scheduledOn, TUE), eq(s.visit.startTime, "15:00")))
    await db.update(s.visit).set({ status: "cancelled" }).where(eq(s.visit.id, lastTue!.id))
    const out = await callApi(read(), scheduleSlots, { service: "turn-on-8", town: "Erie", from: TUE, days: 1 })
    expect(out.data[0]!.starts).toEqual(["15:00", "15:30", "16:00", "16:30", "17:00"])
    await db.update(s.visit).set({ status: "scheduled" }).where(inArray(s.visit.id, [lastTue!.id]))
  })

  it("a Jobber calendar block removes the starts it covers", async () => {
    const person = (await db.select().from(s.person).where(eq(s.person.id, RYAN)))[0]!
    // 14:00 to 15:00 Mountain on Monday (MDT is UTC-6): no start overlaps it.
    await db.insert(s.jobberVisit).values({ id: `feed:${RYAN}:mon-block`, organizationId: person.organizationId, isBlock: true, title: "Out", startAt: new Date(`${MON}T20:00:00Z`), endAt: new Date(`${MON}T21:00:00Z`) })
    const out = await callApi(read(), scheduleSlots, { service: "turn-on-8", town: "Erie", from: MON, days: 1 })
    for (const blocked of ["13:30", "14:00", "14:30"]) expect(out.data[0]!.starts).not.toContain(blocked)
    expect(out.data[0]!.starts).toContain("12:00")
    expect(out.data[0]!.starts).toContain("15:00")
  })
})
