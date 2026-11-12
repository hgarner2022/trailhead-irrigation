/**
 * The pure derivations behind RevenueScreen: the chart series from the month
 * totals, the upcoming charge rows and whether any pass is up for renewal.
 * Kept out of the screen so they can be unit tested with a fixed `today`.
 * Dates are read from the ISO string's date prefix as-is, like the rest of
 * `lib/admin`; the wiring phase converts stored times to Mountain time.
 */
import type { YearSeries } from "@/components/blocks/chart-data"
import type { MonthTotal, Pass } from "@/lib/admin/types"
import { shortDate } from "@/lib/admin/format"
import { upcomingCharges } from "@/lib/admin/metrics"
import { VISIT_NAMES } from "./passes-model"

/**
 * The latest year in the totals as this year's series and, when present, the
 * year before it as last year's; undefined with no totals at all. The chart
 * draws the first solid and the second dashed.
 */
export function seriesFor(monthTotals: MonthTotal[]): [YearSeries, YearSeries?] | undefined {
  if (monthTotals.length === 0) return undefined
  const year = Math.max(...monthTotals.map((m) => m.year))
  const ofYear = (y: number): YearSeries => ({ year: y, data: monthTotals.filter((m) => m.year === y) })
  const previous = monthTotals.some((m) => m.year === year - 1) ? ofYear(year - 1) : undefined
  return previous ? [ofYear(year), previous] : [ofYear(year)]
}

/** "2026 against 2025" or just "2026", for the chart's description. */
export function seriesWords(series: [YearSeries, YearSeries?] | undefined): string {
  if (!series) return ""
  return series
    .filter((s): s is YearSeries => s !== undefined)
    .map((s) => String(s.year))
    .join(" against ")
}

export interface UpcomingRow {
  key: string
  /** "Apr 20" */
  date: string
  name: string
  town: Pass["town"]
  visit: string
  amount: number
}

/** The next charges on active passes from `today` on, soonest first, as rows for the list. */
export function upcomingRows(passes: Pass[], today: string, limit = 10): UpcomingRow[] {
  return upcomingCharges(passes, today, limit).map((c) => ({
    key: `${c.passId}-${c.kind}`,
    date: shortDate(c.scheduledAt),
    name: c.firstName,
    town: c.town,
    visit: VISIT_NAMES[c.kind],
    amount: c.amount,
  }))
}

/** Whether any pass belongs to a season before `season`, which is when the Renewals card has something to say. */
export function hasRenewals(passes: Pass[], season: number): boolean {
  return passes.some((p) => p.season < season)
}

/** The passes from before `season`, in the order they were sold. */
export function renewalRows(passes: Pass[], season: number): Pass[] {
  return passes.filter((p) => p.season < season)
}
