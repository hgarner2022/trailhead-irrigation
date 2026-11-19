// A visit that has a booked start time, in the customer's words (docs/plans/2026-11-18-scheduling-engine-design.md section 2, rows 1, 8 and 15; UX audit rows 11 and 12). A customer picks a day AND
// an exact start, so the account says both the moment it is booked: "Tuesday, April 20 at 10:30 am", then "Ryan arrives between 10:30 and 11:00 am." The day-before text confirms it; nothing
// is promised that the product does not send. Pure; `times` maps a visit id to its start ("HH:MM") until the API carries `startTime`.
import { arrivalWindow, clock12 } from "@/lib/booking/day-time"
import type { VisitPageModel } from "@/lib/portal/visit-page"

export type BookedTimes = Record<string, string>

/** The day line with the time: a row's "Tue, Apr 20" becomes "Tue, Apr 20, 10:30 am". */
export const rowDayWithTime = (dayWords: string, start: string | undefined): string => (start ? `${dayWords}, ${clock12(start)}` : dayWords)

/** The visit page's day heading, line and detail with the booked time and the half hour Ryan arrives in; a done, canceled or untimed visit is returned as it is. */
export function withBookedTime(model: VisitPageModel, start: string | undefined, facts: { scheduled: boolean; who?: string | null; told: boolean }): VisitPageModel {
  if (!start || !facts.scheduled) return model
  const heading = `${model.dayHeading} at ${clock12(start)}`
  const detail = `${facts.who ?? "Ryan"} arrives ${arrivalWindow(start)}.${facts.told ? "" : " We'll text you the day before."}`
  return { ...model, dayHeading: heading, dayDetail: detail, dayLine: `${heading}. ${detail}` }
}
