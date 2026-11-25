import { clock12 } from "@/lib/booking/day-time"
import type { Opening } from "./scheduler-panels-types"

// The pure parts of Find a time (docs/plans/2026-11-25-scheduler-design.md, 2.4): the three sorts and the one recommended row.

export type OpeningSort = "recommended" | "soonest" | "least-driving"

const byWhen = (a: Opening, b: Opening) => a.day.localeCompare(b.day) || a.start.localeCompare(b.start) || a.personId.localeCompare(b.personId)

/**
 * Recommended: lowest score first, ties to the earlier day, earlier start, lower person id.
 * Soonest: day, then start, then person. Least driving: added minutes, then day, then start.
 * Returns a new array; the input is not touched.
 */
export function sortOpenings(rows: readonly Opening[], sort: OpeningSort): Opening[] {
  const list = [...rows]
  if (sort === "soonest") return list.sort(byWhen)
  if (sort === "least-driving") return list.sort((a, b) => a.addedMinutes - b.addedMinutes || byWhen(a, b))
  return list.sort((a, b) => a.score - b.score || byWhen(a, b))
}

/** The one row that carries Recommended: the lowest score, whatever the sort. Forced rows never do. */
export function recommendedId(rows: readonly Opening[]): string | undefined {
  return sortOpenings(rows.filter((r) => !r.conflict), "recommended")[0]?.id
}

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "2026-11-30" gives "Mon, Nov 30". */
export function dayShort(day: string): string {
  const d = new Date(`${day}T12:00:00Z`)
  return `${SHORT_DAYS[d.getUTCDay()]}, ${SHORT_MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

/** "09:00", "10:00" gives "9:00 to 10:00 am"; across noon each end keeps its own word: "11:30 am to 12:30 pm". */
export function timeRange(start: string, end: string): string {
  const a = clock12(start)
  const b = clock12(end)
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)} to ${b}` : `${a} to ${b}`
}
