// The one rule for a customer changing their own visit, pure so the handlers that enforce it and the screens that word it read the
// same facts (docs/plans/2026-11-18-customer-portal-v2-design.md section 4; architecture section 3). Hannah's rule, settled Nov 18 2026:
// inside 24 hours of the visit's day a customer cannot cancel or reschedule online; the screen offers Text Ryan and Call Ryan.
// The cut-off is midnight Mountain at the start of the visit's day, minus 24 hours: a Tuesday visit is free to change until Sunday
// 11:59 pm. A visit with no day is always changeable. Staff are not held to it. `withinCutoff` is the only place this is decided.
import { writtenDate } from "@/lib/admin/format"

const ZONE = "America/Denver"

/** "yes": the customer may do it online; "text": too close (or a kind whose days are set with Ryan), text or call Ryan; "no": nothing to do online. */
export type ChangeState = "yes" | "text" | "no"

export interface CutoffFacts {
  scheduledOn: string | null
}

export interface ChangeFacts extends CutoffFacts {
  status: string
  /** the visit's kind has a season window in the settings (turn-on, inspection, blowout), so the customer may be offered other days */
  hasWindow: boolean
  /** the job is sold and not canceled (a pass: open) */
  jobOpen: boolean
}

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

const hourIn = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, hour: "numeric", hourCycle: "h23" })
const dayIn = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" })

/** The Mountain calendar day an instant falls on. */
export const mountainDayOf = (at: Date): string => dayIn.format(at)

/** The instant of 00:00 Mountain on a YYYY-MM-DD day (UTC-6 in daylight time, UTC-7 otherwise). */
function mountainMidnight(day: string): Date {
  const base = Date.parse(`${day}T00:00:00Z`)
  for (const offsetHours of [6, 7]) {
    const at = new Date(base + offsetHours * 3_600_000)
    if (mountainDayOf(at) === day && Number(hourIn.format(at)) === 0) return at
  }
  return new Date(base + 7 * 3_600_000)
}

/** The instant after which a customer may no longer change this visit online: 00:00 Mountain on the day before the visit. Undefined for a visit with no day. */
export function cutoffAt(v: { scheduledOn: string }): Date {
  return mountainMidnight(addDays(v.scheduledOn, -1))
}

/** Whether a booked day is inside the 24 hours a customer may not change online. A visit with no day is never inside it. */
export function withinCutoff(v: CutoffFacts, now: Date): boolean {
  return v.scheduledOn !== null && now.getTime() >= cutoffAt({ scheduledOn: v.scheduledOn }).getTime()
}

/**
 * `withinCutoff` for a caller that holds today's Mountain calendar day and no instant (the admin's screens): the cut-off is a midnight, so
 * "now is at or after it" is "today is at or after the day before the visit".
 */
export const withinCutoffOn = (day: string | null | undefined, today: string): boolean => Boolean(day) && today >= addDays(day!, -1)

/** "Sunday, April 26, 11:59 pm": the last minute a customer may change the visit online. */
export function cutoffWords(v: { scheduledOn: string }): string {
  const last = addDays(v.scheduledOn, -2)
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(`${last}T12:00:00Z`).getUTCDay()]!
  return `${weekday}, ${writtenDate(last)}, 11:59 pm`
}

/** "Sun, Apr 25, 11:59 pm": the same last minute, as the office reads it. */
export function cutoffShortWords(v: { scheduledOn: string }): string {
  const last = addDays(v.scheduledOn, -2)
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(`${last}T12:00:00Z`).getUTCDay()]!
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(last.slice(5, 7)) - 1]!
  return `${weekday}, ${month} ${Number(last.slice(8, 10))}, 11:59 pm`
}

/** What a customer may do with a visit online: reschedule it and cancel it, each yes, text or no. */
export function changeFor(f: ChangeFacts, now: Date): { reschedule: ChangeState; cancel: ChangeState } {
  const NONE = { reschedule: "no", cancel: "no" } as const
  if (!f.jobOpen) return NONE
  if (f.status !== "unscheduled" && f.status !== "scheduled") return NONE
  if (f.status === "scheduled" && f.scheduledOn) {
    // The day has passed and Ryan has not closed it: Booked, with no buttons.
    if (f.scheduledOn < mountainDayOf(now)) return NONE
    if (withinCutoff(f, now)) return { reschedule: "text", cancel: "text" }
  }
  // A visit with no day is scheduled by us ("about two weeks before"), never picked by the customer: only a scheduled visit can be moved online.
  if (f.status === "unscheduled") return { reschedule: "no", cancel: "yes" }
  return { reschedule: f.hasWindow ? "yes" : "text", cancel: "yes" }
}

/** Whether a customer may pick another day online for a kind of visit: only the kinds with a season window in the settings (turn-on, inspection, blowout) have self-serve days until the slots step. The one derivation the account and the admin both read. */
export const hasSelfServeDays = (kind: string, windows: ReadonlyArray<{ kind: string }>): boolean => windows.some((w) => w.kind === kind)
