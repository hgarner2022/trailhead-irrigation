import { describe, expect, it } from "vitest"
import { areaOrder, capacityFor, isInWindow, townOrder, workingDays } from "./calendar"
import type { SchedArea } from "./types"

const truck = { capacityByKind: { "turn-on": 8, inspection: 6, blowout: 14, repair: 4, other: 0 }, workingDays: ["mon", "tue", "wed", "thu", "fri"] as const }
const settings = { bufferPercentEarly: 25, bufferPercentLate: 15 }

describe("workingDays", () => {
  it("lists the weekdays a truck works between two days, both included", () => {
    expect(workingDays({ ...truck, workingDays: ["mon", "tue", "wed", "thu", "fri"] }, "2027-05-07", "2027-05-11")).toEqual(["2027-05-07", "2027-05-10", "2027-05-11"])
  })
  it("gives a truck out of service no days", () => {
    expect(workingDays({ workingDays: ["mon"], active: false }, "2027-05-03", "2027-05-10")).toEqual([])
  })
})

describe("isInWindow", () => {
  const w = { opensOn: "2027-05-01", closesOn: "2027-05-31" }
  it("includes both ends and excludes the days around them", () => {
    expect([isInWindow(w, "2027-04-30"), isInWindow(w, "2027-05-01"), isInWindow(w, "2027-05-31"), isInWindow(w, "2027-06-01")]).toEqual([false, true, true, false])
  })
})

describe("capacityFor", () => {
  it("holds back the early buffer in a window's first two weeks and the late one after", () => {
    expect(capacityFor(truck, "turn-on", "2027-05-10", settings, "2027-05-01")).toEqual({ visits: 6, minutes: 450 })
    expect(capacityFor(truck, "turn-on", "2027-05-15", settings, "2027-05-01")).toEqual({ visits: 6, minutes: 510 })
    expect(capacityFor(truck, "blowout", "2027-10-20", settings, "2027-10-01")).toEqual({ visits: 11, minutes: 510 })
  })
  it("uses the late buffer with no window start, keeps one visit when the buffer would round to none and none for a kind with no room", () => {
    expect(capacityFor(truck, "repair", "2027-05-10", settings).visits).toBe(3)
    expect(capacityFor({ ...truck, capacityByKind: { ...truck.capacityByKind, repair: 1 } }, "repair", "2027-05-10", settings).visits).toBe(1)
    expect(capacityFor(truck, "other", "2027-05-10", settings).visits).toBe(0)
  })
})

describe("townOrder", () => {
  const areas: SchedArea[] = [
    { id: "a", name: "Erie and Firestone", towns: ["Erie", "Firestone"], springOrder: 3, fallOrder: 0 },
    { id: "b", name: "Longmont", towns: ["Longmont"], springOrder: 2, fallOrder: 1 },
    { id: "c", name: "Louisville and Lafayette", towns: ["Louisville", "Lafayette"], springOrder: 0, fallOrder: 3 },
  ]
  it("runs the areas in the season's order, each area's towns as listed", () => {
    expect(townOrder(areas, "fall")).toEqual(["Erie", "Firestone", "Longmont", "Louisville", "Lafayette"])
    expect(townOrder(areas, "spring")).toEqual(["Louisville", "Lafayette", "Longmont", "Erie", "Firestone"])
    expect(areaOrder(areas, "fall").map((a) => a.id)).toEqual(["a", "b", "c"])
  })
})
