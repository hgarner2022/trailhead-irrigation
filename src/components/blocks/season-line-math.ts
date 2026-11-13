/**
 * The position and label maths behind SeasonLine, kept out of the component so
 * the render stays readable. The season runs April (4) to November (11), drawn
 * as eight equal columns; a position is a fraction of the track from 0 to 1.
 * Which month a visit or window lands in is `visitMonth` / `monthInWindow` in
 * `@/lib/admin/metrics`, the one rule shared with the money metrics; month
 * and date names come from `@/lib/admin/format`. Dates are read as their UTC
 * date prefix until the wiring phase converts stored times to Mountain time.
 */
import type { TimingPreference } from "@/lib/admin/types"

export const SEASON_START = 4
export const SEASON_END = 11
export const SEASON_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11]

const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate()

/**
 * Where an ISO date falls along the track, 0 at April 1 and 1 at the end of
 * November, measured by month column so the first of a month sits on its tick.
 * Dates before the season pin to 0 and after it to 1; with `season` given, a
 * date in another year pins the same way.
 */
export function seasonPosition(iso: string, season?: number): number {
  const year = Number(iso.slice(0, 4))
  const month = Number(iso.slice(5, 7))
  const day = Number(iso.slice(8, 10))
  if (season !== undefined && year !== season) return year < season ? 0 : 1
  if (month < SEASON_START) return 0
  if (month > SEASON_END) return 1
  const column = month - SEASON_START + (day - 1) / daysIn(year, month)
  return Math.min(1, column / SEASON_MONTHS.length)
}

/** Whether a date is before, inside or after the season (another year counts as before or after). */
export function seasonPhase(iso: string, season?: number): "before" | "during" | "after" {
  const year = Number(iso.slice(0, 4))
  const month = Number(iso.slice(5, 7))
  if (season !== undefined && year !== season) return year < season ? "before" : "after"
  if (month < SEASON_START) return "before"
  if (month > SEASON_END) return "after"
  return "during"
}

/** The horizontal centre of a month's column as a fraction of the track. */
export const monthCentre = (month: number) => (month - SEASON_START + 0.5) / SEASON_MONTHS.length

/** Which way the today label hangs so it never leaves the track. */
export function markerAlign(position: number): "start" | "center" | "end" {
  if (position < 0.06) return "start"
  if (position > 0.94) return "end"
  return "center"
}

/** The one word under a preferred visit's dot: where in its month the customer would like it. */
export function preferenceWord(preference: TimingPreference): "Early" | "Mid" | "Late" {
  return preference === "earlier" ? "Early" : preference === "later" ? "Late" : "Mid"
}

/** "April, July and October". */
export function listJoin(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ""
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
}
