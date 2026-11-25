import { describe, expect, it } from "vitest"
import { TOWN_CENTRES } from "@/components/blocks/day-map-helpers"
import type { GridBlock } from "@/components/blocks/time-grid-model"
import { PEOPLE, RYAN, initialState } from "./schedule-prototype-data"
import { reduce, type ProtoJob } from "./schedule-prototype-model"
import { drivingOf, routeOf, placeProblems, type Calendar } from "./schedule-engine"
import { orderDay } from "./schedule-order"
import { scheduleAllPlan } from "./schedule-all"

const DAY = "2026-12-01"
const at = (town: GridBlock["town"], id: string, over: Partial<GridBlock> = {}): GridBlock => ({ id, day: DAY, personId: RYAN, start: null, minutes: 60, title: id, name: id, kind: "repair", town, service: "Repair", ...over })
const pt = (town: GridBlock["town"]) => ({ customer: "x", lat: TOWN_CENTRES[town][1], lng: TOWN_CENTRES[town][0] })
const ryan = PEOPLE.find((p) => p.id === RYAN)!
const world = (visits: GridBlock[], timeOff: Calendar["timeOff"] = []): Calendar => ({ people: PEOPLE, visits, meta: Object.fromEntries(visits.map((v) => [v.id, pt(v.town)])), timeOff })

describe("Order the day", () => {
  const visits = [at("Erie", "e-fixed", { start: 9 * 60 }), at("Longmont", "l-fixed", { start: 15 * 60 }), at("Longmont", "a-loose"), at("Erie", "b-loose")]
  const plan = orderDay(world(visits), ryan, DAY)

  it("never moves a stop that has a time, and gives every Any time stop one that fits", () => {
    expect(plan.moves.map((m) => m.id).sort()).toEqual(["a-loose", "b-loose"])
    expect(plan.after.route.filter((b) => b.id.endsWith("fixed")).map((b) => [b.id, b.start])).toEqual([["e-fixed", 540], ["l-fixed", 900]])
    for (const m of plan.moves) {
      const placed = { ...visits.find((v) => v.id === m.id)!, start: m.start }
      expect(placeProblems(world(visits.filter((v) => v.id !== m.id)), { id: m.id, day: DAY, personId: RYAN, start: m.start, minutes: placed.minutes, town: placed.town, kind: "repair", driving: false })).toEqual([])
    }
  })
  it("puts each Any time stop beside the stop in its own town and saves the driving", () => {
    const after = plan.after.route.map((b) => b.id)
    expect(after.indexOf("b-loose")).toBe(after.indexOf("e-fixed") + 1)
    expect(after.indexOf("a-loose")).toBe(after.indexOf("l-fixed") - 1)
    expect(plan.saved).toBeGreaterThan(0)
    expect(plan.before.driving - plan.after.driving).toBe(plan.saved)
    expect(plan.after.driving).toBe(drivingOf(plan.after.route, world(visits).meta).total)
  })
  it("lists a stop that fits nowhere as not fitting today and leaves it Any time", () => {
    const crowded = [at("Erie", "x", { start: 8 * 60, minutes: 8 * 60 + 60 }), at("Erie", "late-loose")]
    const p = orderDay(world(crowded), ryan, DAY)
    expect(p.moves).toEqual([])
    expect(p.doesNotFit.map((b) => b.id)).toEqual(["late-loose"])
    expect(p.after.route.at(-1)?.id).toBe("late-loose")
  })
  it("keeps clear of time off and does nothing when no stop is Any time", () => {
    const lunch = orderDay(world([at("Erie", "e", { start: 9 * 60 }), at("Erie", "z-loose", { minutes: 30 })], [{ id: "o", personId: RYAN, day: DAY, start: 10 * 60, end: 16 * 60 }]), ryan, DAY)
    for (const m of lunch.moves) expect(m.start < 600 || m.start >= 960).toBe(true)
    expect(orderDay(world([at("Erie", "t", { start: 9 * 60 })]), ryan, DAY)).toMatchObject({ moves: [], doesNotFit: [], saved: 0 })
  })
  it("applies as one change that tells no one, and Undo puts the day back", () => {
    const s0 = initialState({ visits: visits.map((v) => ({ ...v })), meta: world(visits).meta, unscheduled: [], timeOff: [] })
    const s1 = reduce(s0, { type: "order-day", moves: plan.moves, message: "Day ordered" })
    expect(routeOf(s1.visits, RYAN, DAY).every((b) => b.start !== null)).toBe(true)
    expect(s1.visits.every((b) => !b.notTold)).toBe(true)
    expect(s1.toast).toMatchObject({ message: "Day ordered", notified: true })
    expect(reduce(s1, { type: "undo" }).visits).toEqual(s0.visits)
  })
})

describe("Schedule all", () => {
  const job = (id: string, town: ProtoJob["town"], addedOn: string, minutes = 60): ProtoJob => ({ id, customer: id, town, service: "Repair", length: "1 h", minutes, kind: "repair", street: id, addedOn, lat: pt(town).lat, lng: pt(town).lng })
  const cal = world([at("Erie", "booked", { day: "2026-12-02", start: 9 * 60 })])

  it("places the oldest first, each on a calendar that holds the ones before, and never twice in one hour", () => {
    const rows = scheduleAllPlan(cal, [job("newer", "Erie", "2026-11-20"), job("older", "Erie", "2026-11-10")], "2026-11-25")
    expect(rows.map((r) => r.job.id)).toEqual(["older", "newer"])
    const [a, b] = rows
    expect(a!.to && b!.to).toBeTruthy()
    expect(a!.to!.day === b!.to!.day && a!.to!.personId === b!.to!.personId && a!.to!.start === b!.to!.start).toBe(false)
  })
  it("says why a job has no place, and reads only the jobs it is given", () => {
    const closed = { ...cal, people: PEOPLE.map((p) => ({ ...p, workingDays: [] })) }
    const [row] = scheduleAllPlan(closed, [job("j", "Erie", "2026-11-10")], "2026-11-25")
    expect(row).toMatchObject({ problem: expect.stringMatching(/^No open day before .+\. Pick a day yourself\.$/) })
    expect(scheduleAllPlan(cal, [], "2026-11-25")).toEqual([])
  })
  it("applies as one change: every job leaves Unscheduled, visits with a day are untouched, Undo gives them back", () => {
    const j = [job("j1", "Erie", "2026-11-10"), job("j2", "Longmont", "2026-11-11")]
    const s0 = initialState({ visits: cal.visits.map((v) => ({ ...v })), meta: cal.meta, unscheduled: j, timeOff: [] })
    const plan = scheduleAllPlan(cal, j, "2026-11-25")
    const s1 = reduce(s0, { type: "place-all", places: plan.map((r) => ({ jobId: r.job.id, to: { day: r.to!.day, personId: r.to!.personId, start: r.to!.start } })), notified: false })
    expect(s1.unscheduled).toEqual([])
    expect(s1.visits.find((b) => b.id === "booked")).toEqual(s0.visits.find((b) => b.id === "booked"))
    expect(s1.visits.filter((b) => b.notTold)).toHaveLength(2)
    expect(s1.toast).toMatchObject({ message: "Scheduled 2 jobs", ids: ["j1", "j2"] })
    expect(reduce(s1, { type: "undo" }).unscheduled).toEqual(j)
  })
})
