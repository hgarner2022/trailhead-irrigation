/**
 * Display formatting shared by blocks and screens: month names and the two
 * date forms DESIGN.md allows, written out where there is room ("October 4")
 * and short in table cells ("Oct 4"). Money is `formatMoney` in ./metrics.
 * A date is read from the ISO string's date prefix as-is. A timestamp is
 * read the same way unless a `timeZone` is given, in which case it is the
 * calendar day in that zone, so a 7 pm Denver visit stays on its day. A
 * date-only string is already a calendar day and is never shifted.
 */

import type { Pass, PassVisit, TimingPreference } from "./types"

/** Where the reader is: every clock and calendar word in the app is in Mountain time. */
export const TIME_ZONE = "America/Denver"

/** The three answers, in the order the checkout and the filters show them. */
export const TIMING_PREFERENCES: readonly TimingPreference[] = ["earlier", "recommended", "later"]

/**
 * The customer's words for a timing preference: one label set, Early, Mid
 * and Late with the month, used the same way on the card, the line, the
 * grid and the checkout. What "Mid" means in detail (the first and second
 * week of May, the second week of October) is said once, in the timing
 * step's helper text.
 */
export function preferenceLabel(kind: "turn-on" | "blowout", preference: TimingPreference): string {
  return `${PREFERENCE_WORDS[preference]} ${kind === "turn-on" ? "May" : "October"}`
}

const PREFERENCE_WORDS: Record<TimingPreference, string> = { earlier: "Early", recommended: "Mid", later: "Late" }

/** A preference inside a sentence: "early May", "mid October". */
export function preferencePhrase(kind: "turn-on" | "blowout", preference: TimingPreference): string {
  const label = preferenceLabel(kind, preference)
  return `${label.charAt(0).toLowerCase()}${label.slice(1)}`
}

/** The pass's preference for a visit kind; null for the inspection, which asks none. */
export function preferenceOf(pass: Pick<Pass, "turnOnPreference" | "blowoutPreference">, kind: PassVisit["kind"]): TimingPreference | null {
  return kind === "turn-on" ? pass.turnOnPreference : kind === "blowout" ? pass.blowoutPreference : null
}

/**
 * The one-line reason under the recommendation.
 * Fall: the median first hard freeze (28°F) at the NOAA stations behind
 * /first-freeze-dates (src/lib/freeze-data.ts), 2015 to 2025, is Boulder
 * Oct 20, Brighton Oct 19, Northglenn Oct 27 and Longmont Oct 28, so a
 * second-week blowout sits a week or more ahead of it.
 * Spring: freeze-data.ts holds fall data only; "safe by early May" is
 * Ryan's rule of thumb and still needs his confirmation.
 */
export function preferenceReason(kind: "turn-on" | "blowout"): string {
  return kind === "turn-on"
    ? "Front Range systems are usually safe to run by early May."
    : "The first hard freeze usually arrives between mid and late October, so the second week leaves room."
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
