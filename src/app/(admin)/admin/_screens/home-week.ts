/**
 * The pure parts of Home v2 (owner, 16 Nov: "Home should have your schedule on it, the money, maybe a map of where
 * your things are"): the day the Today card shows, the four money figures and the stops the map draws. Kept apart from
 * home-model.ts so each file stays small and both can be tested with a fixed `today`.
 */
import { TOWN_CENTRES, hasPoint } from "@/components/blocks/day-map-helpers"
import { dayOf } from "@/lib/admin/calendar"
import { TIME_ZONE } from "@/lib/admin/format"
import { billsOverdue, committedRevenue, formatMoney, monthComparison } from "@/lib/admin/metrics"
import type { AdminData, Visit } from "@/lib/admin/types"
import { dayByPerson, monthOf, type PersonDay } from "./home-model"
import { dayLabel } from "./visit-panel-model"
import { jobCount, owedRows, visitRows } from "./visits-model"

export interface WeekView {
  /** the day shown, YYYY-MM-DD; null when nothing is on the calendar from today on */
  day: string | null
  isToday: boolean
  /** the card's title: "Today" when today has a visit, else "Next up" */
  title: string
  /** "Mon, Nov 16 · 4 visits in Erie", under the title */
  heading: string
  /** each person's stops that day in route order, a person with none left out */
  people: PersonDay[]
  /** every stop of the day, for the map */
  visits: Visit[]
}

/** "Erie", "Erie and Longmont", "Erie, Longmont and Lafayette", "5 towns". */
export function townsPhrase(towns: string[]): string {
  const unique = [...new Set(towns)]
  if (unique.length > 3) return `${unique.length} towns`
  if (unique.length <= 1) return unique[0] ?? ""
  return `${unique.slice(0, -1).join(", ")} and ${unique[unique.length - 1]}`
}

/**
 * The day the Today card shows: today when it has a visit, else the first day after today that has one (the card is then "Next up"). Cancelled visits
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
  if (!day) return { day: null, isToday: false, title: "Today", heading: "", people: [], visits: [] }
  // Every person, not only those on the schedule: a visit still held by someone who lost their truck files under their name here, as it does on Visits. `routePeople` decides only the schedule rows.
  const people = dayByPerson(data.visits, day, data.settings.people)
  const visits = people.flatMap((p) => p.stops)
  const isToday = day === todayDay
  const heading = `${dayLabel(day)} · ${visits.length} ${visits.length === 1 ? "visit" : "visits"} in ${townsPhrase(visits.map((v) => v.town))}`
  return { day, isToday, title: isToday ? "Today" : "Next up", heading, people, visits }
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
 * on visits already done, what failed, and the season's total; a fifth, "N bills overdue", joins them only while a bill is
 * past its due day. Each links to where the rows behind it are. The Visits list is read through `visitRows`, so the figure
 * and the list never disagree, and the owed figure counts the same rows as the Visits header's "done and owed" (`owedRows`).
 */
export function moneyFigures(data: AdminData, today: string): MoneyFigure[] {
  const { year, month } = monthOf(today)
  const rows = visitRows(data, today)
  // Owed is read from the payment rows by `visitJob`; a job counts once however many of its visits are owed.
  const owed = owedRows(rows)
  const owedJobs = jobCount(owed)
  const failed = rows.filter((r) => r.money === "failed")
  const sum = (list: { price: number }[]) => formatMoney(list.reduce((n, r) => n + r.price, 0))
  const overdue = billsOverdue(data.jobs, today, TIME_ZONE)
  return [
    { label: "Charged this month", value: formatMoney(monthComparison(data.monthTotals, year, month).current), href: "/admin/reports" },
    { label: owedJobs ? `Owed on ${plural(owedJobs, "done job")}` : "Owed on done jobs", value: sum(owed), href: "/admin/visits?money=owed" },
    { label: failed.length ? `Failed charges, ${failed.length}` : "Failed charges", value: sum(failed), href: "/admin/visits?money=failed" },
    { label: "Season total committed", value: formatMoney(committedRevenue(data.passes)), href: "/admin/reports" },
    // The link is the Bill sent filter: it lists every open bill, the overdue ones among them.
    ...(overdue.count ? [{ label: `${plural(overdue.count, "bill")} overdue`, value: formatMoney(overdue.total), href: "/admin/visits?money=bill-sent" }] : []),
  ]
}
