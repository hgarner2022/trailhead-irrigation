import { CalendarPlus } from "lucide-react"

// "Add to calendar" for any booked visit (docs/plans/2026-11-18-customer-portal-v2-design.md, section 2, row 16): Google's add-event link and the app's signed .ics file for Apple and
// Outlook, the same two links the date emails carry. A visit with no told window is an all-day event, since a day is a promise and a window is a message. Pure props, server-safe.

export interface AddToCalendarLinksProps {
  googleHref: string
  icsHref: string
}

const link = "font-semibold text-primary-deep underline underline-offset-2 hover:text-primary-dark"

export function AddToCalendarLinks({ googleHref, icsHref }: AddToCalendarLinksProps) {
  return (
    <p data-slot="add-to-calendar" className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <CalendarPlus aria-hidden className="size-4" />
        Add to calendar
      </span>
      <a href={googleHref} className={link} target="_blank" rel="noreferrer">
        Google
      </a>
      <a href={icsHref} className={link}>
        Apple or Outlook
      </a>
    </p>
  )
}
