import { AddToCalendarLinks } from "@/components/blocks/AddToCalendarLinks"
import { VisitPage } from "@/components/blocks/VisitPage"
import type { PortalCustomerType, PortalJobType } from "@/api/v1/portal/schemas"
import { visitPageOf } from "@/lib/portal/visit-page"
import { withBookedTime, type BookedTimes } from "@/lib/portal/booked-time"
import type { DayTimeOffer } from "@/lib/booking/day-time"
import { CancelControl, RescheduleControl, type VisitActions } from "./VisitControls"

// One visit's page (design section 4): the model from `visitPageOf` in `VisitPage`, with the buttons that carry the server actions as its slots, and Add to
// calendar for any booked visit. The 24-hour rule was decided by the API; this only reads it.

export interface VisitScreenProps extends VisitActions {
  customer: PortalCustomerType
  job: PortalJobType
  visitId: string
  today: string
  /** the days `visits.areaDays` offers, up to five */
  days?: string[]
  /** with slots: the booked start of each visit ("10:30"), and the open days with their times for Reschedule */
  times?: BookedTimes
  offers?: readonly DayTimeOffer[]
  /** Google's add-event link and the app's signed .ics link, for a booked visit */
  calendar?: { googleHref: string; icsHref: string }
}

export function VisitScreen({ customer, job, visitId, today, days, calendar, times, offers, onReschedule, onRescheduleTime, onCancel }: VisitScreenProps) {
  const visit = job.visits.find((v) => v.id === visitId)
  if (!visit) return null
  const start = times?.[visit.id]
  const model = withBookedTime(visitPageOf(job, visit, customer, today), start, { scheduled: visit.status === "scheduled", who: visit.personFirstName, told: visit.windowTold })
  const props = { job, visit, today, days, offers, currentStart: start, textHref: model.textHref, onReschedule, onRescheduleTime, onCancel }
  return <VisitPage model={model} rescheduleSlot={<RescheduleControl {...props} />} cancelSlot={<CancelControl {...props} />} calendarSlot={calendar ? <AddToCalendarLinks googleHref={calendar.googleHref} icsHref={calendar.icsHref} /> : null} />
}
