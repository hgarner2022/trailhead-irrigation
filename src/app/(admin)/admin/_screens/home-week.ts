/**
 * The pure parts of Home v2 (owner, 16 Nov: "Home should have your schedule on it, the money, maybe a map of where
 * your things are"): the day "Your week" shows, the four money figures and the stops the map draws. Kept apart from
 * home-model.ts so each file stays small and both can be tested with a fixed `today`.
 */
import { TOWN_CENTRES, hasPoint } from "@/components/blocks/day-map-helpers"
import { dayOf } from "@/lib/admin/calendar"
import { TIME_ZONE } from "@/lib/admin/format"
import { committedRevenue, formatMoney, monthComparison } from "@/lib/admin/metrics"
import type { AdminData, Visit } from "@/lib/admin/types"
import { dayByTruck, monthOf, type TruckDay } from "./home-model"
import { dayLabel } from "./visit-panel-model"
import { visitRows } from "./visits-model"

export interface WeekView {
  /** the day shown, YYYY-MM-DD; null when nothing is on the calendar from today on */
  day: string | null
  isToday: boolean
  /** "Today, Mon 16", or "Next: Tue, Apr 27 · 3 visits in Erie" */
  heading: string
  /** each truck's stops that day in route order, a truck with none left out */
  trucks: TruckDay[]
  /** every stop of the day, for the map */
  visits: Visit[]
}

const WEEKDAY = (day: string) => dayLabel(day).slice(0, 3)

/** "Erie", "Erie and Longmont", "Erie, Longmont and Lafayette", "5 towns". */
export function townsPhrase(towns: string[]): string {
  const unique = [...new Set(towns)]
  if (unique.length > 3) return `${unique.length} towns`
  if (unique.length <= 1) return unique[0] ?? ""
  return `${unique.slice(0, -1).join(", ")} and ${unique[unique.length - 1]}`
}

/**
 * The day Your week shows: today when it has a visit, else the first day after today that has one. Cancelled visits
 * and visits with no day are not on a day. With nothing ahead, `day` is null and the heading says so once.
 */
export function weekView(data: Pick<AdminData, "visits" | "settings">, today: string): WeekView {
  const todayDay = dayOf(today, TIME_ZONE)
  const days = data.visits
    .filter((v): v is Visit & { startAt: string } => v.status !== "cancelled" && v.startAt !== undefined)
    .map((v) => dayOf(v.startAt, TIME_ZONE))
    .filter((d) => d >= todayDay)
    .sort()
  const day = days[0] ?? null
  if (!day) return { day: null, isToday: false, heading: "Your week", trucks: [], visits: [] }
  const trucks = dayByTruck(data.visits, day, data.settings.trucks)
  const visits = trucks.flatMap((t) => t.stops)
  const isToday = day === todayDay
  const heading = isToday
    ? `Today, ${WEEKDAY(day)} ${Number(day.slice(8, 10))}`
    : `Next: ${dayLabel(day)} · ${visits.length} ${visits.length === 1 ? "visit" : "visits"} in ${townsPhrase(visits.map((v) => v.town))}`
  return { day, isToday, heading, trucks, visits }
}

/** The stops the map draws: a visit with no point sits at its town's centre, so no stop is left off. */
export function mapStops(visits: Visit[]): Visit[] {
  return visits.map((v) => {
    if (hasPoint(v)) return v
    const centre = TOWN_CENTRES[v.town]
    return centre ? { ...v, lng: centre[0], lat: centre[1] } : v
  })
}

export interface MoneyFigure {
  label: string
  /** whole dollars, already formatted */
  value: string
  /** Reports, or the Visits list filtered to the visits the figure counts */
  href: string
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

/**
 * The four figures on Home's one money line, in the order a person asks them: what came in this month, what is owed
 * on visits already done, what failed, and the season's total. Each links to where the rows behind it are. The Visits
 * list is read through `visitRows`, so the figure and the list never disagree.
 */
export function moneyFigures(data: AdminData, today: string): MoneyFigure[] {
  const { year, month } = monthOf(today)
  const rows = visitRows(data, today)
  const owed = rows.filter((r) => r.work === "done" && (r.money === "unpaid" || r.money === "bill-sent"))
  const failed = rows.filter((r) => r.money === "failed")
  const sum = (list: { price: number }[]) => formatMoney(list.reduce((n, r) => n + r.price, 0))
  return [
    { label: "Charged this month", value: formatMoney(monthComparison(data.monthTotals, year, month).current), href: "/admin/reports" },
    { label: owed.length ? `Owed on ${plural(owed.length, "done visit")}` : "Owed on done visits", value: sum(owed), href: "/admin/visits?money=unpaid,bill-sent" },
    { label: failed.length ? `Failed charges, ${failed.length}` : "Failed charges", value: sum(failed), href: "/admin/visits?money=failed" },
    { label: "Season total committed", value: formatMoney(committedRevenue(data.passes)), href: "/admin/reports" },
  ]
}
