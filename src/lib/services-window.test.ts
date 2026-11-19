import { describe, expect, it } from "vitest"
import { inBookableWindow, isMonthDay, monthDayWords, windowWords } from "./services-window"

describe("isMonthDay", () => {
  it("accepts a real month and day and refuses the rest, February 29 included", () => {
    for (const ok of ["01-01", "04-15", "12-31", "02-29", "09-30"]) expect(isMonthDay(ok)).toBe(true)
    for (const bad of ["13-01", "00-10", "04-31", "02-30", "4-15", "April 15", "2026-04-15", "04/15", ""]) expect(isMonthDay(bad)).toBe(false)
  })
})

describe("windowWords", () => {
  it("says the span in words, and All year for none", () => {
    expect(windowWords({ bookableFrom: "04-15", bookableTo: "06-15" })).toBe("Apr 15 to Jun 15")
    expect(windowWords({ bookableFrom: "11-01", bookableTo: "06-15" })).toBe("Nov 1 to Jun 15")
    expect(windowWords({ bookableFrom: "09-28" })).toBe("From Sep 28")
    expect(windowWords({ bookableTo: "10-31" })).toBe("Until Oct 31")
    expect(windowWords({})).toBe("All year")
    expect(windowWords({ bookableFrom: null, bookableTo: null })).toBe("All year")
    expect(monthDayWords("09-05")).toBe("Sep 5")
  })
})

describe("inBookableWindow", () => {
  it("is always true with no dates", () => {
    expect(inBookableWindow({}, "2027-01-05")).toBe(true)
    expect(inBookableWindow({ bookableFrom: null, bookableTo: null }, "2027-07-04")).toBe(true)
  })

  it("holds the days between the two dates, both included, every year", () => {
    const spring = { bookableFrom: "04-15", bookableTo: "06-15" }
    expect(inBookableWindow(spring, "2027-04-14")).toBe(false)
    expect(inBookableWindow(spring, "2027-04-15")).toBe(true)
    expect(inBookableWindow(spring, "2027-06-15")).toBe(true)
    expect(inBookableWindow(spring, "2027-06-16")).toBe(false)
    expect(inBookableWindow(spring, "2031-05-01")).toBe(true)
  })

  it("wraps New Year when the end is before the start", () => {
    const pass = { bookableFrom: "11-01", bookableTo: "06-15" }
    expect(inBookableWindow(pass, "2026-12-25")).toBe(true)
    expect(inBookableWindow(pass, "2027-02-01")).toBe(true)
    expect(inBookableWindow(pass, "2027-06-15")).toBe(true)
    expect(inBookableWindow(pass, "2027-06-16")).toBe(false)
    expect(inBookableWindow(pass, "2026-10-31")).toBe(false)
    expect(inBookableWindow(pass, "2026-11-01")).toBe(true)
  })

  it("reads an open end as the edge of the year", () => {
    expect(inBookableWindow({ bookableFrom: "09-28" }, "2026-09-27")).toBe(false)
    expect(inBookableWindow({ bookableFrom: "09-28" }, "2026-12-31")).toBe(true)
    expect(inBookableWindow({ bookableTo: "10-31" }, "2027-01-01")).toBe(true)
    expect(inBookableWindow({ bookableTo: "10-31" }, "2027-11-01")).toBe(false)
  })
})
