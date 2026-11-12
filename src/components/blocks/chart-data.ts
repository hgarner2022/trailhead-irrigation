import { monthName, monthShort } from "@/lib/admin/format"
import type { MonthTotal } from "@/lib/admin/types"

// Data shaping for the Chart block. Recharts wants one row per x value with a
// column per series, so a list of (year, MonthTotal[]) pairs becomes rows
// keyed `y2026`, `y2025` and so on. A month a series has no row for is 0, so
// the chart draws a zero height bar there instead of a gap.

export const SEASON_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11]

export interface YearSeries {
  year: number
  data: MonthTotal[]
}

export type MonthRow = { month: string } & Record<string, number | string>

export const yearKey = (year: number) => `y${year}`

/** Sorts legend and tooltip items by year, newest first, so this year leads wherever the series came in. */
export const byYearDesc = (item: { dataKey?: unknown }) => -Number(String(item.dataKey).slice(1))

const byCalendar = (months: number[]) => [...months].sort((a, b) => a - b)

/** One row per month in calendar order, every series present as a number. */
export function monthRows(series: YearSeries[], months: number[] = SEASON_MONTHS): MonthRow[] {
  return byCalendar(months).map((month) => {
    const row: MonthRow = { month: monthShort(month) }
    for (const { year, data } of series) {
      row[yearKey(year)] = data.find((m) => m.year === year && m.month === month)?.revenue ?? 0
    }
    return row
  })
}

/** "Revenue by month, 2026 against 2025, April to November" */
export function describeBars(years: number[], months: number[] = SEASON_MONTHS): string {
  const sorted = byCalendar(months)
  const span = sorted.length ? `${monthName(sorted[0])} to ${monthName(sorted[sorted.length - 1])}` : "no months"
  return `Revenue by month, ${years.join(" against ")}, ${span}`
}
