import { CancelVisitSheet } from "@/components/blocks/CancelVisitSheet"
import { RescheduleSheet, type SheetResult } from "@/components/blocks/RescheduleSheet"
import { TextRyan } from "@/components/blocks/TextRyan"
import type { PortalJobType, PortalVisitType } from "@/api/v1/portal/schemas"
import { cancelConsequence, cancelFactsOf, timelineDay } from "@/lib/portal/words"
import { visitDayWords } from "@/lib/portal/words"

// What a customer may do with one visit, as the buttons that carry the server actions: Reschedule (or Pick a day) and Cancel visit before the 24-hour cut-off, Text Ryan and
// Call Ryan after it, nothing for a visit that is done or gone. The next-visit card on Home and the visit page both put these in; the 24-hour rule is decided once, by the
// API (`PortalVisit.reschedule` and `.cancel`), and this reads it. A server screen hands the client sheets the server action itself bound to the visit, never an inline arrow.

/** The server actions the controls call, taking the visit first so they can be bound to it. */
export interface VisitActions {
  /** moves the visit to one of the offered days (or gives a waiting visit its day) and texts the customer */
  onReschedule?: (visitId: string, day: string) => SheetResult | Promise<SheetResult>
  /** cancels the visit with the customer's optional reason */
  onCancel?: (visitId: string, reason: string) => SheetResult | Promise<SheetResult>
}

export interface VisitControlsProps extends VisitActions {
  job: PortalJobType
  visit: PortalVisitType
  today: string
  /** the days `visits.areaDays` offers, up to five */
  days?: string[]
  /** the `sms:` link with the visit named */
  textHref: string
}

/** The Reschedule button for a visit, or null when the customer may not move it online. */
export function RescheduleControl({ job, visit, days = [], textHref, onReschedule }: VisitControlsProps) {
  if (visit.reschedule !== "yes") return null
  return <RescheduleSheet service={visit.name} address={job.address} currentDay={visit.status === "scheduled" ? visit.scheduledOn : null} days={days} textHref={textHref} onPick={onReschedule?.bind(null, visit.id)} />
}

/** The Cancel visit button for a visit, or null when the customer may not cancel it online. */
export function CancelControl({ job, visit, today, textHref, onCancel }: VisitControlsProps) {
  if (visit.cancel !== "yes") return null
  const dayWords = visit.scheduledOn ? (visitDayWords(visit, today) ?? timelineDay(visit.scheduledOn, today)) : "No day yet"
  return <CancelVisitSheet service={visit.name} dayWords={dayWords} consequence={cancelConsequence(cancelFactsOf(job, visit.id))} textHref={textHref} onCancel={onCancel?.bind(null, visit.id)} />
}

/** Reschedule and Cancel visit side by side, or Text Ryan and Call Ryan in their place inside 24 hours; empty for a visit with nothing to do. */
export function VisitControls(props: VisitControlsProps) {
  const { visit, textHref } = props
  if (visit.cancel === "text" || (visit.reschedule === "text" && visit.cancel === "no")) return <TextRyan textHref={textHref} />
  if (visit.reschedule === "no" && visit.cancel === "no") return null
  return (
    <div data-slot="visit-controls" className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <RescheduleControl {...props} />
        <CancelControl {...props} />
      </div>
      {visit.reschedule === "text" && (
        <div className="space-y-2">
          <p className="text-base text-muted-foreground">To pick another day, text Ryan.</p>
          <TextRyan textHref={textHref} why={false} />
        </div>
      )}
    </div>
  )
}
