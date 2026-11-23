import { AddToCalendarLinks } from "@/components/blocks/AddToCalendarLinks"
import { PreferenceAsk } from "@/components/blocks/PreferenceAsk"
import { VisitPage } from "@/components/blocks/VisitPage"
import type { TimingPreference } from "@/lib/admin/types"
import type { TimingKind } from "@/lib/portal/preference-words"
import type { PortalCustomerType, PortalJobType } from "@/api/v1/portal/schemas"
import type { PhotoItem } from "@/lib/photos/types"
import { visitPageOf } from "@/lib/portal/visit-page"
import { VisitPhotos, type VisitPhotosProps } from "./VisitPhotos"
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
  /** we are asking for this visit's timing (the Preference request's link opens here): the quiet banner shows above the visit, with the choice on file */
  ask?: { kind: TimingKind; value: TimingPreference; onSave?: (kind: TimingKind, preference: TimingPreference) => void | Promise<unknown> }
  /** this visit's photos as this customer may see them (their own, and Ryan's marked ones once it is Done); left out where photos are not offered */
  photos?: { items: PhotoItem[]; configured: boolean; link?: string; onAdd: VisitPhotosProps["onAdd"]; onRemove?: VisitPhotosProps["onRemove"] }
}

export function VisitScreen({ customer, job, visitId, today, days, calendar, photos, times, offers, ask, onReschedule, onRescheduleTime, onCancel }: VisitScreenProps) {
  const visit = job.visits.find((v) => v.id === visitId)
  if (!visit) return null
  const start = times?.[visit.id]
  const model = withBookedTime(visitPageOf(job, visit, customer, today), start, { scheduled: visit.status === "scheduled", who: visit.personFirstName, told: visit.windowTold })
  const props = { job, visit, today, days, offers, currentStart: start, textHref: model.textHref, onReschedule, onRescheduleTime, onCancel }
  const gone = visit.status === "cancelled" || visit.status === "skipped"
  const photosSlot = photos ? <VisitPhotos visitId={visitId} photos={photos.items} configured={photos.configured} canAdd={!gone} link={photos.link} onAdd={photos.onAdd} onRemove={photos.onRemove} /> : null
  return <VisitPage model={model} topSlot={ask ? <PreferenceAsk kind={ask.kind} value={ask.value} onSave={ask.onSave} /> : undefined} rescheduleSlot={<RescheduleControl {...props} />} cancelSlot={<CancelControl {...props} />} calendarSlot={calendar ? <AddToCalendarLinks googleHref={calendar.googleHref} icsHref={calendar.icsHref} /> : null} photosSlot={photosSlot} />
}
