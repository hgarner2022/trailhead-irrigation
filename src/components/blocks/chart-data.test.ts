import { describe, it, expect } from "vitest"
import { SEASON_MONTHS, describeBars, monthRows, yearKey } from "./chart-data"

const y2026 = [
  { year: 2026, month: 4, revenue: 3331, visits: 14 },
  { year: 2026, month: 10, revenue: 18365, visits: 162 },
  { year: 2026, month: 5, revenue: 5663, visits: 28 },
]
const y2025 = [{ year: 2025, month: 10, revenue: 14200, visits: 120 }]

describe("monthRows", () => {
  it("keys each row by year and fills the months a series is missing with zero", () => {
    const rows = monthRows([{ year: 2026, data: y2026 }, { year: 2025, data: y2025 }], [4, 5, 10])
    expect(rows).toEqual([
      { month: "Apr", y2026: 3331, y2025: 0 },
      { month: "May", y2026: 5663, y2025: 0 },
      { month: "Oct", y2026: 18365, y2025: 14200 },
    ])
  })

  it("orders the months by calendar whatever order they came in", () => {
    const rows = monthRows([{ year: 2026, data: y2026 }], [10, 4])
    expect(rows.map((r) => r.month)).toEqual(["Apr", "Oct"])
  })

  it("defaults to April through November", () => {
    const rows = monthRows([{ year: 2026, data: y2026 }])
    expect(rows.map((r) => r.month)).toEqual(["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"])
    expect(SEASON_MONTHS).toEqual([4, 5, 6, 7, 8, 9, 10, 11])
  })

  it("handles one series", () => {
    const rows = monthRows([{ year: 2026, data: y2026 }], [4])
    expect(rows).toEqual([{ month: "Apr", y2026: 3331 }])
  })

  it("ignores rows from another year inside a series", () => {
    const rows = monthRows([{ year: 2026, data: [...y2026, { year: 2024, month: 4, revenue: 999, visits: 1 }] }], [4])
    expect(rows[0][yearKey(2026)]).toBe(3331)
  })
})

describe("describeBars", () => {
  it("names the years and the month span", () => {
    expect(describeBars([2026, 2025])).toBe("Revenue by month, 2026 against 2025, April to November")
    expect(describeBars([2026], [9, 10])).toBe("Revenue by month, 2026, September to October")
  })
})
