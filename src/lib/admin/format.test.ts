import { describe, it, expect } from "vitest"
import { MONTH_NAMES, TIME_ZONE, monthDay, monthName, monthShort, shortDate, writtenDate } from "./format"

describe("month names", () => {
  it("names the twelve months by number", () => {
    expect(MONTH_NAMES).toHaveLength(12)
    expect(monthName(1)).toBe("January")
    expect(monthName(10)).toBe("October")
    expect(monthShort(4)).toBe("Apr")
    expect(monthShort(9)).toBe("Sep")
  })
})

describe("shortDate", () => {
  it("reads a date or a datetime as the short table form", () => {
    expect(shortDate("2027-10-04")).toBe("Oct 4")
    expect(shortDate("2027-04-20T16:00:00Z")).toBe("Apr 20")
    expect(shortDate("2027-11-30")).toBe("Nov 30")
  })
})

describe("time zone", () => {
  // 01:00 UTC on July 9 is 7 pm on July 8 in Denver (MDT, UTC-6); 06:30 UTC on January 1 is 11:30 pm on December 31 (MST, UTC-7).
  it("reads a timestamp as its calendar day in the zone", () => {
    expect(TIME_ZONE).toBe("America/Denver")
    expect(shortDate("2027-07-09T01:00:00Z")).toBe("Jul 9")
    expect(shortDate("2027-07-09T01:00:00Z", TIME_ZONE)).toBe("Jul 8")
    expect(writtenDate("2027-01-01T06:30:00Z", TIME_ZONE)).toBe("December 31")
    expect(monthDay("2027-07-09T01:00:00Z", TIME_ZONE)).toEqual({ month: 7, day: 8 })
  })

  it("never shifts a date-only string", () => {
    expect(shortDate("2027-10-04", TIME_ZONE)).toBe("Oct 4")
    expect(writtenDate("2027-01-01", TIME_ZONE)).toBe("January 1")
  })

  it("keeps a daytime timestamp on its own day", () => {
    expect(shortDate("2027-04-20T16:00:00Z", TIME_ZONE)).toBe("Apr 20")
  })
})

describe("writtenDate", () => {
  it("writes a date out in full", () => {
    expect(writtenDate("2027-04-20T16:00:00Z")).toBe("April 20")
    expect(writtenDate("2027-10-04")).toBe("October 4")
  })
})
