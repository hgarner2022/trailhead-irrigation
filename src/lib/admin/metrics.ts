/**
 * Pure metrics over the screen-facing admin types. Screens and blocks call
 * these and `getAdminData()`; nothing here knows where the data came from.
 * Month and day are read from the stored ISO string's date prefix as-is;
 * converting to Mountain time is the wiring phase's job, not this module's.
 */
import type { BlowoutWeek, Invoice, MonthTotal, Pass, PassVisit, Quote, Visit } from "./types"

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
const MONTH_BY_NAME = new Map(MONTHS.flatMap((name, i) => [[name, i + 1], [name.slice(0, 3), i + 1]]))

/** A lapsed or cancelled pass is no longer a commitment, so it counts nowhere; money collected on a pass that later lapsed will be its own metric if Hannah wants it. */
const counts = (p: Pass) => p.status === "active"

const day = (iso: string) => iso.slice(0, 10)
const byIso = <T>(key: (x: T) => string) => (a: T, b: T) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0)

/** The month a pass visit lands in: its scheduled date if set, else the first month named anywhere in its window. */
function visitMonth(visit: PassVisit): number | null {
  if (visit.scheduledAt) return Number(visit.scheduledAt.slice(5, 7))
  for (const word of visit.window.toLowerCase().match(/[a-z]+/g) ?? []) {
    const month = MONTH_BY_NAME.get(word)
    if (month) return month
  }
  return null
}

/** Every visit amount on every active pass. */
export function committedRevenue(passes: Pass[]): number {
  return passes.filter(counts).reduce((sum, p) => sum + p.visits.reduce((s, v) => s + v.amount, 0), 0)
}

/** Amounts already charged on active passes. */
export function chargedSoFar(passes: Pass[]): number {
  return passes.filter(counts).reduce((sum, p) => sum + p.visits.filter((v) => v.chargedAt).reduce((s, v) => s + v.amount, 0), 0)
}

/** Committed and charged amounts per month for one season, only the months that have visits, in month order. */
export function committedByMonth(passes: Pass[], season: number): { month: number; committed: number; charged: number }[] {
  const byMonth = new Map<number, { month: number; committed: number; charged: number }>()
  for (const pass of passes.filter((p) => counts(p) && p.season === season)) {
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
  const raw = previous ? ((current - previous) / previous) * 100 : null
  const deltaPct = raw === null ? null : Math.sign(raw) * Math.round(Math.abs(raw)) || 0
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

/** Scheduled, not yet charged visits on active passes from the `from` day onward, soonest first. */
export function upcomingCharges(passes: Pass[], from: string, limit = 10): UpcomingCharge[] {
  const charges: UpcomingCharge[] = []
  for (const pass of passes.filter(counts)) {
    for (const visit of pass.visits) {
      if (!visit.scheduledAt || visit.chargedAt || day(visit.scheduledAt) < day(from)) continue
      const { firstName, town } = pass
      charges.push({ passId: pass.id, firstName, town, kind: visit.kind, amount: visit.amount, scheduledAt: visit.scheduledAt })
    }
  }
  return charges.sort(byIso((c) => c.scheduledAt)).slice(0, limit)
}

const countAndTotal = (rows: { total: number }[]) => ({ count: rows.length, total: rows.reduce((s, r) => s + r.total, 0) })

export function quotesAwaiting(quotes: Quote[]): { count: number; total: number } {
  return countAndTotal(quotes.filter((q) => q.status === "awaiting"))
}

/** Unpaid invoices whose due day is before `today`. */
export function invoicesOverdue(invoices: Invoice[], today: string): { count: number; total: number } {
  return countAndTotal(invoices.filter((i) => i.status !== "paid" && day(i.dueAt) < day(today)))
}

/** Visits that are still on for that calendar day, earliest first. */
export function visitsOn(visits: Visit[], dayIso: string): Visit[] {
  const onDay = (v: Visit): v is Visit & { startAt: string } =>
    v.status !== "cancelled" && v.startAt !== undefined && day(v.startAt) === day(dayIso)
  return visits.filter(onDay).sort(byIso((v) => v.startAt))
}

/** `$1,234`, no cents; `-$50` for negatives; `$0` for zero. */
export function formatMoney(n: number): string {
  const whole = Math.trunc(Math.abs(n))
  return `${n < 0 && whole > 0 ? "-" : ""}$${whole.toLocaleString("en-US")}`
}

/** `+12%`, `-8%`, `0%`, or `no comparison`. */
export function formatDelta(deltaPct: number | null): string {
  if (deltaPct === null) return "no comparison"
  return `${deltaPct > 0 ? "+" : ""}${deltaPct}%`
}
