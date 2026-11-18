/**
 * Pure metrics over the screen-facing admin types. Screens and blocks call
 * these and `getAdminData()`; nothing here knows where the data came from.
 * Month and day are read from the stored ISO string's date prefix as-is
 * unless a `timeZone` is given, in which case the calendar day in that zone
 * is used (Home passes "America/Denver" so that a 7 pm visit stays on its
 * Mountain day). Months in `visitMonth` and `committedByMonth` still read
 * the prefix; the wiring phase converts stored times to Mountain time.
 */
import { invoiceOpen } from "@/lib/money/invoice"
import { visitPaid, visitPaidTotal } from "./jobs"
import type { MonthTotal, Pass, PassVisit, Quote, SoldJob, Visit } from "./types"

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
const MONTH_BY_NAME = new Map(MONTHS.flatMap((name, i) => [[name, i + 1], [name.slice(0, 3), i + 1]]))

/** A lapsed or canceled pass is no longer a commitment, so it counts nowhere; money collected on a pass that later lapsed will be its own metric if Hannah wants it. */
const counts = (p: Pass) => p.status === "active"

const dayFormatters = new Map<string, Intl.DateTimeFormat>()
const dayFormatter = (timeZone: string) => {
  let f = dayFormatters.get(timeZone)
  if (!f) {
    // en-CA writes YYYY-MM-DD, the same shape as the ISO prefix.
    f = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    dayFormatters.set(timeZone, f)
  }
  return f
}

/** The calendar day as YYYY-MM-DD: the ISO prefix, or, for a timestamp with a `timeZone`, the day in that zone. A date-only string is already a calendar day and is never shifted. */
const day = (iso: string, timeZone?: string) =>
  timeZone && iso.length > 10 ? dayFormatter(timeZone).format(new Date(iso)) : iso.slice(0, 10)
const byIso = <T>(key: (x: T) => string) => (a: T, b: T) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0)

/** The first month named anywhere in a window ("early April", "Oct 13", "Late April to May"), by full name or three-letter abbreviation; null when none. */
export function monthInWindow(window: string): number | null {
  for (const word of window.toLowerCase().match(/[a-z]+/g) ?? []) {
    const month = MONTH_BY_NAME.get(word)
    if (month) return month
  }
  return null
}

/** The month a pass visit lands in: its scheduled date if set, else the first month named in its window. The one rule; SeasonLine draws from it too. */
export function visitMonth(visit: PassVisit): number | null {
  if (visit.scheduledAt) return Number(visit.scheduledAt.slice(5, 7))
  return monthInWindow(visit.window)
}

/** Every visit amount on every active pass. */
export function committedRevenue(passes: Pass[]): number {
  return passes.filter(counts).reduce((sum, p) => sum + p.visits.reduce((s, v) => s + v.amount, 0), 0)
}

/** Money already received on active passes, read from the visits' payment rows (a refund counts against). */
export function chargedSoFar(passes: Pass[]): number {
  return passes.filter(counts).reduce((sum, p) => sum + p.visits.reduce((s, v) => s + visitPaidTotal(v), 0), 0)
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
      row.charged += visitPaidTotal(visit)
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

export interface UpcomingCharge {
  passId: string
  firstName: string
  town: Pass["town"]
  kind: PassVisit["kind"]
  amount: number
  scheduledAt: string
}

/** Scheduled, not yet charged visits on active passes from the `from` day onward, soonest first. `timeZone` sets which calendar day `from` and the visits fall on. */
export function upcomingCharges(passes: Pass[], from: string, limit = 10, timeZone?: string): UpcomingCharge[] {
  const charges: UpcomingCharge[] = []
  const fromDay = day(from, timeZone)
  for (const pass of passes.filter(counts)) {
    for (const visit of pass.visits) {
      if (!visit.scheduledAt || visitPaid(visit) || day(visit.scheduledAt, timeZone) < fromDay) continue
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

/**
 * Our own invoices past their due day: each job's open invoice (`SoldJob.invoice` is only ever sent or overdue, never paid or canceled)
 * whose `dueOn` is before `today`, counted once per invoice, by the invoice's total. Home's money line, the Reports tile and the
 * overdue rows all read this rule.
 */
export function billsOverdue(jobs: SoldJob[] | undefined, today: string, timeZone?: string): { count: number; total: number } {
  const todayDay = day(today, timeZone)
  return countAndTotal((jobs ?? []).flatMap((j) => (j.invoice && (j.money?.owed ?? 1) > 0 && j.invoice.dueOn < todayDay ? [j.invoice] : [])))
}

/**
 * Our own invoices (the `invoice` table) that are open (not paid, not canceled) and whose `due_on` is before today, counted once per
 * invoice, by the invoice's total. `today` is a Mountain calendar day or an instant, read as the day it is in `timeZone` (Denver unless
 * said otherwise); `dueOn` is already a Mountain calendar day. The Jobber mirror's invoices are not read.
 */
export function invoicesOverdue(invoices: readonly { total: number; dueOn: string; paidOn?: string | null; cancelledAt?: Date | string | null }[], today: string, timeZone = "America/Denver"): { count: number; total: number } {
  const todayDay = day(today, timeZone)
  return countAndTotal(invoices.filter((i) => invoiceOpen(i) && i.dueOn < todayDay))
}

/** Visits that are still on for that calendar day, earliest first. `timeZone` sets which calendar day a visit falls on. */
export function visitsOn(visits: Visit[], dayIso: string, timeZone?: string): Visit[] {
  const target = day(dayIso, timeZone)
  const onDay = (v: Visit): v is Visit & { startAt: string } =>
    v.status !== "cancelled" && v.startAt !== undefined && day(v.startAt, timeZone) === target
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
