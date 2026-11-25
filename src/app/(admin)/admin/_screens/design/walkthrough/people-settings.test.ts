import { afterEach, describe, expect, it } from "vitest"
import { initialState } from "../schedule-prototype-data"
import { personDay, placeProblems, slotsOn, type Calendar } from "../schedule-engine"
import { WALK_PEOPLE, RYAN_ID, applyWalkPeople, buildWalkWorld, walkRoutePeople } from "./visits-data"
import { WALK_SCHEDULE_WORLD } from "./walk-schedule"

// What Settings, People feeds the Schedule in the walkthrough: Save (WalkSettings' action) calls `applyWalkPeople`, and the Schedule's world reads the same people, so an edit changes the next
// opening offered, the checks on a drop and the day's "Full" in the same session. One test per field.

const original = JSON.stringify(WALK_PEOPLE)
afterEach(() => applyWalkPeople(JSON.parse(original)))

const edit = (id: string, over: Record<string, unknown>) => applyWalkPeople(WALK_PEOPLE.map((p) => (p.id === id ? { ...p, ...over } : p)))
const world = buildWalkWorld()
const cal = (): Calendar => ({ people: WALK_SCHEDULE_WORLD.people, visits: world.visits, meta: world.meta, timeOff: world.timeOff })
const ask = { today: "2026-11-18", town: "Erie" as const, point: null, minutes: 60, kind: "repair" }

describe("an edit in Settings, People reaches the Schedule", () => {
  it("Hours: 8:00 to 3:00 pm leaves no opening after 3:00 for that person", () => {
    edit(RYAN_ID, { hoursEnd: "15:00" })
    const starts = slotsOn(cal(), ask, "2026-11-23").filter((s) => s.personId === RYAN_ID).map((s) => s.start)
    expect(starts.length).toBeGreaterThan(0)
    expect(starts.every((s) => s <= "14:00")).toBe(true)
    expect(placeProblems(cal(), { id: "x", day: "2026-11-23", personId: RYAN_ID, start: 15 * 60, minutes: 60, kind: "repair", town: "Erie" })).toContain("Ryan works until 3:00 pm.")
  })
  it("Working days: unticking Friday leaves that person no opening and a drop on Friday says so", () => {
    edit(RYAN_ID, { workingDays: ["mon", "tue", "wed", "thu"] })
    expect(slotsOn(cal(), ask, "2026-11-27").some((s) => s.personId === RYAN_ID)).toBe(false)
    expect(placeProblems(cal(), { id: "x", day: "2026-11-27", personId: RYAN_ID, start: 9 * 60, minutes: 60, kind: "repair", town: "Erie" })).toEqual(["Ryan does not work that day."])
  })
  it("Most per day: a Most of 1 makes the day read Full and a second one is warned", () => {
    const wed = "2026-11-18"
    const ryan = () => WALK_PEOPLE.find((p) => p.id === RYAN_ID)!
    edit(RYAN_ID, { capacityByKind: { ...ryan().capacityByKind, repair: 1 } })
    const c = cal()
    expect(personDay(c, c.people.find((p) => p.id === RYAN_ID)!, wed).full).toBe(true)
    expect(placeProblems(c, { id: "x", day: wed, personId: RYAN_ID, start: 14 * 60, minutes: 60, kind: "repair", town: "Erie" })).toContain("Ryan is full that day.")
  })
  it("Takes visits: taking the schedule label away takes the person off the Schedule", () => {
    expect(WALK_SCHEDULE_WORLD.people.map((p) => p.id)).toContain(RYAN_ID)
    edit(RYAN_ID, { truck: "" })
    expect(WALK_SCHEDULE_WORLD.people.map((p) => p.id)).not.toContain(RYAN_ID)
    expect(walkRoutePeople()).toBe(walkRoutePeople())
  })
  it("Time off lives in the Schedule's own store, which Settings and the Schedule already share", () => {
    expect(initialState({ visits: world.visits, meta: world.meta, unscheduled: [], timeOff: world.timeOff }).timeOff).toEqual(world.timeOff)
  })
})
