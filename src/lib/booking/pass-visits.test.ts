import { describe, expect, it } from "vitest"
import { EXACT_WITHIN_DAYS, PASS_WINDOWS, exactVisits, opensLabel, passPlanFor, preferenceDates, preferenceOfDay, preferenceVisits, rangeWords, seasonOf, shortDate } from "./pass-visits"

// What a pass bought on a day starts with, month by month and on the edge days: the visits still ahead, each one's mode (an exact day and time now, or a preference) and, from November, next season.
type Kind = "turn-on" | "blowout"
type Row = [string, string, Kind[], Kind[], number, boolean]
// Every month: the pass holds both kinds, each kind's next visit soonest first. The preference visits are the ones that ask Early, Mid or Late, including next season's.
const MONTH_TABLE: Row[] = [
  // [today, label, exact, preference, season, startsNextSeason]
  ["2027-01-15", "January", [], ["turn-on", "blowout"], 2027, false],
  ["2027-02-15", "February", [], ["turn-on", "blowout"], 2027, false],
  ["2027-03-15", "March", [], ["turn-on", "blowout"], 2027, false],
  ["2027-04-14", "April", ["turn-on"], ["blowout"], 2027, false],
  ["2027-05-14", "May", ["turn-on"], ["blowout"], 2027, false],
  ["2027-06-14", "June", [], ["blowout", "turn-on"], 2027, false],
  ["2027-07-14", "July", [], ["blowout", "turn-on"], 2027, false],
  ["2027-08-14", "August", [], ["blowout", "turn-on"], 2027, false],
  ["2027-09-14", "September", [], ["blowout", "turn-on"], 2027, false],
  ["2027-10-14", "October", ["blowout"], ["turn-on"], 2027, false],
  ["2027-11-14", "November", [], ["turn-on", "blowout"], 2028, true],
  ["2027-12-14", "December", [], ["turn-on", "blowout"], 2028, true],
]

describe("passPlanFor, month by month", () => {
  it.each(MONTH_TABLE)("%s (%s)", (today, _label, exact, preference, season, next) => {
    const plan = passPlanFor(today)
    expect(plan.visits).toHaveLength(2)
    expect(exactVisits(plan).map((v) => v.kind)).toEqual(exact)
    expect(preferenceVisits(plan).map((v) => v.kind)).toEqual(preference)
    expect(plan.season).toBe(season)
    expect(plan.startsNextSeason).toBe(next)
  })
  it("gives a visit whose window has closed next year's season, labelled with the year", () => {
    const july = passPlanFor("2027-07-14")
    expect(july.visits.map((v) => `${v.kind}:${v.season}:${v.opensLabel}`)).toEqual(["blowout:2027:Oct 1", "turn-on:2028:Apr 25, 2028"])
    expect(july.visits.map((v) => v.nextSeason)).toEqual([false, true])
  })
})

describe("passPlanFor, the edge days", () => {
  const kinds = (today: string) => passPlanFor(today).visits.map((v) => `${v.kind}:${v.mode}`)
  it("turns the turn-on from a preference to an exact day 14 days before it opens", () => {
    expect(EXACT_WITHIN_DAYS).toBe(14)
    expect(kinds("2027-04-10")).toEqual(["turn-on:preference", "blowout:preference"])
    expect(kinds("2027-04-11")).toEqual(["turn-on:exact", "blowout:preference"])
  })
  it("keeps the turn-on exact through the opening day and the whole window", () => {
    expect(kinds("2027-04-24")[0]).toBe("turn-on:exact")
    expect(kinds("2027-04-25")[0]).toBe("turn-on:exact")
    expect(kinds("2027-05-31")).toEqual(["turn-on:exact", "blowout:preference"])
  })
  it("moves the turn-on to next season the day after its window closes, as a preference", () => {
    expect(kinds("2027-06-01")).toEqual(["blowout:preference", "turn-on:preference"])
    expect(passPlanFor("2027-06-01").visits[1]).toMatchObject({ kind: "turn-on", season: 2028, nextSeason: true })
  })
  it("turns the blowout exact 14 days before October 1, with next spring's turn-on a preference", () => {
    expect(kinds("2027-09-16")).toEqual(["blowout:preference", "turn-on:preference"])
    expect(kinds("2027-09-17")).toEqual(["blowout:exact", "turn-on:preference"])
  })
  it("keeps the blowout through October 31 and starts next season on November 1", () => {
    expect(kinds("2027-10-31")).toEqual(["blowout:exact", "turn-on:preference"])
    expect(passPlanFor("2027-10-31").startsNextSeason).toBe(false)
    const nov = passPlanFor("2027-11-01")
    expect(nov.visits.map((v) => `${v.kind}:${v.season}:${v.mode}`)).toEqual(["turn-on:2028:preference", "blowout:2028:preference"])
    expect(nov.startsNextSeason).toBe(true)
  })
  it("is next season through December 31 and this season again from January 1", () => {
    expect(passPlanFor("2027-12-31").season).toBe(2028)
    expect(passPlanFor("2027-12-31").startsNextSeason).toBe(true)
    expect(passPlanFor("2028-01-01").season).toBe(2028)
    expect(passPlanFor("2028-01-01").startsNextSeason).toBe(false)
    expect(kinds("2028-01-01")).toEqual(["turn-on:preference", "blowout:preference"])
  })
  it("reads a leap year's windows the same way", () => {
    expect(passPlanFor("2028-04-11").visits[0]).toMatchObject({ kind: "turn-on", mode: "exact", opens: "2028-04-25" })
    expect(passPlanFor("2028-04-10").visits[0]!.mode).toBe("preference")
  })
})

describe("the windows", () => {
  it("are the booking fixture's, in one place", () => {
    expect(PASS_WINDOWS["turn-on"].opens).toBe("04-25")
    expect(PASS_WINDOWS.blowout.opens).toBe("10-01")
    expect(opensLabel("turn-on")).toBe("Apr 25")
    expect(opensLabel("blowout")).toBe("Oct 1")
  })
  it("name the visit's opening day for the pass card", () => {
    expect(passPlanFor("2027-04-14").visits.map((v) => v.opensLabel)).toEqual(["Apr 25", "Oct 1"])
  })
  it("read the season from the date", () => {
    expect(seasonOf("2027-10-31")).toBe(2027)
    expect(seasonOf("2027-11-01")).toBe(2028)
  })
})

describe("preference thirds", () => {
  it("cover the whole blowout window with real dates", () => {
    const t = preferenceDates({ opens: "2027-10-01", closes: "2027-10-31" })
    expect(rangeWords(t.earlier)).toBe("Oct 1 to Oct 10")
    expect(rangeWords(t.recommended)).toBe("Oct 11 to Oct 20")
    expect(rangeWords(t.later)).toBe("Oct 21 to Oct 31")
  })
  it("cover the turn-on window and cross the month", () => {
    const t = preferenceDates({ opens: "2027-04-25", closes: "2027-05-31" })
    expect(rangeWords(t.earlier)).toBe("Apr 25 to May 6")
    expect(rangeWords(t.recommended)).toBe("May 7 to May 18")
    expect(rangeWords(t.later)).toBe("May 19 to May 31")
  })
  it("writes a short date", () => {
    expect(shortDate("2027-04-25")).toBe("Apr 25")
    expect(shortDate("10-01")).toBe("Oct 1")
  })
})

describe("the preference a kind booked exactly starts with", () => {
  const blowout = { opens: "2027-10-01", closes: "2027-10-31" }
  it("is the part of the window of the day picked", () => {
    expect(preferenceOfDay(blowout, "2027-10-01")).toBe("earlier")
    expect(preferenceOfDay(blowout, "2027-10-10")).toBe("earlier")
    expect(preferenceOfDay(blowout, "2027-10-11")).toBe("recommended")
    expect(preferenceOfDay(blowout, "2027-10-20")).toBe("recommended")
    expect(preferenceOfDay(blowout, "2027-10-21")).toBe("later")
    expect(preferenceOfDay(blowout, "2027-10-31")).toBe("later")
    expect(preferenceOfDay({ opens: "2027-04-25", closes: "2027-05-31" }, "2027-04-29")).toBe("earlier")
  })
})
