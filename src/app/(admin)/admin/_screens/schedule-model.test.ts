import { describe, expect, it } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, Visit } from "@/lib/admin/types"
import { TIME_ZONE } from "@/lib/admin/format"
import { dayVisits, weekDays, weekVisits } from "@/lib/admin/calendar"
import { exceptionCount, firstJobWeek, moveOutcome, moveVisit, nextJobsWeek, weekContext } from "./schedule-model"

const data = snapshot as AdminData
const { trucks } = data.settings
// 12:56 pm in Denver on Thursday, November 12, 2026.
const TODAY = "2026-11-12T19:56:30Z"
const WEEK = "2026-11-09"

describe("the week's visits", () => {
  it("lists a truck's day in stop order and an empty day as empty", () => {
    expect(weekDays(WEEK)).toHaveLength(7)
    const week = weekVisits(data.visits, WEEK, TIME_ZONE)
    expect(dayVisits(week, "2026-11-09", "truck-1", TIME_ZONE).map((v) => v.stopOrder)).toEqual([1, 2, 3, 4, 5])
    expect(dayVisits(week, "2026-11-12", "truck-1", TIME_ZONE).map((v) => v.clientName)).toEqual(["Percy", "Alicia", "Ethan", "Matthew"])
    expect(dayVisits(week, "2026-11-14", "truck-1", TIME_ZONE)).toEqual([])
    expect(dayVisits(week, "2026-11-10", "truck-2", TIME_ZONE)).toEqual([])
  })

  it("counts the moved visits and writes the context line", () => {
    const week = weekVisits(data.visits, WEEK, TIME_ZONE)
    expect(exceptionCount(week)).toBe(2)
    expect(weekContext(WEEK, week)).toBe(`Week of Nov 9. ${week.length} visits, 2 moved.`)
    expect(weekContext("2026-10-05", weekVisits(data.visits, "2026-10-05", TIME_ZONE))).toBe("Week of Oct 5. 25 visits.")
    expect(weekContext("2027-03-01", [])).toBe("Week of Mar 1. Nothing on the calendar.")
    expect(weekContext(WEEK, week.filter((v) => !v.exception))).toBe(`Week of Nov 9. ${week.length - 2} visits.`)
  })
})

describe("moveVisit", () => {
  const move = (id: string, truckId: string, day: string) => moveVisit(data.visits, id, truckId, day, trucks, TIME_ZONE)
  const find = (visits: Visit[], id: string) => visits.find((v) => v.id === id)!

  it("moves a visit to another day on the same truck, keeping its clock time and landing last", () => {
    const moved = move("v478", "truck-1", "2026-11-13") // Alicia, Thursday stop 2 of 4, to Friday with 4 stops
    const alicia = find(moved, "v478")
    expect(alicia.startAt).toBe("2026-11-13T20:00:00Z")
    expect(alicia.truckId).toBe("truck-1")
    expect(alicia.stopOrder).toBe(5)
    expect(dayVisits(moved, "2026-11-12", "truck-1", TIME_ZONE).map((v) => [v.clientName, v.stopOrder])).toEqual([["Percy", 1], ["Ethan", 2], ["Matthew", 3]])
    expect(dayVisits(moved, "2026-11-13", "truck-1", TIME_ZONE).map((v) => v.clientName)).toEqual(["David", "Ricky", "Joel", "Brian", "Alicia"])
  })

  it("moves a visit to the other truck on the same day", () => {
    const moved = move("v478", "truck-2", "2026-11-12")
    expect(find(moved, "v478")).toMatchObject({ truckId: "truck-2", startAt: "2026-11-12T20:00:00Z", stopOrder: 1 })
    expect(dayVisits(moved, "2026-11-12", "truck-1", TIME_ZONE)).toHaveLength(3)
  })

  it("refuses a day the truck does not work, an unknown visit and a no-op", () => {
    expect(move("v478", "truck-1", "2026-11-14")).toBe(data.visits) // Truck 1 has no Saturday
    expect(move("v478", "truck-2", "2026-11-14")).not.toBe(data.visits)
    expect(move("nope", "truck-1", "2026-11-13")).toBe(data.visits)
    expect(move("v478", "truck-1", "2026-11-12")).toBe(data.visits)
  })

  it("leaves every other visit untouched", () => {
    const moved = move("v481", "truck-2", "2026-11-10")
    const others = (visits: Visit[]) => visits.filter((v) => v.id !== "v481" && !["v482", "v483", "v484"].includes(v.id))
    expect(others(moved)).toEqual(others(data.visits))
  })
})

describe("moveVisit keeps the Mountain wall-clock time across a clock change", () => {
  const six = { ...trucks[0], workingDays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as typeof trucks[0]["workingDays"] }
  const one = (startAt: string): Visit[] => [{ id: "m", clientId: "c", clientName: "A", town: "Erie", kind: "blowout", status: "scheduled", startAt, isPass: false, jobberUrl: "", truckId: "truck-1", stopOrder: 1 }]
  const moved = (startAt: string, day: string) => moveVisit(one(startAt), "m", "truck-1", day, [six], TIME_ZONE)[0].startAt

  it("moves 9 am MDT on Oct 30 to 9 am MST on Nov 2 (clocks fell back on Nov 1)", () => {
    expect(moved("2026-10-30T15:00:00Z", "2026-11-02")).toBe("2026-11-02T16:00:00Z")
  })
  it("moves 9 am MST on Nov 2 back to 9 am MDT on Oct 30", () => {
    expect(moved("2026-11-02T16:00:00Z", "2026-10-30")).toBe("2026-10-30T15:00:00Z")
  })
  it("moves 9 am MST on Mar 12 2027 to 9 am MDT on Mar 15 (clocks sprang forward on Mar 14)", () => {
    expect(moved("2027-03-12T16:00:00Z", "2027-03-15")).toBe("2027-03-15T15:00:00Z")
  })
  it("keeps the same instant shift on an ordinary week", () => {
    expect(moved("2026-11-09T17:00:00Z", "2026-11-10")).toBe("2026-11-10T17:00:00Z")
  })
})

describe("moveOutcome", () => {
  const percy = data.visits.find((v) => v.id === "v477") // Percy, Erie, Truck 1, Thursday Nov 12
  it("moves and says where", () => {
    const out = moveOutcome(data.visits, "v477", "truck-2", "2026-11-13", trucks, TIME_ZONE)
    expect(out.moved).toBe(true)
    expect(out.message).toBe(`Moved ${percy!.clientName} to Truck 2 on Friday, November 13.`)
    expect(out.visits.find((v) => v.id === "v477")).toMatchObject({ truckId: "truck-2" })
  })
  it("refuses a day the truck does not work and says why, leaving the list as it was", () => {
    const out = moveOutcome(data.visits, "v477", "truck-1", "2026-11-14", trucks, TIME_ZONE)
    expect(out.moved).toBe(false)
    expect(out.visits).toBe(data.visits)
    expect(out.message).toBe(`Truck 1 does not work Saturday, so ${percy!.clientName} stays on Thursday, November 12.`)
  })
  it("says so when the visit is already there", () => {
    const out = moveOutcome(data.visits, "v477", "truck-1", "2026-11-12", trucks, TIME_ZONE)
    expect(out.moved).toBe(false)
    expect(out.message).toBe(`${percy!.clientName} is already on Truck 1 on Thursday, November 12.`)
  })
})

describe("to schedule tray, placing and scheduling", async () => {
  const { trayItems, placeVisit, scheduleItems, firstWorkingDay } = await import("./schedule-model")
  const snapshot = (await import("@/lib/admin/fixtures/snapshot.json")).default as import("@/lib/admin/types").AdminData
  const tz = "America/Denver"

  it("lists every job of an active pass with no day, earliest window first, earlier preferences first", () => {
    const items = trayItems(snapshot)
    expect(items.length).toBeGreaterThan(10)
    expect(items.every((i) => i.passId)).toBe(true)
    expect(items.some((i) => i.window === "Open job")).toBe(false)
    const keys = items.map((i) => i.sortKey)
    expect([...keys].sort()).toEqual(keys)
    const cancelled = snapshot.passes.find((p) => p.status === "cancelled")!
    expect(items.some((i) => i.passId === cancelled.id)).toBe(false)
    const done = snapshot.passes[0].visits.find((v) => v.completedAt)!
    expect(items.some((i) => i.passId === snapshot.passes[0].id && i.kind === done.kind)).toBe(false)
  })

  it("places an item on a truck-day as a scheduled visit, last in the day, once", () => {
    const truck = snapshot.settings.trucks[0]
    const item = trayItems(snapshot)[0]
    const day = firstWorkingDay(truck, "2027-05-03")
    const placed = placeVisit(snapshot.visits, item, truck.id, day, tz)
    const visit = placed.find((v) => v.id === item.id)!
    expect(visit).toMatchObject({ status: "scheduled", truckId: truck.id, clientName: item.clientName, kind: item.kind })
    expect("proposed" in visit || "firm" in visit).toBe(false)
    expect(visit.startAt?.slice(0, 10)).toBe(day)
    expect(placeVisit(placed, item, truck.id, day, tz)).toBe(placed)
    expect(trayItems({ visits: placed, passes: snapshot.passes }).some((i) => i.id === item.id)).toBe(false)
  })

  it("never lists a pending pass's jobs, a job that has a day, or a cancelled pass's jobs", () => {
    const pending = snapshot.passes.find((p) => p.status === "pending")!
    expect(pending.visits.every((v) => v.scheduledAt || v.window)).toBe(true)
    const items = trayItems(snapshot)
    expect(items.some((i) => i.passId === pending.id)).toBe(false)
    // Every item is a pass visit with no day: the tray and the Passes panel read the same row.
    const noDay = new Set(snapshot.passes.filter((p) => p.status === "active").flatMap((p) => p.visits.filter((v) => !v.scheduledAt && !v.completedAt).map((v) => `${p.id}:${v.kind}`)))
    expect(new Set(items.map((i) => `${i.passId}:${i.kind}`))).toEqual(noDay)
    // The same pass visit with a day, or on the pending pass, drops out.
    const dated = { ...snapshot, passes: snapshot.passes.map((p) => (p.id === items[0].passId ? { ...p, visits: p.visits.map((v) => (v.kind === items[0].kind ? { ...v, scheduledAt: "2027-05-03T16:00:00Z", scheduledOn: "2027-05-03" } : v)) } : p)) }
    expect(trayItems(dated)).toHaveLength(items.length - 1)
    expect(trayItems({ ...snapshot, passes: snapshot.passes.map((p) => ({ ...p, status: "pending" as const })) })).toEqual([])
  })

  it("uses the visit's own id when the pass carries it, so Place moves the real visit", () => {
    const withIds = { ...snapshot, passes: snapshot.passes.map((p) => ({ ...p, visits: p.visits.map((v) => ({ ...v, id: `${p.id}-${v.kind}` })) })) }
    expect(trayItems(withIds).every((i) => i.id === `${i.passId}-${i.kind}`)).toBe(true)
  })

  it("schedules every tray item that is not waiting for its customer, round-robin over the trucks' working days", () => {
    const items = trayItems(snapshot).map((i, n) => (n % 5 === 0 ? { ...i, awaitingPick: true } : i))
    const waiting = items.filter((i) => i.awaitingPick)
    expect(waiting.length).toBeGreaterThan(0)
    const { visits, placed, waiting: left } = scheduleItems(snapshot.visits, items, snapshot.settings.trucks, "2027-05-03", tz)
    expect(placed).toBe(items.length - waiting.length)
    expect(left).toBe(waiting.length)
    const after = trayItems({ visits, passes: snapshot.passes })
    expect(after.map((i) => i.id)).toEqual(waiting.map((i) => i.id))
    const days = new Set(visits.filter((v) => items.some((i) => i.id === v.id)).map((v) => `${v.truckId}:${v.startAt?.slice(0, 10)}`))
    expect(days.size).toBeGreaterThan(1)
    expect(scheduleItems(snapshot.visits, items, [], "2027-05-03", tz)).toEqual({ visits: snapshot.visits, placed: 0, waiting: waiting.length })
  })
})

describe("which week the Schedule opens on", () => {
  const visit = (id: string, startAt: string, status: Visit["status"] = "scheduled"): Visit => ({ id, clientId: "c", clientName: "A", town: "Erie", kind: "turn-on", status, startAt, isPass: true, jobberUrl: "" })

  it("opens on the first week that has a job, not on an empty week", () => {
    // Today is Thursday Nov 12; the first job is April 27, 2027 (the week of Apr 26).
    expect(firstJobWeek([visit("a", "2027-04-27T15:00:00Z"), visit("b", "2027-05-10T15:00:00Z")], TODAY, TIME_ZONE)).toBe("2027-04-26")
  })

  it("opens on this week when it has a job, even one earlier in the week", () => {
    expect(firstJobWeek([visit("a", "2026-11-10T15:00:00Z"), visit("b", "2027-04-27T15:00:00Z")], TODAY, TIME_ZONE)).toBe("2026-11-09")
  })

  it("opens on today's week when nothing is ahead, and skips cancelled and past jobs", () => {
    expect(firstJobWeek([], TODAY, TIME_ZONE)).toBe("2026-11-09")
    expect(firstJobWeek([visit("old", "2026-10-01T15:00:00Z"), visit("gone", "2027-04-27T15:00:00Z", "cancelled")], TODAY, TIME_ZONE)).toBe("2026-11-09")
  })

  it("names the next week with jobs after an empty one, or nothing", () => {
    const visits = [visit("a", "2027-04-27T15:00:00Z")]
    expect(nextJobsWeek(visits, "2026-11-09", TIME_ZONE)).toBe("2027-04-26")
    expect(nextJobsWeek(visits, "2027-04-26", TIME_ZONE)).toBeUndefined()
    expect(nextJobsWeek([], "2026-11-09", TIME_ZONE)).toBeUndefined()
  })
})
