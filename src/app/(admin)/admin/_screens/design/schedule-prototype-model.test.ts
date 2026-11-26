import { describe, expect, it } from "vitest"
import { JOBS, PEOPLE, RYAN, TECH, initialState } from "./schedule-prototype-data"
import { openingsFor } from "./schedule-prototype-find"
import { placementProblems, reduce, whenWords, type ProtoState } from "./schedule-prototype-model"
import { columnsFor, mondayOf, monthDays, rangeWords, shift } from "./schedule-prototype-view"

const start = () => initialState()
const at = (s: ProtoState, id: string) => s.visits.find((b) => b.id === id)!
/** Everything but the toast and its counter: what Undo must give back exactly. */
const data = ({ visits, was, unscheduled, meta, timeOff }: ProtoState) => ({ visits, was, unscheduled, meta, timeOff })

describe("a move by any route", () => {
  it("moves the visit and says so in one toast that offers Notify the customer and Undo", () => {
    const s = reduce(start(), { type: "move", id: "v4", to: { day: "2026-11-26", personId: RYAN, start: 9 * 60 } })
    expect(at(s, "v4")).toMatchObject({ day: "2026-11-26", start: 540 })
    expect(s.toast).toMatchObject({ message: "Moved to Thu, Nov 26, 9:00 am", offerNotify: true, ids: ["v4"] })
    expect(s.was.v4).toMatchObject({ day: "2026-11-24", start: 480 })
  })

  it("undo restores the state exactly, and the toast goes", () => {
    const before = start()
    const moved = reduce(before, { type: "move", id: "v4", to: { day: "2026-11-26", personId: TECH, start: null } })
    const undone = reduce(moved, { type: "undo" })
    expect(data(undone)).toEqual(data(before))
    expect(undone.toast).toBeNull()
  })

  it("a drop where the visit already is makes no toast", () => {
    const same = reduce(start(), { type: "move", id: "v4", to: { day: "2026-11-24", personId: RYAN, start: 480 } })
    expect(same).toEqual(start())
    expect(reduce(start(), { type: "resize", id: "v4", minutes: 60 })).toEqual(start())
  })

  it("remembers where the visit was before its last move, for the words of the message", () => {
    const a = reduce(start(), { type: "move", id: "v4", to: { day: "2026-11-25", personId: RYAN, start: 8 * 60 } })
    const b = reduce(a, { type: "move", id: "v4", to: { day: "2026-11-26", personId: RYAN, start: 8 * 60 } })
    expect(b.was.v4).toMatchObject({ day: "2026-11-25", start: 480 })
  })

  it("a resize says the new time in its toast with Undo and no Notify, because the start did not move", () => {
    const s = reduce(start(), { type: "resize", id: "v4", minutes: 90 })
    expect(at(s, "v4")).toMatchObject({ minutes: 90 })
    expect(s.toast).toMatchObject({ message: "Now 8:00 to 9:30 am", offerNotify: false })
    expect(s.was.v4).toBeUndefined()
  })

  it("a first placement says Visit scheduled, takes the job out of Unscheduled and puts the visit on the calendar", () => {
    const s = reduce(start(), { type: "place", jobId: "u-1", to: { day: "2026-11-26", personId: RYAN, start: 10 * 60 } })
    expect(s.toast?.message).toBe("Scheduled for Thu, Nov 26, 10:00 am")
    expect(s.unscheduled.map((j) => j.id)).not.toContain("u-1")
    expect(at(s, "u-1")).toMatchObject({ title: "Kenosha Dr", start: 600 })
    expect(reduce(s, { type: "undo" }).unscheduled).toHaveLength(JOBS.length)
  })

  it("nothing is ever sent: no action touches anything but the data", () => {
    const s = reduce(start(), { type: "move", id: "v4", to: { day: "2026-11-26", personId: RYAN, start: 9 * 60 } })
    expect(Object.keys(s).sort()).toEqual(["meta", "notify", "seq", "timeOff", "toast", "unscheduled", "visits", "was"])
    expect(JSON.stringify(s)).not.toMatch(/sent|queued/i)
  })
})

describe("Schedule and notify the customer", () => {
  it("a move the dialog notified has a toast that offers Undo alone", () => {
    const s = reduce(start(), { type: "move", id: "v5", to: { day: "2026-11-26", personId: RYAN, start: 9 * 60 }, notified: true })
    expect(s.toast).toMatchObject({ message: "Moved to Thu, Nov 26, 9:00 am", offerNotify: false })
  })
  it("a job placed with notifying says Scheduled for and offers Undo alone", () => {
    const s = reduce(start(), { type: "place", jobId: "u-1", to: { day: "2026-11-26", personId: RYAN, start: null }, notified: true })
    expect(s.toast).toMatchObject({ message: "Scheduled for Thu, Nov 26", offerNotify: false })
  })
  it("Edit visit moves the day and the length in one move", () => {
    const s = reduce(start(), { type: "move", id: "v4", to: { day: "2026-11-26", personId: RYAN, start: 9 * 60 }, minutes: 90 })
    expect(at(s, "v4")).toMatchObject({ day: "2026-11-26", start: 540, minutes: 90 })
    expect(s.toast?.message).toBe("Moved to Thu, Nov 26, 9:00 am")
  })
  it("Edit visit with only a new length is a length change", () => {
    const b = at(start(), "v4")
    const s = reduce(start(), { type: "move", id: "v4", to: { day: b.day, personId: b.personId, start: b.start }, minutes: 90 })
    expect(s.toast?.message).toBe("Now 8:00 to 9:30 am")
  })
})

describe("Notify the customer", () => {
  it("queues the customers, one message at a time; Send says Customer notified with no action, Close leaves nothing behind", () => {
    let s = reduce(start(), { type: "ask-notify", ids: ["v5", "v8"] })
    expect(s.notify).toEqual(["v5", "v8"])
    s = reduce(s, { type: "notify-next", sent: true })
    expect(s.notify).toEqual(["v8"])
    s = reduce(s, { type: "notify-next", sent: true })
    expect(s.notify).toEqual([])
    expect(s.toast).toMatchObject({ message: "Customer notified", offerNotify: false, undo: null })
    s = reduce(s, { type: "undo" })
    expect(s.toast).not.toBeNull()
    s = reduce(s, { type: "dismiss-toast" })
    expect(s.toast).toBeNull()
    s = reduce(reduce(start(), { type: "ask-notify", ids: ["v5"] }), { type: "notify-close" })
    expect(s.notify).toEqual([])
    expect(s.toast).toBeNull()
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
    expect(columnsFor("day", "2026-11-25", PEOPLE, s.visits, s.meta, "2026-11-25")[0]?.caption).toMatch(/^\d visits/)
  })
  it("a head carries each person's open time and driving, the towns, and a day nobody has room for reads full", () => {
    const s = start()
    const head = columnsFor("day", "2026-11-24", PEOPLE, s.visits, s.meta, "2026-11-25", s.timeOff)[0]!
    expect(head.caption).toMatch(/^\d+ visits?$/)
    expect(head.towns).toMatch(/\w+ \d/)
    expect(head.stats?.[RYAN]?.open).toMatch(/ open$|^Full$/)
    const crowded = s.visits.filter((b) => b.day === "2026-11-24").map((b) => ({ ...b, minutes: 9 * 60 }))
    const full = columnsFor("day", "2026-11-24", PEOPLE, crowded, s.meta, "2026-11-25", [])[0]!
    expect(full.stats?.[RYAN]?.open).toBe("Full")
    expect(full.caption).toBe("Full")
  })
  it("the Month reads the moved visit's new day", () => {
    const s = reduce(start(), { type: "move", id: "v4", to: { day: "2026-11-27", personId: RYAN, start: 8 * 60 } })
    const tue = (st: ProtoState) => monthDays(st.visits, st.timeOff, PEOPLE).find((d) => d.day === "2026-11-24")!.stops
    expect(tue(s)).toBe(tue(start()) - 1)
  })
  it("words a date and time", () => expect(whenWords({ day: "2026-11-26", start: null })).toBe("Thu, Nov 26, Any time"))
})
