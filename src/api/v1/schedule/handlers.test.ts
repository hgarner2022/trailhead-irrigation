// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, readKey, writeKey } from "../../test-helpers"
import { visitsMove } from "../visits/handlers"
import { scheduleDay, scheduleRun, scheduleSlots, scheduleWeek } from "./handlers"

let db: TestDb
beforeAll(async () => {
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
  it("is a stub that still needs the admin scope", async () => {
    await expect(callApi(ctxFor(db, adminKey), scheduleRun, { window: "blowout" })).rejects.toMatchObject({ code: "not_implemented" })
    await expect(callApi(ctxFor(db, writeKey), scheduleRun, { window: "blowout" })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, adminKey), scheduleRun, { window: "spring" })).rejects.toMatchObject({ code: "invalid" })
  })
})
