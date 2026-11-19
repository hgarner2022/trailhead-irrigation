/**
 * The span of the year a service's visit may fall in (docs/plans/2026-11-18-admin-holistic-design.md, 8.2): `bookable_from` and
 * `bookable_to` on the service, each "MM-DD" repeating every year. Both empty is all year; an empty end is open (a "from" alone runs to
 * December 31, a "to" alone starts January 1); a "to" before the "from" wraps New Year (Nov 1 to Jun 15). It is the span in which a
 * visit's day may land, defined once here: `schedule.slots` offers no day outside it, and the Services tab words it. Pure, no secrets:
 * the screens, the API and the checkout may all import it.
 */

export interface BookableWindow {
  bookableFrom?: string | null
  bookableTo?: string | null
}

/** "MM-DD" for a month 01 to 12 and a day that exists in it (February 29 counts: the span repeats every year). */
export const MONTH_DAY = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
export function isMonthDay(value: string): boolean {
  const m = MONTH_DAY.exec(value)
  return Boolean(m) && Number(m![2]) <= DAYS_IN[Number(m![1]) - 1]!
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const
export const MONTH_NAMES = MONTHS
/** "Apr 15" from "04-15". */
export const monthDayWords = (md: string): string => `${MONTHS[Number(md.slice(0, 2)) - 1]} ${Number(md.slice(3, 5))}`

/** "Apr 15 to Jun 15", "From Apr 15", "Until Jun 15", "All year". */
export function windowWords(w: BookableWindow): string {
  if (w.bookableFrom && w.bookableTo) return `${monthDayWords(w.bookableFrom)} to ${monthDayWords(w.bookableTo)}`
  if (w.bookableFrom) return `From ${monthDayWords(w.bookableFrom)}`
  if (w.bookableTo) return `Until ${monthDayWords(w.bookableTo)}`
  return "All year"
}

/** True when the day (YYYY-MM-DD) is inside the span. */
export function inBookableWindow(w: BookableWindow, day: string): boolean {
  if (!w.bookableFrom && !w.bookableTo) return true
  const from = w.bookableFrom ?? "01-01"
  const to = w.bookableTo ?? "12-31"
  const md = day.slice(5, 10)
  return from <= to ? md >= from && md <= to : md >= from || md <= to
}
