import { describe, expect, it } from "vitest"
import type { AreaGroup, Person, SeasonWindow, Visit } from "@/lib/admin/types"
import { PLACE_HORIZON_DAYS, placeAllPlan, placeFor, placed, placeDayWords, restoreVisit, withPlacements, type PlaceContext } from "./place-model"
import type { TrayItem } from "./schedule-model"

const TZ = "America/Denver"
const caps = (over: Partial<Person["capacityByKind"]> = {}): Person["capacityByKind"] => ({ "turn-on": 6, inspection: 5, blowout: 10, repair: 1, other: 2, ...over })
const person = (id: string, name: string, over: Partial<Person> = {}): Person => ({ id, name, initials: "XX", role: "tech", truck: "Truck", workingDays: ["mon", "tue", "wed", "thu", "fri"], capacityByKind: caps(), ...over })
const ryan = person("p1", "Ryan Garner")
const sam = person("p2", "Sam Lee")
const areas: AreaGroup[] = [
  { id: "north", name: "Erie and Firestone", towns: ["Erie", "Firestone"] },
  { id: "south", name: "Louisville and Lafayette", towns: ["Louisville", "Lafayette"] },
]
const windows: SeasonWindow[] = [{ kind: "turn-on", opensOn: "2027-04-26", closesOn: "2027-05-31", leadWeeks: 4 }]
// Thursday, November 12, 2026: tomorrow is the Friday.
const TODAY = "2026-11-12"

const item = (id: string, over: Partial<TrayItem> = {}): TrayItem => ({ id, clientId: `c-${id}`, clientName: `Customer ${id}`, town: "Erie", kind: "repair", window: "", sortKey: "0", ...over })
const onDay = (id: string, personId: string, day: string, over: Partial<Visit> = {}): Visit => ({
  id, clientId: `c-${id}`, clientName: `Held ${id}`, town: "Erie", kind: "repair", status: "scheduled", startAt: `${day}T16:00:00Z`, scheduledOn: day, isPass: false, jobberUrl: "", personId, personName: personId, stopOrder: 1, ...over,
})
const ctx = (over: Partial<PlaceContext> = {}): PlaceContext => ({ visits: [], people: [ryan, sam], areas, windows, today: TODAY, timeZone: TZ, ...over })

describe("placeFor: the next open day, the first person with room", () => {
  it("takes tomorrow, never today, with the first person on the schedule", () => {
    const r = placeFor(item("a"), ctx())
    expect(r).toMatchObject({ ok: true, placement: { personId: "p1", personName: "Ryan Garner", day: "2026-11-13" } })
  })

  it("moves to the second person when the first is full of that kind that day, and to the next day when both are", () => {
    const first = placeFor(item("a"), ctx({ visits: [onDay("x", "p1", "2026-11-13")] }))
    expect(first).toMatchObject({ ok: true, placement: { personId: "p2", day: "2026-11-13" } })
    const next = placeFor(item("a"), ctx({ visits: [onDay("x", "p1", "2026-11-13"), onDay("y", "p2", "2026-11-13")] }))
    // Saturday and Sunday are nobody's day: the next open one is Monday.
    expect(next).toMatchObject({ ok: true, placement: { personId: "p1", day: "2026-11-16" } })
  })

  it("skips a day off, and a day that person works another area group", () => {
    const sat = placeFor(item("a"), ctx({ people: [person("p1", "Ryan Garner", { workingDays: ["sat"] })] }))
    expect(sat).toMatchObject({ ok: true, placement: { day: "2026-11-14" } })
    const south = onDay("x", "p1", "2026-11-13", { town: "Louisville" })
    expect(placeFor(item("a"), ctx({ visits: [south], people: [ryan] }))).toMatchObject({ ok: true, placement: { day: "2026-11-16" } })
  })

  it("holds a pass's visit inside its season window and says when none is open", () => {
    const pass = item("a", { kind: "turn-on", passId: "pass-1", window: "May" })
    expect(placeFor(pass, ctx())).toMatchObject({ ok: true, placement: { day: "2027-04-26" } })
    const full = ctx({ people: [person("p1", "Ryan Garner", { capacityByKind: caps({ "turn-on": 0 }) })] })
    expect(placeFor(pass, full)).toEqual({ ok: false, item: pass, reason: "No open day before May 31. Pick a day yourself." })
  })

  it("gives a one-off no window, only a season to look through", () => {
    const none = placeFor(item("a"), ctx({ people: [person("p1", "Ryan Garner", { capacityByKind: caps({ repair: 0 }) })] }))
    expect(none.ok).toBe(false)
    expect((none as { reason: string }).reason).toMatch(/^No open day before .+\. Pick a day yourself\.$/)
    expect(PLACE_HORIZON_DAYS).toBe(180)
  })

  it("keeps a person to the season they work, and leaves a canceled visit out of the count", () => {
    const late = person("p1", "Ryan Garner", { seasonStart: "2026-12-01" })
    expect(placeFor(item("a"), ctx({ people: [late] }))).toMatchObject({ ok: true, placement: { day: "2026-12-01" } })
    const gone = onDay("x", "p1", "2026-11-13", { status: "cancelled" })
    expect(placeFor(item("a"), ctx({ visits: [gone] }))).toMatchObject({ ok: true, placement: { personId: "p1", day: "2026-11-13" } })
  })

  it("answers for no one on the schedule", () => {
    expect(placeFor(item("a"), ctx({ people: [] })).ok).toBe(false)
  })
})

describe("placeAllPlan", () => {
  it("fills each day for the next job, leaves a job its customer picks, and lists a job nothing fits", () => {
    const items = [item("a"), item("b"), item("c"), item("w", { awaitingPick: true })]
    const plan = placeAllPlan(items, ctx())
    expect(plan).toHaveLength(3)
    expect(placed(plan).map((p) => [p.item.id, p.personId, p.day])).toEqual([
      ["a", "p1", "2026-11-13"],
      ["b", "p2", "2026-11-13"],
      ["c", "p1", "2026-11-16"],
    ])
    const stuck = placeAllPlan([item("a", { kind: "turn-on", passId: "x" })], ctx({ windows: [{ ...windows[0], closesOn: "2026-11-01" }] }))
    expect(stuck[0]).toMatchObject({ ok: false })
  })
})

describe("what the screen shows while the text waits", () => {
  const server = [onDay("v1", "p1", "2026-11-13")]
  it("lays pending placements on the visits, and takes one back to the server's row", () => {
    const plan = placed(placeAllPlan([item("a")], ctx()))
    const shown = withPlacements(server, plan, TZ)
    expect(shown.find((v) => v.id === "a")).toMatchObject({ status: "scheduled", personId: "p1" })
    // a job the server has no visit for comes off again; one it has goes back to its own row
    expect(restoreVisit(shown, "a", server).some((v) => v.id === "a")).toBe(false)
    const row = onDay("a", "p2", "2026-11-20")
    const before = [...server, { ...row, status: "unscheduled" as const, startAt: undefined, personId: undefined }]
    const after = withPlacements(before, plan, TZ)
    expect(restoreVisit(after, "a", before).find((v) => v.id === "a")).toEqual(before[1])
  })

  it("words a day with its weekday", () => {
    expect(placeDayWords("2026-11-24")).toBe("Tue Nov 24")
  })
})
