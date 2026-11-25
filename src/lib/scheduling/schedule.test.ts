import { describe, expect, it } from "vitest"
import { defaultWindows } from "@/lib/settings/defaults"
import { preferredRange, scheduleVisits, type ScheduleInput } from "./schedule"
import type { SchedArea, SchedPerson, SchedVisit, Town } from "./types"

const person = (id: string, over: Partial<SchedPerson> = {}): SchedPerson => ({ id, name: id === "t1" ? "Ryan Garner" : "Tech Two", truck: id === "t1" ? "Truck 1" : "Truck 2", workingDays: ["mon", "tue", "wed", "thu", "fri"], capacityByKind: { "turn-on": 8, inspection: 6, blowout: 14, repair: 4, other: 2 }, ...over })
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
  scheduleVisits({ visits, people: [person("t1")], areas, settings, from: "2027-04-26", taken: [], blocks: [], ...over })
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

  it("keeps a person's day to one area group", () => {
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
    const one = person("t1", { capacityByKind: { "turn-on": 1, inspection: 1, blowout: 1, repair: 1, other: 1 }, workingDays: ["tue"] })
    const r = run([v("late", "Erie", { preference: "later" }), v("early", "Erie", { preference: "earlier" })], { people: [one] })
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

  it("reads the turn-on's real window as early (Apr 15 to 30), recommended (May 1 to 15) and late (May 16 to 31)", () => {
    const window = defaultWindows(2027)[0]!
    expect(preferredRange(window, "earlier")).toEqual({ from: "2027-04-15", to: "2027-04-30" })
    expect(preferredRange(window, "recommended")).toEqual({ from: "2027-05-01", to: "2027-05-15" })
    expect(preferredRange(window, "later")).toEqual({ from: "2027-05-16", to: "2027-05-31" })
    expect(preferredRange(window)).toEqual({ from: "2027-05-01", to: "2027-05-15" })
  })

  it("falls back to the whole window when the preferred third is full", () => {
    const one = person("t1", { capacityByKind: { "turn-on": 1, inspection: 1, blowout: 1, repair: 1, other: 1 } })
    const visits = Array.from({ length: 6 }, (_, i) => v(`e${i}`, "Erie", { preference: "earlier" }))
    const r = run(visits, { people: [one] })
    expect(r.placed).toHaveLength(6)
    expect(r.placed.some((p) => p.day > "2027-05-06")).toBe(true)
  })

  it("stays under each person's capacity in visits, counting what is taken", () => {
    const one = person("t1", { capacityByKind: { "turn-on": 2, inspection: 2, blowout: 2, repair: 2, other: 2 }, workingDays: ["mon"] })
    const taken = [{ personId: "t1", day: "2027-05-03", kind: "turn-on", town: "Erie" as const, minutes: 60 }]
    const r = run(["a", "b", "c"].map((id) => v(id, "Erie")), { people: [one], taken })
    const count = (day: string) => r.placed.filter((p) => p.day === day).length
    expect(count("2027-05-03")).toBe(1)
    expect(count("2027-05-10")).toBe(2)
  })

  it("stays under capacity in minutes", () => {
    const r = run(["a", "b"].map((id) => v(id, "Erie", { durationMinutes: 400 })), { people: [person("t1", { workingDays: ["mon"] })] })
    expect(r.placed.map((p) => p.day)).toEqual(["2027-05-03", "2027-05-10"])
  })

  it("subtracts the busy blocks on a person's Jobber calendar", () => {
    const allDay = [{ personId: "t1", startAt: "2027-05-03T06:00:00Z", endAt: "2027-05-04T06:00:00Z", title: "Out" }]
    const r = run([v("a", "Erie")], { people: [person("t1", { workingDays: ["mon"] })], blocks: allDay })
    expect(where(r, "a")!.day).toBe("2027-05-10")
  })

  it("walks the people in turn: the second person takes the day's overflow in the same area", () => {
    const small = { "turn-on": 1, inspection: 1, blowout: 1, repair: 1, other: 1 }
    const r = run([v("a", "Erie", { preference: "earlier" }), v("b", "Erie", { preference: "earlier" })], { people: [person("t1", { capacityByKind: small }), person("t2", { capacityByKind: small })] })
    expect(where(r, "a")).toMatchObject({ day: "2027-05-03", personId: "t1" })
    expect(where(r, "b")).toMatchObject({ day: "2027-05-03", personId: "t2" })
  })

  it("reports a visit that has no room before its window closes as unplaced, with the reason", () => {
    const none = person("t1", { workingDays: [] })
    const r = run([v("a", "Erie")], { people: [none], from: "2027-05-03" })
    expect(r.placed).toEqual([])
    expect(r.unplaced).toEqual([{ visitId: "a", reason: "No one has room for a turn-on before 2027-05-14" }])
  })

  it("gives the same answer for the same inputs, whatever order they arrive in", () => {
    const visits = ["a", "b", "c", "d", "e"].map((id, i) => v(id, (["Erie", "Longmont", "Lafayette", "Firestone", "Erie"] as Town[])[i]!))
    const forward = run(visits, { people: [person("t1"), person("t2")] })
    const backward = run([...visits].reverse(), { people: [person("t2"), person("t1")] })
    expect(backward).toEqual(forward)
  })
})
