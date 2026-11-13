import { describe, expect, it } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, Visit } from "@/lib/admin/types"
import { TIME_ZONE } from "@/lib/admin/format"
import { approveVisits, dayVisits, exceptionCount, moveVisit, proposedCount, visitsByTruckAndDay, weekContext, weekDays, weekVisits } from "./schedule-model"

const data = snapshot as AdminData
const { trucks } = data.settings
// 12:56 pm in Denver on Thursday, November 12, 2026.
const TODAY = "2026-11-12T19:56:30Z"
const WEEK = "2026-11-09"

describe("the week's visits", () => {
  it("groups them by truck and day in stop order, with empty days present", () => {
    const grid = visitsByTruckAndDay(data.visits, WEEK, trucks, TIME_ZONE)
    expect([...grid.keys()]).toEqual(["truck-1", "truck-2"])
    const truck1 = grid.get("truck-1")!
    expect([...truck1.keys()]).toEqual(weekDays(WEEK))
    expect(truck1.get("2026-11-09")!.map((v) => v.stopOrder)).toEqual([1, 2, 3, 4, 5])
    expect(truck1.get("2026-11-12")!.map((v) => v.clientName)).toEqual(["Percy", "Alicia", "Ethan", "Matthew"])
    expect(truck1.get("2026-11-14")).toEqual([])
    expect([...grid.get("truck-2")!.values()].every((l) => l.length === 0)).toBe(true)
  })

  it("counts the proposals and the Jobber exceptions and writes the context line", () => {
    const week = weekVisits(data.visits, WEEK, TIME_ZONE)
    expect(proposedCount(week)).toBe(8)
    expect(exceptionCount(week)).toBe(2)
    expect(weekContext(WEEK, week)).toBe("Week of Nov 9. 8 proposed, 2 moved in Jobber.")
    expect(weekContext("2026-10-05", weekVisits(data.visits, "2026-10-05", TIME_ZONE))).toBe("Week of Oct 5. 25 visits.")
    expect(weekContext("2027-03-01", [])).toBe("Week of Mar 1. Nothing on the calendar.")
    expect(weekContext(WEEK, week.filter((v) => !v.exception))).toBe("Week of Nov 9. 8 proposed.")
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

describe("approveVisits", () => {
  it("clears the proposed flag on the given visits only", () => {
    const week = weekVisits(data.visits, WEEK, TIME_ZONE)
    const approved = approveVisits(data.visits, new Set(week.map((v) => v.id)))
    expect(proposedCount(approved)).toBe(0)
    expect(approved.filter((v) => v.proposed !== undefined)).toEqual([])
    const some = approveVisits(data.visits, new Set(["v477"]))
    expect(proposedCount(some)).toBe(7)
    expect(approveVisits(data.visits, new Set()).filter((v) => v.proposed)).toHaveLength(8)
  })
})
