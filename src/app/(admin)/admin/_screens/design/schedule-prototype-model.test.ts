import { describe, expect, it } from "vitest"
import { JOBS, PEOPLE, RYAN, TECH, initialState } from "./schedule-prototype-data"
import { openingsFor } from "./schedule-prototype-find"
import { notToldList, placementProblems, reduce, whenWords, type ProtoState } from "./schedule-prototype-model"
import { columnsFor, mondayOf, monthDays, rangeWords, shift } from "./schedule-prototype-view"

const start = () => initialState()
const at = (s: ProtoState, id: string) => s.visits.find((b) => b.id === id)!
/** Everything but the toast and its counter: what Undo must give back exactly. */
const data = ({ visits, was, unscheduled, meta, timeOff }: ProtoState) => ({ visits, was, unscheduled, meta, timeOff })

describe("a move by any route", () => {
  it("moves the visit, marks the customer not notified, and says so in one toast with Undo", () => {
    const s = reduce(start(), { type: "move", id: "v4", to: { day: "2026-11-26", personId: RYAN, start: 9 * 60 } })
    expect(at(s, "v4")).toMatchObject({ day: "2026-11-26", start: 540, notTold: true })
    expect(s.toast).toMatchObject({ message: "Moved to Thu, Nov 26, 9:00 am", notified: false, ids: ["v4"] })
    expect(s.was.v4).toMatchObject({ day: "2026-11-24", start: 480 })
  })

  it("undo restores the state exactly, and the toast goes", () => {
    const before = start()
    const moved = reduce(before, { type: "move", id: "v4", to: { day: "2026-11-26", personId: TECH, start: null } })
    const undone = reduce(moved, { type: "undo" })
    expect(data(undone)).toEqual(data(before))
    expect(undone.toast).toBeNull()
  })

  it("a drop where the visit already is makes no toast and marks nothing", () => {
    const same = reduce(start(), { type: "move", id: "v4", to: { day: "2026-11-24", personId: RYAN, start: 480 } })
    expect(same).toEqual(start())
    expect(reduce(start(), { type: "resize", id: "v4", minutes: 60 })).toEqual(start())
  })

  it("keeps the first place a not-told visit came from", () => {
    const a = reduce(start(), { type: "move", id: "v4", to: { day: "2026-11-25", personId: RYAN, start: 8 * 60 } })
    const b = reduce(a, { type: "move", id: "v4", to: { day: "2026-11-26", personId: RYAN, start: 8 * 60 } })
    expect(b.was.v4).toMatchObject({ day: "2026-11-24", start: 480 })
  })

  it("a resize is a move: the new length is in the toast and the visit is not told", () => {
    const s = reduce(start(), { type: "resize", id: "v4", minutes: 90 })
    expect(at(s, "v4")).toMatchObject({ minutes: 90, notTold: true })
    expect(s.toast?.message).toBe("Changed to 8:00 to 9:30 am")
  })

  it("a first placement says Visit scheduled, takes the job out of Unscheduled and puts the visit not told", () => {
    const s = reduce(start(), { type: "place", jobId: "u-1", to: { day: "2026-11-26", personId: RYAN, start: 10 * 60 } })
    expect(s.toast?.message).toBe("Scheduled for Thu, Nov 26, 10:00 am")
    expect(s.unscheduled.map((j) => j.id)).not.toContain("u-1")
    expect(at(s, "u-1")).toMatchObject({ title: "Kenosha Dr", notTold: true, start: 600 })
    expect(reduce(s, { type: "undo" }).unscheduled).toHaveLength(JOBS.length)
  })

  it("nothing is ever sent: no action touches anything but the data", () => {
    const s = reduce(start(), { type: "move", id: "v4", to: { day: "2026-11-26", personId: RYAN, start: 9 * 60 } })
    expect(Object.keys(s).sort()).toEqual(["meta", "notify", "seq", "timeOff", "toast", "unscheduled", "visits", "was"])
    expect(JSON.stringify(s)).not.toMatch(/sent|queued/i)
  })
})

describe("not notified", () => {
  it("starts with three visits and lists where each was and is", () => {
    const list = notToldList(start())
    expect(list).toHaveLength(3)
    expect(list.find((v) => v.id === "v5")).toMatchObject({ was: "Mon, Nov 23, 9:15 am", now: "Tue, Nov 24, 9:15 am" })
  })
  it("a customer with no phone or email is still listed, with no way to reach them", () => {
    const hal = notToldList(start()).find((v) => v.id === "v5")!
    expect(hal.phone).toBeUndefined()
    expect(hal.email).toBeUndefined()
  })
  it("told clears the mark for the ids given, and only those", () => {
    const s = reduce(start(), { type: "told", ids: ["v5"] })
    expect(notToldList(s).map((v) => v.id)).toEqual(["v8", "v18"])
    expect(s.was.v5).toBeUndefined()
    expect(s.toast).toBeNull()
  })
})

describe("Schedule and notify the customer", () => {
  it("a move the dialog notified is not marked, and its toast offers Undo alone", () => {
    const s = reduce(start(), { type: "move", id: "v5", to: { day: "2026-11-26", personId: RYAN, start: 9 * 60 }, notified: true })
    expect(at(s, "v5").notTold).toBe(false)
    expect(s.was.v5).toBeUndefined()
    expect(s.toast).toMatchObject({ message: "Moved to Thu, Nov 26, 9:00 am", notified: true })
  })
  it("a job placed with notifying says Scheduled for and is not marked", () => {
    const s = reduce(start(), { type: "place", jobId: "u-1", to: { day: "2026-11-26", personId: RYAN, start: null }, notified: true })
    expect(s.toast?.message).toBe("Scheduled for Thu, Nov 26")
    expect(at(s, "u-1").notTold).toBe(false)
  })
})

describe("Notify the customer", () => {
  it("queues the customers, one message at a time; Send clears each mark, Cancel leaves the rest marked", () => {
    let s = reduce(start(), { type: "ask-notify", ids: ["v5", "v8"] })
    expect(s.notify).toEqual(["v5", "v8"])
    s = reduce(s, { type: "notify-next", sent: true })
    expect(at(s, "v5").notTold).toBe(false)
    expect(s.notify).toEqual(["v8"])
    s = reduce(s, { type: "notify-close" })
    expect(s.notify).toEqual([])
    expect(at(s, "v8").notTold).toBe(true)
  })
})

describe("time off", () => {
  it("saves and removes a band, and edits replace by id", () => {
    const s0 = start()
    const added = reduce(s0, { type: "time-off-save", value: { id: "x", personId: RYAN, day: "2026-11-27", start: null, end: null } })
    expect(added.timeOff).toHaveLength(s0.timeOff.length + 1)
    const edited = reduce(added, { type: "time-off-save", value: { id: "x", personId: RYAN, day: "2026-11-27", start: 600, end: 660 } })
    expect(edited.timeOff.filter((o) => o.id === "x")).toEqual([{ id: "x", personId: RYAN, day: "2026-11-27", start: 600, end: 660 }])
    expect(reduce(edited, { type: "time-off-remove", id: "x" }).timeOff).toHaveLength(s0.timeOff.length)
  })
})

describe("what a place breaks", () => {
  const s = start()
  const problems = (p: { day: string; personId: string; start: number | null; minutes: number }) => placementProblems(s, PEOPLE, { id: "v4", ...p })
  it("is empty for a free place", () => expect(problems({ day: "2026-11-24", personId: RYAN, start: 8 * 60, minutes: 60 })).toEqual([]))
  it("names the room to drive between two visits", () => expect(problems({ day: "2026-11-24", personId: RYAN, start: 8 * 60 + 15, minutes: 60 })).toEqual([expect.stringMatching(/^Ryan needs \d+ minutes to drive to Dry Creek Rd\.$/)]))
  it("names an overlap", () => expect(problems({ day: "2026-11-24", personId: RYAN, start: 9 * 60 + 30, minutes: 60 })).toEqual(["Ryan has Dry Creek Rd at 9:15 am."]))
  it("names time off, whole day and hours", () => {
    expect(problems({ day: "2026-11-25", personId: RYAN, start: 12 * 60 + 30, minutes: 60 })).toEqual(["Ryan is off 12 to 2 pm."])
    expect(problems({ day: "2026-11-26", personId: TECH, start: 10 * 60, minutes: 60 })).toEqual(["Tech is off all day."])
  })
  it("names hours outside the person's day", () => {
    expect(problems({ day: "2026-11-25", personId: TECH, start: 15 * 60 + 30, minutes: 60 })).toEqual(["Tech works until 4:00 pm."])
    expect(problems({ day: "2026-11-24", personId: RYAN, start: 7 * 60, minutes: 60 })).toEqual(["Ryan starts at 8:00 am."])
  })
  it("names a day nobody works, and lets Any time through", () => {
    expect(problems({ day: "2026-11-28", personId: RYAN, start: 9 * 60, minutes: 60 })).toEqual(["Ryan does not work that day."])
    expect(problems({ day: "2026-11-24", personId: RYAN, start: null, minutes: 60 })).toEqual([])
  })
})

describe("Find a time", () => {
  const found = openingsFor({ state: start(), people: PEOPLE, town: "Erie", minutes: 60, today: "2026-11-25", point: { lat: 40.05, lng: -105.05 } })
  it("offers at most five clear openings, none of which breaks a rule", () => {
    expect(found.openings.length).toBeGreaterThan(0)
    expect(found.openings.length).toBeLessThanOrEqual(5)
    for (const o of found.openings) {
      const [h, m] = o.start.split(":").map(Number)
      expect(placementProblems(start(), PEOPLE, { id: "new", day: o.day, personId: o.personId, start: h! * 60 + m!, minutes: 60, driving: false })).toEqual([])
    }
  })
  it("never offers Tech Two on his day off, and starts from tomorrow", () => {
    expect(found.openings.some((o) => o.personId === TECH && o.day === "2026-11-26")).toBe(false)
    expect(found.openings.every((o) => o.day > "2026-11-25")).toBe(true)
  })
  it("gives forced rows the words of what they break", () => {
    expect(found.forced.length).toBeGreaterThan(0)
    expect(found.forced.every((f) => Boolean(f.conflict))).toBe(true)
  })
})

describe("the view", () => {
  it("finds the Monday, shifts by the view and words the range", () => {
    expect(mondayOf("2026-11-25")).toBe("2026-11-23")
    expect(shift("week", "2026-11-25", 1)).toBe("2026-12-02")
    expect(shift("day", "2026-11-25", -1)).toBe("2026-11-24")
    expect(shift("month", "2026-11-25", 1)).toBe("2026-12-01")
    expect(rangeWords("week", "2026-11-25")).toBe("Week of Nov 23")
    expect(rangeWords("day", "2026-11-25")).toBe("Wednesday, November 25")
    expect(rangeWords("month", "2026-11-25")).toBe("November 2026")
  })
  it("a Week shows Monday to Saturday (Tech Two works Saturday, a visit sits on it); a Day carries its fill", () => {
    const s = start()
    expect(columnsFor("week", "2026-11-25", PEOPLE, s.visits, s.meta, "2026-11-25").map((c) => c.day)).toEqual(["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28"])
    expect(columnsFor("day", "2026-11-25", PEOPLE, s.visits, s.meta, "2026-11-25")[0]?.caption).toMatch(/^\d stops/)
  })
  it("a head carries each person's open time and driving, the towns, and a day nobody has room for reads full", () => {
    const s = start()
    const head = columnsFor("day", "2026-11-24", PEOPLE, s.visits, s.meta, "2026-11-25", s.timeOff)[0]!
    expect(head.caption).toMatch(/^\d+ stops?$/)
    expect(head.towns).toMatch(/\w+ \d/)
    expect(head.stats?.[RYAN]?.open).toMatch(/ open$|^Full$/)
    const crowded = s.visits.filter((b) => b.day === "2026-11-24").map((b) => ({ ...b, minutes: 9 * 60 }))
    const full = columnsFor("day", "2026-11-24", PEOPLE, crowded, s.meta, "2026-11-25", [])[0]!
    expect(full.stats?.[RYAN]?.open).toBe("Full")
    expect(full.caption).toMatch(/, full$/)
  })
  it("the Month reads the moved visit's new day", () => {
    const s = reduce(start(), { type: "move", id: "v4", to: { day: "2026-11-27", personId: RYAN, start: 8 * 60 } })
    const tue = (st: ProtoState) => monthDays(st.visits, st.timeOff, PEOPLE).find((d) => d.day === "2026-11-24")!.stops
    expect(tue(s)).toBe(tue(start()) - 1)
  })
  it("words a date and time", () => expect(whenWords({ day: "2026-11-26", start: null })).toBe("Thu, Nov 26, Any time"))
})
