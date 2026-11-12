import { describe, expect, it } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { visitsOn } from "@/lib/admin/metrics"
import { TIME_ZONE, clockTime, dayHeading, greeting, longDate, monthOf, pageContext, seasonDescription, sparklineOf, tileModels, tomorrowOf, updatedAgo } from "./home-model"

const data = snapshot as AdminData
// 12:56 pm in Denver, four minutes after the snapshot's sync.
const TODAY = "2026-11-12T19:56:30Z"

const empty: AdminData = {
  organizationId: "org_1",
  syncedAt: TODAY,
  clients: [],
  visits: [],
  quotes: [],
  invoices: [],
  passes: [],
  blowoutWeeks: [],
  monthTotals: [],
  attention: [],
}

describe("greeting", () => {
  it("reads the hour in Mountain time", () => {
    expect(greeting("2026-11-12T15:00:00Z")).toBe("Good morning") // 8 am
    expect(greeting("2026-11-12T18:59:00Z")).toBe("Good morning") // 11:59 am
    expect(greeting("2026-11-12T19:00:00Z")).toBe("Good afternoon") // noon
    expect(greeting("2026-11-12T23:59:00Z")).toBe("Good afternoon") // 4:59 pm
    expect(greeting("2026-11-13T00:00:00Z")).toBe("Good evening") // 5 pm
    expect(greeting("2026-11-13T06:30:00Z")).toBe("Good evening") // 11:30 pm
  })
})

describe("dates", () => {
  it("writes the long date, the day headings and the clock time", () => {
    expect(longDate(TODAY)).toBe("Thursday, November 12")
    expect(dayHeading("Today", TODAY)).toBe("Today, Thursday 12")
    expect(dayHeading("Tomorrow", tomorrowOf(TODAY))).toBe("Tomorrow, Friday 13")
    expect(clockTime("2026-11-12T15:00:00Z")).toBe("8:00 am")
    expect(clockTime("2026-11-12T23:30:00Z")).toBe("4:30 pm")
    expect(clockTime("2026-11-12T19:05:00Z")).toBe("12:05 pm")
  })

  it("formats a summer time in Mountain daylight time", () => {
    expect(clockTime("2026-07-10T14:00:00Z")).toBe("8:00 am")
  })

  it("names tomorrow from the Denver calendar day, whatever the hour", () => {
    expect(tomorrowOf(TODAY)).toBe("2026-11-13T19:00:00.000Z")
    expect(tomorrowOf("2026-12-31T20:00:00Z")).toBe("2027-01-01T19:00:00.000Z")
    // 7 pm Thursday in Denver is already Friday in UTC; tomorrow is still Friday, not Saturday.
    expect(dayHeading("Tomorrow", tomorrowOf("2026-11-13T02:00:00Z"))).toBe("Tomorrow, Friday 13")
    expect(dayHeading("Today", "2026-11-13T02:00:00Z")).toBe("Today, Thursday 12")
  })

  it("lists the Denver day's visits under its heading after 5 pm", () => {
    const evening = "2026-11-13T02:00:00Z"
    const names = (iso: string) => visitsOn(data.visits, iso, TIME_ZONE).map((v) => v.clientName)
    expect(names(evening)).toEqual(["Percy", "Alicia", "Ethan", "Matthew"])
    expect(names(tomorrowOf(evening))).toEqual(["David", "Ricky", "Joel", "Brian"])
    const late = { ...data.visits[0], id: "late", clientName: "Late", startAt: "2026-11-13T00:30:00Z", status: "scheduled" as const }
    expect(visitsOn([...data.visits, late], evening, TIME_ZONE).map((v) => v.clientName)).toContain("Late")
    expect(visitsOn([late], tomorrowOf(evening), TIME_ZONE)).toEqual([])
  })

  it("reads the month of today", () => {
    expect(monthOf(TODAY)).toEqual({ year: 2026, month: 11, name: "November" })
    expect(monthOf("2027-01-01T03:00:00Z")).toEqual({ year: 2026, month: 12, name: "December" })
  })
})

describe("updatedAgo", () => {
  const at = (secondsBefore: number) => new Date(Date.parse(TODAY) - secondsBefore * 1000).toISOString()

  it("says just now under a minute, minutes to ninety, then hours", () => {
    expect(updatedAgo(at(30), TODAY)).toBe("just now")
    expect(updatedAgo(at(59), TODAY)).toBe("just now")
    expect(updatedAgo(at(60), TODAY)).toBe("1 minute ago")
    expect(updatedAgo(at(4 * 60), TODAY)).toBe("4 minutes ago")
    expect(updatedAgo(at(89 * 60), TODAY)).toBe("89 minutes ago")
    expect(updatedAgo(at(90 * 60), TODAY)).toBe("1 hour ago")
    expect(updatedAgo(at(3 * 3600), TODAY)).toBe("3 hours ago")
    expect(updatedAgo(at(23 * 3600), TODAY)).toBe("23 hours ago")
    expect(updatedAgo(at(24 * 3600), TODAY)).toBe("1 day ago")
    expect(updatedAgo(at(26 * 3600), TODAY)).toBe("1 day ago")
  })

  it("treats a sync after today as just now", () => {
    expect(updatedAgo("2026-11-12T20:30:00Z", TODAY)).toBe("just now")
  })

  it("builds the page context line", () => {
    expect(pageContext(data, TODAY)).toBe("Thursday, November 12. Updated 4 minutes ago.")
    expect(pageContext(empty, TODAY)).toBe("Thursday, November 12. Updated just now.")
  })
})

describe("tileModels", () => {
  it("builds the four tiles from the snapshot", () => {
    const [revenue, passes, quotes, overdue] = tileModels(data, TODAY)

    expect(revenue.label).toBe("Revenue this month")
    expect(revenue.value).toBe("$3,245")
    expect(revenue.delta).toEqual({ value: null, baseline: "November 2025", goodWhen: "up" })
    expect(revenue.sparkline).toEqual({ current: [3331, 5663, 12448, 11392, 7299, 13247, 18365, 3245] })
    expect(revenue.href).toBeUndefined()

    expect(passes.label).toBe("Passes sold")
    expect(passes.value).toBe("11")
    expect(passes.href).toBe("/admin/passes")

    expect(quotes.label).toBe("Quotes awaiting, $33,100")
    expect(quotes.value).toBe("16")
    expect(quotes.href).toBeUndefined()

    expect(overdue.label).toBe("Invoices past due, $2,625")
    expect(overdue.value).toBe("14")
    expect(overdue.delta).toEqual({ value: null, baseline: "last month", goodWhen: "down" })
  })

  it("reads $0 and 0 with no data", () => {
    const [revenue, passes, quotes, overdue] = tileModels(empty, TODAY)
    expect(revenue.value).toBe("$0")
    expect(revenue.sparkline).toBeUndefined()
    expect(passes.value).toBe("0")
    expect(quotes.value).toBe("0")
    expect(overdue.value).toBe("0")
  })

  it("describes the season line with the committed and charged totals", () => {
    expect(seasonDescription(data)).toBe("Committed Season Pass revenue by month. $4,695 on 11 passes, $290 charged so far.")
    expect(seasonDescription(empty)).toBe("Committed Season Pass revenue by month, with what has been charged so far.")
    expect(seasonDescription({ passes: [data.passes.find((p) => p.status === "active")!] })).toMatch(/ on 1 pass, /)
  })

  it("keeps the last twelve months in calendar order for the sparkline", () => {
    const totals = Array.from({ length: 15 }, (_, i) => ({ year: 2025 + Math.floor(i / 12), month: (i % 12) + 1, revenue: i + 1, visits: 0 }))
    expect(sparklineOf([...totals].reverse())).toEqual({ current: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] })
    expect(sparklineOf([])).toBeUndefined()
  })
})
