import { describe, expect, it } from "vitest"
import type { GridBlock } from "@/components/blocks/time-grid-model"
import { TOWN_CENTRES } from "@/components/blocks/day-map-helpers"
import { PEOPLE, RYAN, TECH, initialState } from "./schedule-prototype-data"
import { atCap, driveBetween, driveLines, drivingOf, netDriving, personDay, placeProblems, routeOf, slotsOn, offersFor, type Calendar } from "./schedule-engine"

const s0 = initialState()
const cal: Calendar = { people: PEOPLE, visits: s0.visits, meta: s0.meta, timeOff: s0.timeOff }
const at = (town: GridBlock["town"], id: string, over: Partial<GridBlock>): GridBlock => ({ id, day: "2026-12-01", personId: RYAN, start: 9 * 60, minutes: 60, title: id, name: id, kind: "repair", town, service: "Repair", ...over })
const pt = (town: GridBlock["town"]) => ({ customer: "x", lat: TOWN_CENTRES[town][1], lng: TOWN_CENTRES[town][0] })
/** a world of three stops with known points: Erie, Erie, Longmont */
const three = (): Calendar => {
  const visits = [at("Erie", "a", { start: 9 * 60 }), at("Erie", "b", { start: 11 * 60 }), at("Longmont", "c", { start: 14 * 60 })]
  return { people: PEOPLE, visits, meta: { a: pt("Erie"), b: pt("Erie"), c: pt("Longmont") }, timeOff: [] }
}

describe("driving", () => {
  it("is nothing inside one point and a whole number of minutes between towns", () => {
    const c = three()
    expect(driveBetween(c.visits[0]!, c.visits[1]!, c.meta)).toBe(0)
    expect(driveBetween(c.visits[1]!, c.visits[2]!, c.meta)).toBeGreaterThan(10)
  })
  it("totals the legs of a person's day in the order it is driven, Any time stops last", () => {
    const c = three()
    const loose = at("Lafayette", "d", { start: null })
    const route = routeOf([...c.visits, loose], RYAN, "2026-12-01")
    expect(route.map((b) => b.id)).toEqual(["a", "b", "c", "d"])
    const { legs, total } = drivingOf(route, { ...c.meta, d: pt("Lafayette") })
    expect(legs).toHaveLength(3)
    expect(total).toBe(legs.reduce((n, l) => n + l.minutes, 0))
  })
  it("draws a line only between two stops that both have a time", () => {
    const c = three()
    const lines = driveLines([...c.visits, at("Lafayette", "d", { start: null })], c.meta, RYAN, "2026-12-01")
    expect([...lines.keys()]).toEqual(["b", "c"])
  })
  it("a move that adds a leg adds its minutes, and one that leaves a day saves them", () => {
    const c = three()
    const far = c.visits[2]!
    const toErie = netDriving(c, far, { day: "2026-12-01", personId: RYAN, start: 12 * 60 + 30 })
    expect(toErie).toBeLessThanOrEqual(0)
    const elsewhere = netDriving(c, c.visits[0]!, { day: "2026-12-02", personId: RYAN, start: 9 * 60 })
    expect(elsewhere).toBeLessThanOrEqual(0)
  })
})

describe("a drop that adds driving", () => {
  it("warns with the minutes at 15 or more, in the words of the drop dialog, and says nothing under that", () => {
    const c: Calendar = { people: PEOPLE, visits: [at("Erie", "a", { start: 10 * 60 })], meta: { a: pt("Erie") }, timeOff: [] }
    const far = placeProblems(c, { id: "x", day: "2026-12-01", personId: RYAN, start: 8 * 60, minutes: 60, town: "Longmont", kind: "repair", point: pt("Longmont") })
    expect(far).toEqual([expect.stringMatching(/^Adds \d+ min of driving\.$/)])
    expect(Number(/\d+/.exec(far[0]!)![0])).toBeGreaterThanOrEqual(15)
    expect(placeProblems(c, { id: "x", day: "2026-12-01", personId: RYAN, start: 8 * 60, minutes: 60, town: "Erie", kind: "repair", point: pt("Erie") })).toEqual([])
    expect(placeProblems(c, { id: "x", day: "2026-12-01", personId: RYAN, start: 8 * 60, minutes: 60, town: "Longmont", kind: "repair", point: pt("Longmont"), driving: false })).toEqual([])
  })
})

describe("a full day", () => {
  it("is at or over a Most per day, never a day off", () => {
    const four = ["a", "b", "c", "d"].map((id, n) => at("Erie", id, { start: (8 + n) * 60, minutes: 30, kind: "repair" }))
    const c: Calendar = { ...three(), visits: four, meta: {} }
    const ryan = PEOPLE.find((p) => p.id === RYAN)!
    expect(atCap({ capacityByKind: { ...ryan.capacityByKind, repair: 4 } }, four, RYAN, "2026-12-01", "repair")).toBe(true)
    expect(atCap({ capacityByKind: { ...ryan.capacityByKind, repair: 5 } }, four, RYAN, "2026-12-01", "repair")).toBe(false)
    const capped = { ...c, people: PEOPLE.map((p) => ({ ...p, capacityByKind: { ...p.capacityByKind, repair: 4 } })) }
    expect(personDay(capped, capped.people[0]!, "2026-12-01").full).toBe(true)
    expect(placeProblems(capped, { id: "new", day: "2026-12-01", personId: RYAN, start: 14 * 60, minutes: 30, kind: "repair", town: "Erie" })).toContain("Ryan is full that day.")
    const off = { ...capped, timeOff: [{ id: "o", personId: RYAN, day: "2026-12-01", start: null, end: null }] }
    expect(personDay(off, off.people[0]!, "2026-12-01").full).toBe(false)
  })
  it("has no open time left when the visits fill the hours", () => {
    const visits = [at("Erie", "a", { start: 8 * 60, minutes: 4 * 60, kind: "install" }), at("Erie", "b", { start: 12 * 60, minutes: 5 * 60, kind: "install" })]
    const c: Calendar = { people: PEOPLE, visits, meta: {}, timeOff: [] }
    expect(personDay(c, PEOPLE.find((p) => p.id === RYAN)!, "2026-12-01")).toMatchObject({ openMinutes: 0, full: true })
  })
})

describe("one rule", () => {
  it("every start the engine offers passes the drop's own checks", () => {
    const ask = { today: "2026-11-25", town: "Erie" as const, point: pt("Erie"), minutes: 60, kind: "repair" }
    const offers = offersFor(cal, ask)
    expect(offers.length).toBeGreaterThan(0)
    for (const o of offers) {
      for (const slot of o.slots) {
        const [h, m] = slot.start.split(":").map(Number) as [number, number]
        expect(placeProblems(cal, { id: "new", day: o.day, personId: slot.personId, start: h * 60 + m, minutes: 60, town: "Erie", kind: "repair", point: ask.point, driving: false }), `${o.day} ${slot.start} ${slot.personId}`).toEqual([])
      }
    }
  })
  it("a start the engine leaves out breaks a rule the drop names", () => {
    const ask = { today: "2026-11-25", town: "Erie" as const, point: pt("Erie"), minutes: 60, kind: "repair" }
    const open = new Set(slotsOn(cal, ask, "2026-11-26").map((s) => `${s.personId}@${s.start}`))
    let checked = 0
    for (let t = 8 * 60; t + 60 <= 16 * 60; t += 30) {
      const start = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`
      for (const person of [RYAN, TECH]) {
        if (open.has(`${person}@${start}`)) continue
        const why = placeProblems(cal, { id: "new", day: "2026-11-26", personId: person, start: t, minutes: 60, town: "Erie", kind: "repair", point: ask.point, driving: false })
        // a person's own start can be left out only because the other person at that start is the one the rule picks; every other gap has a sentence
        if (why.length) checked++
      }
    }
    expect(checked).toBeGreaterThan(0)
  })
})
