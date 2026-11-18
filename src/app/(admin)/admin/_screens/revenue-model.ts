/**
 * The pure derivations behind RevenueScreen: the chart series from the month
 * totals, the upcoming charge rows, the header's words and the renewals
 * pipeline. Kept out of the screen so they can be unit tested with a fixed
 * `today`. Timestamps are read as their calendar day in Mountain time
 * (`TIME_ZONE`), so a 7 pm visit stays on its day; date-only strings never shift.
 */
import type { YearSeries } from "@/components/blocks/chart-data"
import type { AdminData, MonthTotal, Pass, Visit } from "@/lib/admin/types"
import { TIME_ZONE, shortDate } from "@/lib/admin/format"
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

/** "2026 against 2025, and the 2027 Season Pass commitments." The comparison is named only when last year is there. */
export function revenueContext(series: [YearSeries, YearSeries?] | undefined, thisYear: number, season: number): string {
  const years = series ? seriesWords(series) : String(thisYear)
  return `${years}, and the ${season} Season Pass commitments.`
}

export interface UpcomingRow {
  key: string
  /** "Apr 20", the day in Mountain time */
  date: string
  name: string
  town: Pass["town"]
  visit: string
  amount: number
}

/** The next charges on active passes from `today` on, soonest first, as rows for the list. Days are Mountain time. */
export function upcomingRows(passes: Pass[], today: string, limit = 10): UpcomingRow[] {
  return upcomingCharges(passes, today, limit, TIME_ZONE).map((c) => ({
    key: `${c.passId}-${c.kind}`,
    date: shortDate(c.scheduledAt, TIME_ZONE),
    name: c.firstName,
    town: c.town,
    visit: VISIT_NAMES[c.kind],
    amount: c.amount,
  }))
}

/**
 * What customers owe us right now, for the Revenue screen's "Outstanding": every open bill at its total, plus every booked job
 * (not a pass, which is charged to its card on its own) whose visits are all done or cancelled and that still owes money, at what
 * it still owes. A job counts once: with an open bill it is the bill's total and its owed number is not added on top; a bill for a
 * part-done job asks only for the done lines, so the lines still ahead are not outstanding. Nothing without the sold jobs (the fixtures).
 */
export function outstanding(data: Pick<AdminData, "jobs" | "visits">): { total: number; jobs: number } | undefined {
  if (!data.jobs) return undefined
  const byId = new Map(data.visits.map((v) => [v.id, v]))
  let total = 0
  let count = 0
  for (const job of data.jobs) {
    if (job.invoice && (job.money?.owed ?? 1) > 0) {
      total += job.invoice.total
      count += 1
      continue
    }
    if (job.kind === "pass" || !job.money || job.money.owed <= 0) continue
    const visits = job.visitIds.map((id) => byId.get(id)).filter((v): v is Visit => v !== undefined && v.status !== "cancelled")
    if (visits.length === 0 || visits.some((v) => v.status !== "completed")) continue
    total += job.money.owed
    count += 1
  }
  return { total, jobs: count }
}

/** Whether any pass belongs to a season before `season`, which is when the Renewals card has something to say. */
export function hasRenewals(passes: Pass[], season: number): boolean {
  return passes.some((p) => p.season < season)
}

export interface Renewals {
  /** earlier-season passes whose client already holds a pass for `season` */
  renewed: Pass[]
  /** earlier-season passes that lapsed, their client without a new pass */
  lapsed: Pass[]
  /** earlier-season passes, active or cancelled, their client without a new pass: the ones to send the offer to */
  notYetAsked: Pass[]
}

/**
 * The renewal pipeline in the PRD's words. Every pass from before `season`
 * lands in exactly one list, in the order it was sold: renewed when its
 * client has a pass for `season`, else lapsed or not yet asked by its status.
 */
export function renewals(passes: Pass[], season: number): Renewals {
  const renewedClients = new Set(passes.filter((p) => p.season === season).map((p) => p.clientId))
  const result: Renewals = { renewed: [], lapsed: [], notYetAsked: [] }
  for (const pass of passes.filter((p) => p.season < season)) {
    if (renewedClients.has(pass.clientId)) result.renewed.push(pass)
    else if (pass.status === "lapsed") result.lapsed.push(pass)
    else result.notYetAsked.push(pass)
  }
  return result
}
