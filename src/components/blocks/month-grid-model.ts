import { addDays, weekdayOf, WEEKDAYS } from "@/lib/admin/calendar"
import type { Town } from "@/lib/admin/types"

/** What a month cell says about one day (docs/plans/2026-11-25-scheduler-design.md, 7.4): derived from the visits and time off, nothing typed. */
export interface MonthDay {
  /** YYYY-MM-DD */
  day: string
  stops: number
  /** the towns in the day, most stops first */
  towns: readonly Town[]
  /** a dot each, in their colour order */
  personIds: readonly string[]
  /** people off some or all of the day */
  offIds?: readonly string[]
  /** everyone is off all day: the whole cell is hatched */
  allOff?: boolean
  /** a move the customer has not been told about */
}

const pad = (n: number) => String(n).padStart(2, "0")
export const monthOf = (day: string) => day.slice(0, 7)
export const shiftMonth = (ym: string, n: number) => {
  const t = Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1 + n
  return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`
}
/** "November 2026" */
export const monthTitle = (ym: string) => new Date(`${ym}-01T12:00:00Z`).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })

/** The weeks of a month, Monday first, each a row of seven days; the days of the months around it are null. */
export function monthWeeks(ym: string): (string | null)[][] {
  const first = `${ym}-01`
  const lead = WEEKDAYS.indexOf(weekdayOf(first))
  const count = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate()
  const cells: (string | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: count }, (_, i) => `${ym}-${pad(i + 1)}`)]
  while (cells.length % 7) cells.push(null)
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7))
}

/** Where an arrow, Home, End, PageUp or PageDown sends focus from `day`; null for a key the grid does not use. */
export function keyTarget(key: string, day: string): string | null {
  const wd = WEEKDAYS.indexOf(weekdayOf(day))
  if (key === "ArrowLeft") return addDays(day, -1)
  if (key === "ArrowRight") return addDays(day, 1)
  if (key === "ArrowUp") return addDays(day, -7)
  if (key === "ArrowDown") return addDays(day, 7)
  if (key === "Home") return addDays(day, -wd)
  if (key === "End") return addDays(day, 6 - wd)
  if (key === "PageUp" || key === "PageDown") {
    const ym = shiftMonth(monthOf(day), key === "PageUp" ? -1 : 1)
    const last = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate()
    return `${ym}-${pad(Math.min(Number(day.slice(8)), last))}`
  }
  return null
}

/** "5 visits", "1 visit". */
export const visitsWords = (n: number) => `${n} ${n === 1 ? "visit" : "visits"}`
/** Up to two towns, then "+1": "Erie, Lafayette +1". */
export function townsLine(towns: readonly Town[]): string {
  const shown = towns.slice(0, 2).join(", ")
  return towns.length > 2 ? `${shown} +${towns.length - 2}` : shown
}
