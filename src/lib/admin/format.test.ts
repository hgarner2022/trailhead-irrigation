import { describe, it, expect } from "vitest"
import { MONTH_NAMES, TIME_ZONE, longDay, money, moneyRounded, moneySigned, monthDay, monthName, monthShort, preferenceLabel, preferenceOf, preferencePhrase, preferenceReason, shortDate, shortDay, weekdayName, writtenDate } from "./format"

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

describe("timing preferences", () => {
  it("writes each preference as Early, Mid or Late with the month", () => {
    expect(preferenceLabel("turn-on", "earlier")).toBe("Early May")
    expect(preferenceLabel("turn-on", "recommended")).toBe("Mid May")
    expect(preferenceLabel("turn-on", "later")).toBe("Late May")
    expect(preferenceLabel("blowout", "earlier")).toBe("Early October")
    expect(preferenceLabel("blowout", "recommended")).toBe("Mid October")
    expect(preferenceLabel("blowout", "later")).toBe("Late October")
  })

  it("writes a preference inside a sentence in lower case", () => {
    expect(preferencePhrase("turn-on", "earlier")).toBe("early May")
    expect(preferencePhrase("turn-on", "recommended")).toBe("mid May")
    expect(preferencePhrase("blowout", "recommended")).toBe("mid October")
    expect(preferencePhrase("blowout", "later")).toBe("late October")
  })

  it("reads the pass's preference for a visit kind, and none for the inspection", () => {
    const pass = { turnOnPreference: "earlier", blowoutPreference: "later" } as const
    expect(preferenceOf(pass, "turn-on")).toBe("earlier")
    expect(preferenceOf(pass, "blowout")).toBe("later")
    expect(preferenceOf(pass, "inspection")).toBeNull()
  })

  it("gives one plain reason for each recommendation", () => {
    expect(preferenceReason("turn-on")).toBe("Front Range systems are usually safe to run by early May.")
    expect(preferenceReason("blowout")).toBe("The first hard freeze usually arrives between mid and late October, so the second week leaves room.")
  })
})

describe("money", () => {
  it("writes whole dollars with a thousands comma, exactly as given", () => {
    expect(money(0)).toBe("$0")
    expect(money(95)).toBe("$95")
    expect(money(1234)).toBe("$1,234")
    expect(money(1234567)).toBe("$1,234,567")
  })

  it("does not round: a cent is kept as the number says it", () => {
    expect(money(12.5)).toBe("$12.5")
  })
})

describe("moneyRounded", () => {
  it("rounds to the dollar first", () => {
    expect(moneyRounded(12.4)).toBe("$12")
    expect(moneyRounded(12.5)).toBe("$13")
    expect(moneyRounded(1234.6)).toBe("$1,235")
    expect(moneyRounded(95)).toBe("$95")
  })
})

describe("moneySigned", () => {
  it("writes a credit as -$45, never $-45", () => {
    expect(moneySigned(-45)).toBe("-$45")
    expect(moneySigned(-1234)).toBe("-$1,234")
    expect(moneySigned(45)).toBe("$45")
    expect(moneySigned(0)).toBe("$0")
  })

  it("reads negative zero as $0", () => {
    expect(moneySigned(-0)).toBe("$0")
  })
})

describe("the day words", () => {
  it("names the weekday of a calendar day", () => {
    expect(weekdayName("2026-05-05")).toBe("Tuesday")
    expect(weekdayName("2026-10-14")).toBe("Wednesday")
  })

  it("writes a short day with its weekday for a card or a band", () => {
    expect(shortDay("2026-04-28")).toBe("Tue, Apr 28")
    expect(shortDay("2026-10-15")).toBe("Thu, Oct 15")
  })

  it("writes a long day where there is room", () => {
    expect(longDay("2026-05-05")).toBe("Tuesday, May 5")
    expect(longDay("2026-10-15")).toBe("Thursday, October 15")
  })
})
