/**
 * The pure derivations behind HomeScreen: the greeting, the date line, the
 * "updated N minutes ago" wording and the season line's description and the four tile models. Kept out of the
 * screen so they can be unit tested with a fixed `today`.
 *
 * There is one definition of "day" on Home, the calendar day in Mountain
 * time (`TIME_ZONE`): the greeting hour, the long date, "8:00 am", tomorrow
 * and the month all come from it, and the screen passes the same zone to
 * `visitsOn` and `billsOverdue`, so a 7 pm visit stays on its Thursday.
 */
import type { StatTileProps } from "@/components/blocks/StatTile"
import type { AdminData, Attention, MonthTotal, OrganizationSettings, SeasonWindow, Visit } from "@/lib/admin/types"
import { TIME_ZONE, monthDay, monthShort } from "@/lib/admin/format"
import { addDays, dayOf } from "@/lib/admin/calendar"
import { NOT_CLOSED_LOOKBACK_DAYS, jobCounts, paymentsOf, visitJob } from "@/lib/admin/jobs"
import { paidTotal } from "@/lib/money/words"
import { isOnToday, type TodayMoney } from "./today-model"
import { billsOverdue, chargedSoFar, committedRevenue, formatMoney, monthComparison, quotesAwaiting, visitsOn } from "@/lib/admin/metrics"

/** The season the Home line shows. The snapshot's passes are all 2027; the wiring phase derives this from the passes on hand. */
export const SEASON = 2027

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const SPARK_MONTHS = 12

const partsOf = (iso: string): Record<string, string> => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
  })
  return Object.fromEntries(formatter.formatToParts(new Date(iso)).map((p) => [p.type, p.value]))
}

/** "Good morning" before noon, "Good afternoon" before 5 pm, else "Good evening". */
export function greeting(iso: string): string {
  const hour = Number(partsOf(iso).hour)
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

/** "Thursday, November 12" */
export function longDate(iso: string): string {
  const { weekday, month, day } = partsOf(iso)
  return `${weekday}, ${month} ${day}`
}

/** "Today, Thursday 12" */
export function dayHeading(prefix: string, iso: string): string {
  const { weekday, day } = partsOf(iso)
  return `${prefix}, ${weekday} ${day}`
}

/** "8:00 am" */
export function clockTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit", hour12: true })
    .format(new Date(iso))
    .toLowerCase()
}

/** The calendar month `iso` falls in, with its name for the comparison baseline. */
export function monthOf(iso: string): { year: number; month: number; name: string } {
  const { year, month } = partsOf(iso)
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, month: "numeric" })
  return { year: Number(year), month: Number(formatter.format(new Date(iso))), name: month }
}

/** Noon in Mountain time on the next Denver calendar day, so it names the right day whatever the hour. */
export function tomorrowOf(iso: string): string {
  const { year, month } = monthOf(iso)
  const { day } = partsOf(iso)
  // 19:00Z is noon MST and 1 pm MDT, both well inside the same Denver day.
  return new Date(Date.UTC(year, month - 1, Number(day) + 1, 19)).toISOString()
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`

/** "just now" under a minute, minutes up to ninety, then hours, then days. A sync after `today` reads "just now". */
export function updatedAgo(syncedAt: string, today: string): string {
  const elapsed = Date.parse(today) - Date.parse(syncedAt)
  if (!(elapsed >= MINUTE)) return "just now"
  if (elapsed < 90 * MINUTE) return plural(Math.floor(elapsed / MINUTE), "minute")
  if (elapsed < DAY) return plural(Math.floor(elapsed / HOUR), "hour")
  return plural(Math.floor(elapsed / DAY), "day")
}

/** "Thursday, November 12. Updated 4 minutes ago." */
export function pageContext(data: Pick<AdminData, "syncedAt">, today: string): string {
  return `${longDate(today)}. Updated ${updatedAgo(data.syncedAt, today)}.`
}

/** The last twelve months of revenue in calendar order; undefined when there is nothing to draw. */
export function sparklineOf(monthTotals: MonthTotal[]): StatTileProps["sparkline"] | undefined {
  if (monthTotals.length === 0) return undefined
  const ordered = [...monthTotals].sort((a, b) => a.year - b.year || a.month - b.month)
  return { current: ordered.slice(-SPARK_MONTHS).map((m) => m.revenue) }
}

const SEASON_LINE = "Committed Season Pass revenue by month"

/** The line under the season title: what the chart is, then the committed and charged totals once there is a pass. */
export function seasonDescription(data: Pick<AdminData, "passes">): string {
  const active = data.passes.filter((p) => p.status === "active").length
  if (active === 0) return `${SEASON_LINE}, with what has been charged so far.`
  const passes = active === 1 ? "1 pass" : `${active} passes`
  return `${SEASON_LINE}. ${formatMoney(committedRevenue(data.passes))} on ${passes}, ${formatMoney(chargedSoFar(data.passes))} charged so far.`
}

/** The four tiles Home opens with, in order: revenue this month, passes sold, quotes awaiting, our invoices past due (the Jobber mirror's invoices no longer have a tile). */
export function tileModels(data: AdminData, today: string): StatTileProps[] {
  const { year, month, name } = monthOf(today)
  const revenue = monthComparison(data.monthTotals, year, month)
  const active = data.passes.filter((p) => p.status === "active").length
  const quotes = quotesAwaiting(data.quotes)
  const overdue = billsOverdue(data.jobs, today, TIME_ZONE)
  return [
    {
      label: "Revenue this month",
      value: formatMoney(revenue.current),
      delta: { value: revenue.deltaPct, baseline: `${name} ${year - 1}`, goodWhen: "up" },
      sparkline: sparklineOf(data.monthTotals),
    },
    {
      label: "Passes sold",
      value: String(active),
      href: "/admin/customers",
    },
    {
      label: `Quotes awaiting, ${formatMoney(quotes.total)}`,
      value: String(quotes.count),
    },
    {
      label: `Invoices past due, ${formatMoney(overdue.total)}`,
      value: String(overdue.count),
      href: "/admin/schedule?view=list&money=bill-sent",
      delta: { value: null, baseline: "last month", goodWhen: "down" },
    },
  ]
}

const dayNumber = (dayIso: string) => Date.UTC(Number(dayIso.slice(0, 4)), Number(dayIso.slice(5, 7)) - 1, Number(dayIso.slice(8, 10))) / DAY

/**
 * The next season window to set up: the earliest whose first day is today or
 * later and no more than `leadWeeks + 2` weeks away (the boundary day counts),
 * or null. A window that has already opened is past the prompt.
 */
export function upcomingWindow(settings: Pick<OrganizationSettings, "windows">, today: string): SeasonWindow | null {
  const todayDay = dayNumber(dayOf(today, TIME_ZONE))
  const soon = settings.windows
    .filter((w) => {
      const away = dayNumber(w.opensOn) - todayDay
      return away >= 0 && away <= (w.leadWeeks + 2) * 7
    })
    .sort((a, b) => (a.opensOn < b.opensOn ? -1 : 1))
  return soon[0] ?? null
}

const WINDOW_WORDS: Record<SeasonWindow["kind"], string> = { "turn-on": "Spring turn-ons", inspection: "Mid-season inspections", blowout: "Fall blowouts" }

/** "Fall blowouts open Oct 1" */
export function windowTitle(season: SeasonWindow): string {
  const { month, day } = monthDay(season.opensOn)
  return `${WINDOW_WORDS[season.kind]} open ${monthShort(month)} ${day}`
}

/** How far back Home looks for jobs nobody closed; older ones are a cleanup, not a morning prompt. */
export { NOT_CLOSED_LOOKBACK_DAYS }

/** Jobs from the last `NOT_CLOSED_LOOKBACK_DAYS` Mountain-time days before today (today excluded) whose day passed and nobody marked done, oldest first. The flag is `jobOf`'s, the one derivation. */
export function notClosedVisits(visits: Visit[], today: string, timeZone: string): Visit[] {
  const todayDay = dayOf(today, timeZone)
  const earliest = addDays(todayDay, -NOT_CLOSED_LOOKBACK_DAYS)
  return visits
    .filter((v): v is Visit & { startAt: string } => {
      if (v.startAt === undefined) return false
      const job = visitJob(v, todayDay, timeZone)
      return job.notClosed && job.day !== undefined && job.day >= earliest
    })
    .sort((a, b) => (a.startAt < b.startAt ? -1 : 1))
}

export const notClosedCount = (visits: Visit[], today: string, timeZone: string) => notClosedVisits(visits, today, timeZone).length

/** The Needs attention row for jobs left open, or null when every earlier job is closed. It waits since the oldest one. */
export function notClosedAttention(visits: Visit[], today: string, timeZone: string): Attention | null {
  const open = notClosedVisits(visits, today, timeZone)
  if (open.length === 0) return null
  const n = open.length
  return { kind: "not-closed", message: `${n} ${n === 1 ? "job" : "jobs"} from the last two weeks ${n === 1 ? "is" : "are"} not marked done yet.`, since: open[0].startAt! }
}

/** The second row of tiles on Reports: visits needing a day, charges that did not go through, visits not closed and pending passes, all counted by `jobCounts`. */
export function jobTiles(data: Pick<AdminData, "passes" | "visits">, today: string): StatTileProps[] {
  const c = jobCounts(data, dayOf(today, TIME_ZONE), TIME_ZONE)
  return [
    { label: "Visits needing a day", value: String(c.needsDay), href: "/admin/schedule" },
    { label: "Charges that didn't go through", value: String(c.chargeFailed), href: "/admin/schedule?view=list&money=failed" },
    { label: "Visits not closed", value: String(c.notClosed), href: "/admin/schedule" },
    { label: "Pending passes, expire after an hour", value: String(c.pendingPasses), href: "/admin/customers" },
  ]
}

export interface PersonDay {
  /** the person's id, or "none" for stops nobody has yet */
  personId: string
  /** "Ryan Garner", or "No one yet" */
  name: string
  stops: Visit[]
}

/**
 * Home's day list: the visits that are on for `dayIso`, grouped under the person who has them in the settings' order,
 * each person's stops in route order (the stop number where the route build has set one, else the start time). A visit
 * nobody has yet goes last under "No one yet". A person with no stop that day is left out.
 */
export function dayByPerson(visits: Visit[], dayIso: string, people: { id: string; name: string }[]): PersonDay[] {
  const onDay = visitsOn(visits, dayIso, TIME_ZONE)
  const order = (a: Visit, b: Visit) => (a.stopOrder ?? 1e9) - (b.stopOrder ?? 1e9) || (a.startAt ?? "").localeCompare(b.startAt ?? "")
  const days = people.map((p) => ({ personId: p.id, name: p.name, stops: onDay.filter((v) => v.personId === p.id).sort(order) }))
  const known = new Set(people.map((p) => p.id))
  const loose = onDay.filter((v) => !v.personId || !known.has(v.personId)).sort(order)
  return [...days, { personId: "none", name: "No one yet", stops: loose }].filter((d) => d.stops.length > 0)
}

/** The time a stop shows: its start ("8:00 am") when the route has one, else "Any time". */
export function stopTime(visit: Pick<Visit, "startAt" | "startTime">): string {
  return visit.startTime && visit.startAt ? clockTime(visit.startAt) : "Any time"
}

/**
 * The four figures on Today's strip, whole dollars. Each visit counts at the price of its own lines (`priceOf`, `visitPrice`
 * over the job's lines). Today is every visit on the day (scheduled for it, or done on it), Done those done today, Ahead the rest
 * not yet done. Unpaid is what today's done visits still owe, read from their succeeded payment rows (`paymentsOf`, refunds
 * counting against, a part-paid visit owing the rest): a visit whose invoice is sent or whose charge failed still owes it, a paid
 * one owes nothing, a canceled or skipped visit is on no figure.
 */
export function todayMoney(visits: Visit[], priceOf: (v: Visit) => number, today: string): TodayMoney {
  const day = dayOf(today, TIME_ZONE)
  const on = visits.filter((v) => isOnToday(v, day))
  const isDone = (v: Visit) => visitJob(v, day, TIME_ZONE).work === "done"
  const done = on.filter(isDone)
  const sum = (list: Visit[]) => list.reduce((n, v) => n + priceOf(v), 0)
  const owed = done.reduce((n, v) => n + Math.max(0, priceOf(v) - paidTotal(paymentsOf(v))), 0)
  return { today: sum(on), done: sum(done), ahead: sum(on.filter((v) => !isDone(v))), owed }
}
