import { describe, expect, it } from "vitest"
import { addDays } from "./calendar"
import { driveMinutes, gap, offerFor, type BookedVisit, type OfferInputs, type OfferPerson } from "./offer"

const week = ["mon", "tue", "wed", "thu", "fri"] as const
const ryan: OfferPerson = { id: "ryan", workingDays: [...week], hoursStart: "12:00", hoursEnd: "18:00", capsByKind: { "turn-on": 5, repair: 3, blowout: 8 } }
// Fri Apr 24 2026 is today; Mon Apr 27 is the first day offered.
const today = "2026-04-24"
const briggs = { town: "Erie" as const, point: { lat: 40.0503, lng: -105.0498 } }
const erie = (day: string, start: string, minutes: number, kind: string, lat: number, lng: number): BookedVisit => ({ personId: "ryan", day, start, minutes, kind, town: "Erie", point: { lat, lng } })

const april: BookedVisit[] = [
  erie("2026-04-28", "12:00", 60, "turn-on", 40.0495, -105.051),
  erie("2026-04-28", "13:30", 60, "turn-on", 40.051, -105.048),
  erie("2026-04-28", "15:00", 60, "turn-on", 40.05, -105.0495),
  { personId: "ryan", day: "2026-04-29", start: "12:00", minutes: 60, kind: "turn-on", town: "Longmont" },
  { personId: "ryan", day: "2026-04-29", start: "14:00", minutes: 120, kind: "repair", town: "Longmont" },
  erie("2026-04-30", "12:00", 120, "repair", 40.056, -105.06),
  { personId: "ryan", day: "2026-05-01", start: "13:00", minutes: 60, kind: "turn-on", town: "Lafayette" },
]

const base = (over: Partial<OfferInputs> = {}): OfferInputs => ({ today, service: { minutes: 60, kind: "turn-on" }, property: briggs, people: [ryan], booked: april, blocked: [], ...over })
const starts = (o: { slots: { start: string }[] }) => o.slots.map((s) => s.start).sort()
const days = (offers: { day: string }[]) => offers.map((o) => o.day)

describe("the drive cushion", () => {
  it("is a quarter more than the drive, to the next five, never under ten", () => {
    expect(gap(0)).toBe(10)
    expect(gap(7)).toBe(10)
    expect(gap(11)).toBe(15)
    expect(gap(29)).toBe(40)
  })
  it("is the town centres' line when a place has no point, and zero inside one town", () => {
    expect(driveMinutes({ town: "Erie" }, { town: "Erie" })).toBe(0)
    expect(driveMinutes({ town: "Erie" }, { town: "Longmont" })).toBeGreaterThan(20)
    expect(driveMinutes({ town: "Erie" }, { town: "Longmont" })).toBeLessThan(35)
  })
})

describe("Ryan's April, customer A on Briggs St, a 60-minute turn-on", () => {
  const offers = offerFor(base())
  it("offers Tuesday (preselected), Thursday and Monday, by date", () => {
    expect(days(offers)).toEqual(["2026-04-27", "2026-04-28", "2026-04-30"])
    expect(offers.map((o) => o.best)).toEqual([false, true, false])
  })
  it("Monday is the soonest open day with eleven starts from 12:00 to 5:00 pm", () => {
    const mon = offers[0]!
    expect(mon).toMatchObject({ tier: 2, label: "Soonest open day.", same: 0, near: null })
    expect(starts(mon)).toHaveLength(11)
    expect(starts(mon)[0]).toBe("12:00")
    expect(starts(mon).at(-1)).toBe("17:00")
    expect(mon.slots[0]).toMatchObject({ start: "12:00", added: 0 })
  })
  it("Tuesday has three Erie stops and exactly two starts left, 4:30 and 5:00, the best next to a neighbour", () => {
    const tue = offers[1]!
    expect(tue).toMatchObject({ tier: 0, label: "We're already in Erie that day.", same: 3 })
    expect(starts(tue)).toEqual(["16:30", "17:00"])
    expect(tue.slots[0]).toMatchObject({ start: "16:30", label: "Next to another Erie visit." })
    expect(tue.slots[0]!.added).toBeLessThan(3)
  })
  it("Thursday has one Erie stop and six starts from 2:30 pm", () => {
    const thu = offers[2]!
    expect(thu).toMatchObject({ tier: 0, same: 1 })
    expect(starts(thu)).toEqual(["14:30", "15:00", "15:30", "16:00", "16:30", "17:00"])
    expect(thu.slots[0]).toMatchObject({ start: "14:30" })
    expect(thu.slots[0]!.added).toBeGreaterThan(1)
    expect(thu.slots[0]!.added).toBeLessThan(8)
  })
  it("Wednesday, Longmont work with half an hour of drive to Erie, leaves only 5:00 pm and is not offered", () => {
    const wed = offerFor(base({ count: 5 })).find((o) => o.day === "2026-04-29")!
    expect(starts(wed)).toEqual(["17:00"])
    expect(wed.tier).toBe(2)
    expect(wed.slots[0]!.added).toBeGreaterThan(20)
  })
  it("Friday has a Lafayette stop 14 minutes away: starts from 2:30 pm, tier 2", () => {
    const fri = offerFor(base({ count: 5 })).find((o) => o.day === "2026-05-01")!
    expect(starts(fri)).toEqual(["14:30", "15:00", "15:30", "16:00", "16:30", "17:00"])
    expect(fri.tier).toBe(2)
  })
  it("a count of five offers all five soonest open days", () => {
    expect(days(offerFor(base({ count: 5 })))).toEqual(["2026-04-27", "2026-04-28", "2026-04-29", "2026-04-30", "2026-05-01"])
  })
})

describe("Ryan's April, customer E, a 120-minute repair", () => {
  const offers = offerFor(base({ service: { minutes: 120, kind: "repair" } }))
  it("has no two-hour gap on Tuesday or Wednesday, and always offers the earliest open day first", () => {
    expect(days(offers)).toEqual(["2026-04-27", "2026-04-30", "2026-05-01"])
    expect(offers.find((o) => o.best)!.day).toBe("2026-04-27")
    expect(offers[0]!.label).toBe("Soonest we can come.")
    expect(offers[1]).toMatchObject({ tier: 0, label: "We're already in Erie that day." })
    expect(starts(offers[1]!)[0]).toBe("14:30")
  })
})

describe("Customer D, Firestone, with nobody there", () => {
  it("is all tier 2, so the soonest three days: Monday first", () => {
    const offers = offerFor(base({ property: { town: "Firestone" } }))
    expect(days(offers)).toEqual(["2026-04-27", "2026-04-28", "2026-04-29"])
    expect(offers.every((o) => o.tier === 2)).toBe(true)
    expect(offers.find((o) => o.best)!.day).toBe("2026-04-27")
  })
})

describe("a second customer on the same street", () => {
  it("keeps Tuesday first while a start is left, and drops it when her booking fills the last gap", () => {
    expect(offerFor(base()).find((o) => o.best)!.day).toBe("2026-04-28")
    const second = [...april, erie("2026-04-28", "16:30", 60, "turn-on", 40.0504, -105.0497)]
    const tue = offerFor(base({ booked: second, count: 5 })).find((o) => o.day === "2026-04-28")
    // 4:30 to 5:30 leaves no start for a one-hour visit before 6:00 with the cushion.
    expect(tue).toBeUndefined()
  })
})

describe("the edges of section 4.2", () => {
  const empty = (over: Partial<OfferInputs> = {}) => base({ booked: [], ...over })

  it("a full day is skipped and the next open day is offered", () => {
    const full: BookedVisit[] = [{ personId: "ryan", day: "2026-04-27", start: "12:00", minutes: 360, kind: "repair", town: "Erie" }]
    expect(days(offerFor(empty({ booked: full, count: 1 })))).toEqual(["2026-04-28"])
  })

  it("a day off is skipped (a person who does not work Mondays)", () => {
    const p = { ...ryan, workingDays: ["tue", "wed", "thu", "fri"] as OfferPerson["workingDays"] }
    expect(days(offerFor(empty({ people: [p], count: 1 })))).toEqual(["2026-04-28"])
  })

  it("an inactive person offers nothing", () => {
    expect(offerFor(empty({ people: [{ ...ryan, active: false }] }))).toEqual([])
  })

  it("a cap reached closes the day for that kind only", () => {
    const capped = { ...ryan, capsByKind: { "turn-on": 1, repair: 3 } }
    const one: BookedVisit[] = [{ personId: "ryan", day: "2026-04-27", start: null, minutes: 60, kind: "turn-on", town: "Erie" }]
    expect(days(offerFor(empty({ people: [capped], booked: one, count: 1 })))).toEqual(["2026-04-28"])
    expect(days(offerFor(empty({ people: [capped], booked: one, count: 1, service: { minutes: 120, kind: "repair" } })))).toEqual(["2026-04-27"])
  })

  it("a window edge: nothing before bookableFrom, nothing after bookableTo", () => {
    const service = { minutes: 60, kind: "turn-on", bookableFrom: "04-29", bookableTo: "04-30" }
    expect(days(offerFor(empty({ service, count: 5 })))).toEqual(["2026-04-29", "2026-04-30"])
  })

  it("a window that wraps New Year runs into January", () => {
    const service = { minutes: 60, kind: "blowout", bookableFrom: "12-28", bookableTo: "01-05" }
    const got = offerFor(empty({ today: "2026-12-29", service, count: 5, people: [{ ...ryan, capsByKind: {} }] }))
    expect(days(got)).toEqual(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-04", "2027-01-05"])
  })

  it("a service that opens months ahead is offered its first days, not nothing", () => {
    const service = { minutes: 30, kind: "blowout", bookableFrom: "09-28", bookableTo: "11-15" }
    expect(days(offerFor(empty({ service, count: 1, people: [{ ...ryan, capsByKind: {} }] })))).toEqual(["2026-09-28"])
  })

  it("a blocked morning offers no slot inside it and keeps the afternoon", () => {
    const got = offerFor(empty({ blocked: [{ personId: "ryan", day: "2026-04-27", start: "12:00", end: "15:00" }], count: 1 }))
    expect(got[0]!.day).toBe("2026-04-27")
    expect(starts(got[0]!)[0]).toBe("15:00")
  })

  it("a whole blocked day is skipped", () => {
    expect(days(offerFor(empty({ blocked: [{ personId: "ryan", day: "2026-04-27" }], count: 1 })))).toEqual(["2026-04-28"])
  })

  it("an Any time visit takes minutes with no place: a day it leaves too short is closed", () => {
    const untimed: BookedVisit[] = [{ personId: "ryan", day: "2026-04-27", start: null, minutes: 330, kind: "repair", town: "Erie" }]
    expect(days(offerFor(empty({ booked: untimed, count: 1 })))).toEqual(["2026-04-28"])
    const light: BookedVisit[] = [{ ...untimed[0]!, minutes: 120 }]
    expect(days(offerFor(empty({ booked: light, count: 1 })))).toEqual(["2026-04-27"])
  })

  it("two people: one slot per start, the person already working that day first", () => {
    const scott: OfferPerson = { ...ryan, id: "scott" }
    const mine: BookedVisit[] = [{ personId: "scott", day: "2026-04-27", start: "12:00", minutes: 60, kind: "turn-on", town: "Erie", point: { lat: 40.0505, lng: -105.0499 } }]
    const got = offerFor(empty({ people: [ryan, scott], booked: mine, count: 1 }))
    expect(got[0]!.slots.find((s) => s.start === "13:30")!.personId).toBe("scott")
    expect(got[0]!.slots.filter((s) => s.start === "13:30")).toHaveLength(1)
    // 1:00 is inside Scott's cushion after his 12:00 visit, so only Ryan has it.
    expect(got[0]!.slots.find((s) => s.start === "13:00")!.personId).toBe("ryan")
  })

  it("a second person makes a full day open without moving anything", () => {
    const full: BookedVisit[] = [{ personId: "ryan", day: "2026-04-27", start: "12:00", minutes: 360, kind: "repair", town: "Erie" }]
    const scott: OfferPerson = { ...ryan, id: "scott" }
    expect(days(offerFor(empty({ booked: full, people: [ryan, scott], count: 1 })))).toEqual(["2026-04-27"])
  })

  it("hours default to 9 to 5 when null", () => {
    const p = { ...ryan, hoursStart: null, hoursEnd: null }
    const got = offerFor(empty({ people: [p], count: 1 }))
    expect(starts(got[0]!)[0]).toBe("09:00")
    expect(starts(got[0]!).at(-1)).toBe("16:00")
  })

  it("the next page ranks the next five days", () => {
    expect(days(offerFor(empty({ count: 5 })))).toEqual(["2026-04-27", "2026-04-28", "2026-04-29", "2026-04-30", "2026-05-01"])
    expect(days(offerFor(empty({ count: 5, page: 1 })))).toEqual(["2026-05-04", "2026-05-05", "2026-05-06", "2026-05-07", "2026-05-08"])
  })

  it("tomorrow is the earliest, never today", () => {
    expect(days(offerFor(empty({ today: "2026-04-27", count: 1 })))).toEqual(["2026-04-28"])
    expect(addDays("2026-04-27", 1)).toBe("2026-04-28")
  })

  it("a nearby stop in another town (inside ten minutes) is tier 1 and preselected over an empty day", () => {
    const laf: BookedVisit[] = [{ personId: "ryan", day: "2026-04-29", start: "12:00", minutes: 60, kind: "turn-on", town: "Lafayette" }]
    const got = offerFor(empty({ property: { town: "Louisville" }, booked: laf }))
    const wed = got.find((o) => o.day === "2026-04-29")!
    expect(wed.tier).toBe(1)
    expect(wed.label).toBe("We're close by that day.")
    expect(wed.best).toBe(true)
  })
})
