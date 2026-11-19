// A visit that has a booked start time, in the customer's words (docs/plans/2026-11-19-customer-side-polish-research.md, section 1c): the day and the exact start, once,
// "Tuesday, April 20 at 10:30 am", and who is coming. Never an arrival window or a span. Pure; `times` maps a visit id to its start ("HH:MM") until the API carries `startTime`.
import { clock12 } from "@/lib/booking/day-time"
import type { VisitPageModel } from "@/lib/portal/visit-page"

export type BookedTimes = Record<string, string>

/** The day line with the time: a row's "Tue, Apr 20" becomes "Tue, Apr 20, 10:30 am". */
export const rowDayWithTime = (dayWords: string, start: string | undefined): string => (start ? `${dayWords}, ${clock12(start)}` : dayWords)

/** The visit page's day heading, line and detail with the booked time; a done, canceled or untimed visit is returned as it is. */
export function withBookedTime(model: VisitPageModel, start: string | undefined, facts: { scheduled: boolean; who?: string | null; told: boolean }): VisitPageModel {
  if (!start || !facts.scheduled) return model
  const heading = `${model.dayHeading} at ${clock12(start)}`
  const detail = facts.who ? `${facts.who} is coming.` : null
  return { ...model, who: facts.who ?? null, dayHeading: heading, dayDetail: detail, dayLine: detail ? `${heading}. ${detail}` : `${heading}.` }
}
