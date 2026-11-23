import { describe, expect, it } from "vitest"
import { defaultWindows } from "@/lib/settings/defaults"
import { EXACT_WITHIN_DAYS, PASS_WINDOWS, SEASON_ROLLS, WINDOWS, exactVisits, nextRun, passPlanFor, preferenceDates, preferenceOfDay, preferenceVisits, rangeWords, seasonOf, shortDate } from "./pass-visits"

// What a pass bought on a day starts with, month by month and on the edge days: the visits still ahead, each one's mode (an exact day and time now, or a preference) and, once the last window has closed,
// next season. Hannah, Nov 22 2026: booking in April, the spring turn-on is exact and the blowout a preference; booking the blowout (September or October), the blowout is exact and next spring's turn-on a
// preference. The windows are the scheduler's settings (turn-on April 15 to May 31, blowout October 1 to November 15), and an exact visit is one whose window opens within 30 days or is open now.
type Kind = "turn-on" | "blowout"
type Row = [string, string, Kind[], Kind[], number, boolean]
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
  ["2027-09-14", "September", ["blowout"], ["turn-on"], 2027, false],
  ["2027-10-14", "October", ["blowout"], ["turn-on"], 2027, false],
  ["2027-11-14", "November, blowout window still open", ["blowout"], ["turn-on"], 2027, false],
  ["2027-11-20", "November, window closed", [], ["turn-on", "blowout"], 2028, true],
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
  it("gives a visit whose window has closed next year's season", () => {
    const july = passPlanFor("2027-07-14")
    expect(july.visits.map((v) => `${v.kind}:${v.season}:${v.opens}`)).toEqual(["blowout:2027:2027-10-01", "turn-on:2028:2028-04-15"])
    expect(july.visits.map((v) => v.nextSeason)).toEqual([false, true])
  })
})

describe("passPlanFor, the edge days", () => {
  const kinds = (today: string) => passPlanFor(today).visits.map((v) => `${v.kind}:${v.mode}`)
  it("turns the turn-on from a preference to an exact day 30 days before it opens, so from March 16 on it is exact", () => {
    expect(EXACT_WITHIN_DAYS).toBe(30)
    expect(kinds("2027-03-15")).toEqual(["turn-on:preference", "blowout:preference"])
    expect(kinds("2027-03-16")).toEqual(["turn-on:exact", "blowout:preference"])
    expect(kinds("2027-04-30")[0]).toBe("turn-on:exact")
  })
  it("keeps the turn-on exact through the opening day and the whole window", () => {
    expect(kinds("2027-05-01")[0]).toBe("turn-on:exact")
    expect(kinds("2027-05-31")).toEqual(["turn-on:exact", "blowout:preference"])
  })
  it("moves the turn-on to next season the day after its window closes, as a preference", () => {
    expect(kinds("2027-06-01")).toEqual(["blowout:preference", "turn-on:preference"])
    expect(passPlanFor("2027-06-01").visits[1]).toMatchObject({ kind: "turn-on", season: 2028, nextSeason: true })
  })
  it("turns the blowout exact 30 days before October 1, so September and October are exact, with next spring's turn-on a preference", () => {
    expect(kinds("2027-08-31")).toEqual(["blowout:preference", "turn-on:preference"])
    expect(kinds("2027-09-01")).toEqual(["blowout:exact", "turn-on:preference"])
    expect(kinds("2027-10-31")).toEqual(["blowout:exact", "turn-on:preference"])
  })
  it("keeps the blowout through November 15 and starts next season on November 16", () => {
    expect(SEASON_ROLLS).toBe("11-16")
    expect(kinds("2027-11-15")).toEqual(["blowout:exact", "turn-on:preference"])
    expect(passPlanFor("2027-11-15").startsNextSeason).toBe(false)
    const next = passPlanFor("2027-11-16")
    expect(next.visits.map((v) => `${v.kind}:${v.season}:${v.mode}`)).toEqual(["turn-on:2028:preference", "blowout:2028:preference"])
    expect(next.startsNextSeason).toBe(true)
  })
  it("is next season through December 31 and this season again from January 1", () => {
    expect(passPlanFor("2027-12-31").season).toBe(2028)
    expect(passPlanFor("2027-12-31").startsNextSeason).toBe(true)
    expect(passPlanFor("2028-01-01").season).toBe(2028)
    expect(passPlanFor("2028-01-01").startsNextSeason).toBe(false)
    expect(kinds("2028-01-01")).toEqual(["turn-on:preference", "blowout:preference"])
  })
  it("reads a leap year's windows the same way", () => {
    expect(passPlanFor("2028-03-16").visits[0]).toMatchObject({ kind: "turn-on", mode: "exact", opens: "2028-04-15" })
    expect(passPlanFor("2028-03-15").visits[0]!.mode).toBe("preference")
  })
})

describe("the windows", () => {
  it("are the scheduler's settings, read in one place (not the booking fixture's old April 25)", () => {
    const settings = Object.fromEntries(defaultWindows(2027).map((w) => [w.kind, { opens: w.opensOn.slice(5), closes: w.closesOn.slice(5) }]))
    expect(WINDOWS).toEqual(settings)
    expect(PASS_WINDOWS["turn-on"]).toEqual({ opens: "04-15", closes: "05-31" })
    expect(PASS_WINDOWS.blowout).toEqual({ opens: "10-01", closes: "11-15" })
  })
  it("give a single visit its next run: this year's while it is not closed, else next year's", () => {
    expect(nextRun("turn-on", "2027-01-12")).toEqual({ opens: "2027-04-15", closes: "2027-05-31" })
    expect(nextRun("turn-on", "2027-05-20")).toEqual({ opens: "2027-04-15", closes: "2027-05-31" })
    expect(nextRun("turn-on", "2027-06-01")).toEqual({ opens: "2028-04-15", closes: "2028-05-31" })
    expect(nextRun("blowout", "2027-11-15").closes).toBe("2027-11-15")
    expect(nextRun("blowout", "2027-11-16").opens).toBe("2028-10-01")
  })
  it("read the season from the date", () => {
    expect(seasonOf("2027-11-15")).toBe(2027)
    expect(seasonOf("2027-11-16")).toBe(2028)
  })
})

describe("the turn-on's preferences (Hannah, Nov 23 2026: our recommended is early to mid May)", () => {
  const turnOn = { kind: "turn-on" as const, ...PASS_WINDOWS["turn-on"] }
  const window = { kind: "turn-on" as const, opens: `2027-${PASS_WINDOWS["turn-on"].opens}`, closes: `2027-${PASS_WINDOWS["turn-on"].closes}` }
  it("name May 1 to May 15 as recommended, the days before it as early and the days after it as late", () => {
    const t = preferenceDates(window)
    expect(rangeWords(t.earlier)).toBe("Apr 15 to Apr 30")
    expect(rangeWords(t.recommended)).toBe("May 1 to May 15")
    expect(rangeWords(t.later)).toBe("May 16 to May 31")
  })
  it("read a day's preference from those ranges", () => {
    expect(preferenceOfDay(window, "2027-04-15")).toBe("earlier")
    expect(preferenceOfDay(window, "2027-04-30")).toBe("earlier")
    expect(preferenceOfDay(window, "2027-05-01")).toBe("recommended")
    expect(preferenceOfDay(window, "2027-05-15")).toBe("recommended")
    expect(preferenceOfDay(window, "2027-05-16")).toBe("later")
    expect(preferenceOfDay(window, "2027-05-31")).toBe("later")
  })
  it("split a window with no days before the span in thirds, as before", () => {
    expect(rangeWords(preferenceDates({ ...turnOn, opens: "2027-05-01", closes: "2027-05-31" }).recommended)).toBe("May 11 to May 20")
  })
})

describe("preference thirds", () => {
  it("cover a window with no recommended span", () => {
    const t = preferenceDates({ opens: "2027-05-01", closes: "2027-05-31" })
    expect(rangeWords(t.earlier)).toBe("May 1 to May 10")
    expect(rangeWords(t.recommended)).toBe("May 11 to May 20")
    expect(rangeWords(t.later)).toBe("May 21 to May 31")
  })
  it("cover the blowout window and cross the month", () => {
    const t = preferenceDates({ opens: "2027-10-01", closes: "2027-11-15" })
    expect(rangeWords(t.earlier)).toBe("Oct 1 to Oct 15")
    expect(rangeWords(t.recommended)).toBe("Oct 16 to Oct 30")
    expect(rangeWords(t.later)).toBe("Oct 31 to Nov 15")
  })
  it("writes a short date", () => {
    expect(shortDate("2027-05-01")).toBe("May 1")
    expect(shortDate("10-01")).toBe("Oct 1")
  })
})

describe("the preference a kind booked exactly starts with", () => {
  const blowout = { opens: "2027-10-01", closes: "2027-11-15" }
  it("is the part of the window of the day picked", () => {
    expect(preferenceOfDay(blowout, "2027-10-01")).toBe("earlier")
    expect(preferenceOfDay(blowout, "2027-10-15")).toBe("earlier")
    expect(preferenceOfDay(blowout, "2027-10-16")).toBe("recommended")
    expect(preferenceOfDay(blowout, "2027-10-30")).toBe("recommended")
    expect(preferenceOfDay(blowout, "2027-10-31")).toBe("later")
    expect(preferenceOfDay(blowout, "2027-11-15")).toBe("later")
    expect(preferenceOfDay({ opens: "2027-05-01", closes: "2027-05-31" }, "2027-05-04")).toBe("earlier")
  })
})
