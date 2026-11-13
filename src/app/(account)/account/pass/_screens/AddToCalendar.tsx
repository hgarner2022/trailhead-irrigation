import { googleCalendarUrl } from "@/emails/calendar"
import type { Pass, PassVisit } from "@/lib/admin/types"

/**
 * The "Add to calendar" pair under a booked visit: Google's link and the app's .ics file for Apple and Outlook, the same two
 * links the date emails carry. Nothing for a visit with no day or one already done.
 */
export function AddToCalendar({ pass, visit, name }: { pass: Pass; visit: PassVisit; name: string }) {
  if (!visit.scheduledOn || visit.completedAt) return null
  const google = googleCalendarUrl({ id: visit.id ?? visit.kind, name: name.toLowerCase(), day: visit.scheduledOn, startTime: visit.startTime ?? null, crew: null, location: `${pass.town}, CO`, icsUrl: visit.calendarUrl ?? "" })
  const link = "font-medium text-primary-dark underline underline-offset-2 hover:text-primary-deep"
  return (
    <p data-slot="add-to-calendar" className="basis-full text-sm text-muted-foreground">
      Add to calendar:{" "}
      <a href={google} className={link} target="_blank" rel="noreferrer">
        Google
      </a>
      {visit.calendarUrl && (
        <>
          {" "}
          <a href={visit.calendarUrl} className={link}>
            Apple or Outlook
          </a>
        </>
      )}
    </p>
  )
}
