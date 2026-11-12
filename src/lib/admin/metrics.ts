/**
 * Pure metrics over the screen-facing admin types. Screens and blocks call
 * these and `getAdminData()`; nothing here knows where the data came from.
 * Dates are ISO strings and are compared by their `YYYY-MM-DD` prefix.
 */
import type { BlowoutWeek, Invoice, MonthTotal, Pass, PassVisit, Quote, Visit } from "./types"

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]

const liveFrom = (passes: Pass[]) => passes.filter((p) => p.status !== "cancelled")

/** The month a pass visit lands in: its scheduled date if set, else the first month named in its window. */
function visitMonth(visit: PassVisit): number | null {
  if (visit.scheduledAt) return Number(visit.scheduledAt.slice(5, 7))
  const first = visit.window.toLowerCase().match(/[a-z]+/)?.[0]
  const index = first ? MONTHS.indexOf(first) : -1
  return index === -1 ? null : index + 1
}

/** Every visit amount on every active pass. */
export function committedRevenue(passes: Pass[]): number {
  return passes
    .filter((p) => p.status === "active")
    .reduce((sum, p) => sum + p.visits.reduce((s, v) => s + v.amount, 0), 0)
}

/** Amounts already charged, across passes that are not cancelled. */
export function chargedSoFar(passes: Pass[]): number {
  return liveFrom(passes).reduce((sum, p) => sum + p.visits.filter((v) => v.chargedAt).reduce((s, v) => s + v.amount, 0), 0)
}

/** Committed and charged amounts per month for one season, only the months that have visits, in month order. */
export function committedByMonth(passes: Pass[], season: number): { month: number; committed: number; charged: number }[] {
  const byMonth = new Map<number, { month: number; committed: number; charged: number }>()
  for (const pass of liveFrom(passes).filter((p) => p.season === season)) {
    for (const visit of pass.visits) {
      const month = visitMonth(visit)
      if (month === null) continue
      const row = byMonth.get(month) ?? { month, committed: 0, charged: 0 }
      row.committed += visit.amount
      if (visit.chargedAt) row.charged += visit.amount
      byMonth.set(month, row)
    }
  }
  return [...byMonth.values()].sort((a, b) => a.month - b.month)
}

/** A month's revenue beside the same month a year earlier. */
export function monthComparison(
  monthTotals: MonthTotal[],
  year: number,
  month: number,
): { current: number; previous: number | null; deltaPct: number | null } {
  const find = (y: number) => monthTotals.find((m) => m.year === y && m.month === month)
  const current = find(year)?.revenue ?? 0
  const previous = find(year - 1)?.revenue ?? null
  const deltaPct = previous ? Math.round(((current - previous) / previous) * 100) : null
  return { current, previous, deltaPct }
}

export function spotsLeft(week: BlowoutWeek): number {
  return Math.max(0, week.capacity - week.taken)
}

export interface UpcomingCharge {
  passId: string
  firstName: string
  town: Pass["town"]
  kind: PassVisit["kind"]
  amount: number
  scheduledAt: string
}

/** Scheduled, not yet charged visits on live passes from `from` onward, soonest first. */
export function upcomingCharges(passes: Pass[], from: string, limit = 10): UpcomingCharge[] {
  const charges: UpcomingCharge[] = []
  for (const pass of liveFrom(passes)) {
    for (const visit of pass.visits) {
      if (!visit.scheduledAt || visit.chargedAt || visit.scheduledAt < from) continue
      const { firstName, town } = pass
      charges.push({ passId: pass.id, firstName, town, kind: visit.kind, amount: visit.amount, scheduledAt: visit.scheduledAt })
    }
  }
  return charges.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).slice(0, limit)
}

const countAndTotal = (rows: { total: number }[]) => ({ count: rows.length, total: rows.reduce((s, r) => s + r.total, 0) })

export function quotesAwaiting(quotes: Quote[]): { count: number; total: number } {
  return countAndTotal(quotes.filter((q) => q.status === "awaiting"))
}

/** Unpaid invoices whose due date is before `today`. */
export function invoicesOverdue(invoices: Invoice[], today: string): { count: number; total: number } {
  return countAndTotal(invoices.filter((i) => i.status !== "paid" && i.dueAt < today))
}

/** Visits starting on that calendar day, earliest first. */
export function visitsOn(visits: Visit[], dayIso: string): Visit[] {
  const day = dayIso.slice(0, 10)
  return visits
    .filter((v) => v.startAt?.slice(0, 10) === day)
    .sort((a, b) => (a.startAt as string).localeCompare(b.startAt as string))
}

/** `$1,234`, no cents; `-$50` for negatives; `$0` for zero. */
export function formatMoney(n: number): string {
  const whole = Math.trunc(Math.abs(n))
  const digits = whole.toLocaleString("en-US")
  return `${n < 0 && whole > 0 ? "-" : ""}$${digits}`
}

/** `+12%`, `-8%`, `0%`, or `no comparison`. */
export function formatDelta(deltaPct: number | null): string {
  if (deltaPct === null) return "no comparison"
  return `${deltaPct > 0 ? "+" : ""}${deltaPct}%`
}
