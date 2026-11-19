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

/** "MM-DD" from a window's "YYYY-MM-DD"; null when it is not a date. */
export const monthDayOfDate = (date: string): string | null => (/^\d{4}-\d{2}-\d{2}$/.test(date) && isMonthDay(date.slice(5)) ? date.slice(5) : null)

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
const dated = (year: number, md: string) => `${year}-${md === "02-29" && !isLeap(year) ? "02-28" : md}`

/**
 * The scheduling window (`settings.windows.<kind>`, whole dates) that says the same as a service's "MM-DD" span, until the engine reads
 * the span itself (step 7). An empty end is open ("from" alone runs to Dec 31, "to" alone starts Jan 1, neither is all year). The window
 * keeps the year it has (`existing.opensOn`); one that wraps New Year closes the next year. With no window yet it opens on the next
 * occurrence of the start from `today` ("YYYY-MM-DD").
 */
export function windowDatesFor(w: BookableWindow, existing: { opensOn: string } | undefined, today: string): { opensOn: string; closesOn: string } {
  const from = w.bookableFrom ?? "01-01"
  const to = w.bookableTo ?? "12-31"
  const known = existing && /^\d{4}-/.test(existing.opensOn) ? Number(existing.opensOn.slice(0, 4)) : null
  const thisYear = Number(today.slice(0, 4))
  const year = known ?? (dated(thisYear, from) >= today ? thisYear : thisYear + 1)
  return { opensOn: dated(year, from), closesOn: dated(year + (to < from ? 1 : 0), to) }
}
