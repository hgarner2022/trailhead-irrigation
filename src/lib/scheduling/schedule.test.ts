import { describe, expect, it } from "vitest"
import { preferredRange, scheduleVisits, type ScheduleInput } from "./schedule"
import type { SchedArea, SchedTruck, SchedVisit, Town } from "./types"

const truck = (id: string, over: Partial<SchedTruck> = {}): SchedTruck => ({ id, name: id, workingDays: ["mon", "tue", "wed", "thu", "fri"], capacityByKind: { "turn-on": 8, inspection: 6, blowout: 14, repair: 4, other: 2 }, ...over })
const areas: SchedArea[] = [
  { id: "north", name: "Erie and Firestone", towns: ["Erie", "Firestone"], springOrder: 3, fallOrder: 0 },
  { id: "lm", name: "Longmont", towns: ["Longmont"], springOrder: 2, fallOrder: 1 },
  { id: "south", name: "Louisville and Lafayette", towns: ["Louisville", "Lafayette"], springOrder: 0, fallOrder: 3 },
]
const settings = {
  windows: [
    { kind: "turn-on" as const, opensOn: "2027-05-03", closesOn: "2027-05-14", leadWeeks: 4 },
    { kind: "blowout" as const, opensOn: "2027-10-04", closesOn: "2027-10-29", leadWeeks: 2 },
  ],
  bufferPercentEarly: 0,
  bufferPercentLate: 0,
}
const v = (id: string, town: Town, over: Partial<SchedVisit> = {}): SchedVisit => ({ id, kind: "turn-on", town, preference: "recommended", ...over })
const run = (visits: SchedVisit[], over: Partial<ScheduleInput> = {}) =>
  scheduleVisits({ visits, trucks: [truck("t1")], areas, settings, from: "2027-04-26", taken: [], blocks: [], ...over })
const where = (r: ReturnType<typeof run>, id: string) => r.placed.find((p) => p.visitId === id)

describe("scheduleVisits", () => {
  it("places a visit on a working day inside its window, never before the run's day", () => {
    const r = run([v("a", "Erie")], { from: "2027-05-08" })
    expect(where(r, "a")!.day >= "2027-05-10").toBe(true)
    expect(where(r, "a")!.day <= "2027-05-14").toBe(true)
    expect(["Sat", "Sun"]).not.toContain(new Date(`${where(r, "a")!.day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }))
  })

  it("leaves a window that opens beyond its lead weeks for a later run, neither placed nor unplaced", () => {
    const r = run([v("a", "Erie", { preference: "earlier" })], { from: "2027-04-01" })
    expect(r).toMatchObject({ placed: [], unplaced: [], deferred: ["a"] })
    expect(run([v("a", "Erie", { preference: "earlier" })], { from: "2027-04-05" }).placed).toHaveLength(1)
  })

  it("uses the blowout's two-week lead: a run in mid-September leaves October visits for a later run", () => {
    const b = v("b", "Erie", { kind: "blowout", preference: "earlier" })
    expect(run([b], { from: "2027-09-13" }).deferred).toEqual(["b"])
    expect(run([b], { from: "2027-09-21" }).placed).toHaveLength(1)
  })

  it("commits only the days the lead time reaches", () => {
    const r = run([v("a", "Erie", { preference: "later" })], { from: "2027-04-12" })
    expect(r.placed).toEqual([])
    expect(r.deferred).toEqual(["a"])
  })

  it("never places a visit whose customer must be home", () => {
    const r = run([v("a", "Erie", { needsCustomerHome: true }), v("b", "Erie")])
    expect(r.waiting).toEqual(["a"])
    expect(r.placed.map((p) => p.visitId)).toEqual(["b"])
  })

  it("keeps a truck-day to one area group", () => {
    const r = run([v("a", "Erie"), v("b", "Longmont"), v("c", "Firestone")])
    expect(where(r, "a")!.day).toBe(where(r, "c")!.day)
    expect(where(r, "b")!.day).not.toBe(where(r, "a")!.day)
  })

  it("works the season's town order: fall starts north, spring starts south", () => {
    const fall = run([v("a", "Lafayette", { kind: "blowout", preference: "earlier" }), v("b", "Erie", { kind: "blowout", preference: "earlier" })], { from: "2027-09-27" })
    expect(where(fall, "b")!.day < where(fall, "a")!.day).toBe(true)
    const spring = run([v("a", "Lafayette"), v("b", "Erie")])
    expect(where(spring, "a")!.day < where(spring, "b")!.day).toBe(true)
  })

  it("serves an earlier preference before a later one when there is only one seat", () => {
    const one = truck("t1", { capacityByKind: { "turn-on": 1, inspection: 1, blowout: 1, repair: 1, other: 1 }, workingDays: ["tue"] })
    const r = run([v("late", "Erie", { preference: "later" }), v("early", "Erie", { preference: "earlier" })], { trucks: [one] })
    expect(where(r, "early")!.day).toBe("2027-05-04")
    expect(where(r, "late")!.day > "2027-05-04").toBe(true)
  })

  it("keeps a visit inside its preferred third while that third has room", () => {
    const early = preferredRange(settings.windows[0]!, "earlier")
    const late = preferredRange(settings.windows[0]!, "later")
    expect(early).toEqual({ from: "2027-05-03", to: "2027-05-06" })
    expect(late).toEqual({ from: "2027-05-11", to: "2027-05-14" })
    const r = run([v("a", "Erie", { preference: "later" })])
    expect(where(r, "a")!.day >= late.from).toBe(true)
  })

  it("falls back to the whole window when the preferred third is full", () => {
    const one = truck("t1", { capacityByKind: { "turn-on": 1, inspection: 1, blowout: 1, repair: 1, other: 1 } })
    const visits = Array.from({ length: 6 }, (_, i) => v(`e${i}`, "Erie", { preference: "earlier" }))
    const r = run(visits, { trucks: [one] })
    expect(r.placed).toHaveLength(6)
    expect(r.placed.some((p) => p.day > "2027-05-06")).toBe(true)
  })

  it("stays under each truck-day's capacity in visits, counting what is taken", () => {
    const one = truck("t1", { capacityByKind: { "turn-on": 2, inspection: 2, blowout: 2, repair: 2, other: 2 }, workingDays: ["mon"] })
    const taken = [{ truckId: "t1", day: "2027-05-03", kind: "turn-on", town: "Erie" as const, minutes: 60 }]
    const r = run(["a", "b", "c"].map((id) => v(id, "Erie")), { trucks: [one], taken })
    const count = (day: string) => r.placed.filter((p) => p.day === day).length
    expect(count("2027-05-03")).toBe(1)
    expect(count("2027-05-10")).toBe(2)
  })

  it("stays under capacity in minutes", () => {
    const r = run(["a", "b"].map((id) => v(id, "Erie", { durationMinutes: 400 })), { trucks: [truck("t1", { workingDays: ["mon"] })] })
    expect(r.placed.map((p) => p.day)).toEqual(["2027-05-03", "2027-05-10"])
  })

  it("subtracts the busy blocks on a truck's Jobber calendar", () => {
    const allDay = [{ truckId: "t1", startAt: "2027-05-03T06:00:00Z", endAt: "2027-05-04T06:00:00Z", title: "Out" }]
    const r = run([v("a", "Erie")], { trucks: [truck("t1", { workingDays: ["mon"] })], blocks: allDay })
    expect(where(r, "a")!.day).toBe("2027-05-10")
  })

  it("walks the trucks in turn: the second truck takes the day's overflow in the same area", () => {
    const small = { "turn-on": 1, inspection: 1, blowout: 1, repair: 1, other: 1 }
    const r = run([v("a", "Erie", { preference: "earlier" }), v("b", "Erie", { preference: "earlier" })], { trucks: [truck("t1", { capacityByKind: small }), truck("t2", { capacityByKind: small })] })
    expect(where(r, "a")).toMatchObject({ day: "2027-05-03", truckId: "t1" })
    expect(where(r, "b")).toMatchObject({ day: "2027-05-03", truckId: "t2" })
  })

  it("reports a visit that has no room before its window closes as unplaced, with the reason", () => {
    const none = truck("t1", { workingDays: [] })
    const r = run([v("a", "Erie")], { trucks: [none], from: "2027-05-03" })
    expect(r.placed).toEqual([])
    expect(r.unplaced).toEqual([{ visitId: "a", reason: "No turn-on truck-day has room before 2027-05-14" }])
  })

  it("gives the same answer for the same inputs, whatever order they arrive in", () => {
    const visits = ["a", "b", "c", "d", "e"].map((id, i) => v(id, (["Erie", "Longmont", "Lafayette", "Firestone", "Erie"] as Town[])[i]!))
    const forward = run(visits, { trucks: [truck("t1"), truck("t2")] })
    const backward = run([...visits].reverse(), { trucks: [truck("t2"), truck("t1")] })
    expect(backward).toEqual(forward)
  })
})
