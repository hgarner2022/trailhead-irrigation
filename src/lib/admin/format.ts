/**
 * Display formatting shared by blocks and screens: month names and the two
 * date forms DESIGN.md allows, written out where there is room ("October 4")
 * and short in table cells ("Oct 4"). Money is `formatMoney` in ./metrics.
 * A date is read from the ISO string's date prefix as-is. A timestamp is
 * read the same way unless a `timeZone` is given, in which case it is the
 * calendar day in that zone, so a 7 pm Denver visit stays on its day. A
 * date-only string is already a calendar day and is never shifted.
 */

import type { TimingPreference } from "./types"

/** Where the reader is: every clock and calendar word in the app is in Mountain time. */
export const TIME_ZONE = "America/Denver"

/**
 * The customer's words for a timing preference. Trailhead's recommendation
 * is the first to second week of May for the turn-on and the second week of
 * October for the blowout; "earlier" and "later" sort within the window.
 */
export function preferenceLabel(kind: "turn-on" | "blowout", preference: TimingPreference): string {
  return PREFERENCE_LABELS[kind][preference]
}

const PREFERENCE_LABELS: Record<"turn-on" | "blowout", Record<TimingPreference, string>> = {
  "turn-on": { earlier: "Early May", recommended: "First half of May", later: "Late May" },
  blowout: { earlier: "Early October", recommended: "Second week of October", later: "Late October" },
}

/**
 * The one-line reason under the recommendation. The dates come from the
 * NOAA stations on /first-freeze-dates (src/lib/freeze-data.ts): the first
 * hard freeze (28°F) lands between mid and late October in most years, and
 * the spring's last one is behind us by early May.
 */
export function preferenceReason(kind: "turn-on" | "blowout"): string {
  return kind === "turn-on"
    ? "The last hard freeze on the Front Range is usually past by early May."
    : "The first hard freeze usually arrives late in October."
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export const monthName = (month: number) => MONTH_NAMES[month - 1]
export const monthShort = (month: number) => monthName(month).slice(0, 3)

const partFormatters = new Map<string, Intl.DateTimeFormat>()
const partFormatter = (timeZone: string) => {
  let f = partFormatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone, month: "numeric", day: "numeric" })
    partFormatters.set(timeZone, f)
  }
  return f
}

/** The month and day of `iso`: the prefix as-is, or, for a timestamp with a `timeZone`, the calendar day in that zone. */
export function monthDay(iso: string, timeZone?: string): { month: number; day: number } {
  if (timeZone && iso.length > 10) {
    const parts = Object.fromEntries(partFormatter(timeZone).formatToParts(new Date(iso)).map((p) => [p.type, p.value]))
    return { month: Number(parts.month), day: Number(parts.day) }
  }
  return { month: Number(iso.slice(5, 7)), day: Number(iso.slice(8, 10)) }
}

/** "Oct 4" from an ISO date or datetime, for table cells and chips. */
export function shortDate(iso: string, timeZone?: string): string {
  const { month, day } = monthDay(iso, timeZone)
  return `${monthShort(month)} ${day}`
}

/** "October 4" from an ISO date or datetime, where there is room. */
export function writtenDate(iso: string, timeZone?: string): string {
  const { month, day } = monthDay(iso, timeZone)
  return `${monthName(month)} ${day}`
}
