import type { ReactNode } from "react"
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/nav"
import { arrivalWindow, longDay, visitPill } from "@/lib/portal/words"
import { StatusPill } from "./StatusPill"

// One visit as a customer reads it, in a list on the Visits screen and on a job: the day (or what the day is waiting on), what the visit is and
// who has it, and one pill in the customer's words (Booked, Done, Pick a day, Day coming soon, Needs a new day, Canceled, Skipped). The row can
// carry the control that changes the day as a slot, or the phone number once the day is within two days. Pure props, server-safe.

export interface VisitRowFacts {
  name: string
  status: string
  scheduledOn: string | null
  startTime?: string | null
  durationMinutes?: number | null
  personFirstName?: string | null
  notDoneReason?: string | null
}

export interface VisitRowProps {
  visit: VisitRowFacts
  /** days are on offer for a visit with no day */
  canPick?: boolean
  /** "call": the day is within two days, show the phone number; otherwise `action` is shown when there is one */
  change?: "yes" | "call" | "no"
  /** Change my day or Pick a day */
  action?: ReactNode
}

export function VisitRow({ visit, canPick = false, change = "no", action }: VisitRowProps) {
  const pill = visitPill({ status: visit.status, notDoneReason: visit.notDoneReason, canPick })
  const gone = visit.status === "cancelled" || visit.status === "skipped"
  const day = visit.scheduledOn ? longDay(visit.scheduledOn) : "No day yet"
  const window = visit.status === "scheduled" ? arrivalWindow(visit.startTime, visit.durationMinutes) : null
  return (
    <li data-slot="visit-row" data-status={pill.status} className="space-y-3 py-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className={gone ? "text-base font-semibold text-muted-foreground line-through" : "text-base font-semibold text-foreground"}>{day}</p>
          <p className="text-base text-muted-foreground">{[visit.name, visit.personFirstName].filter(Boolean).join(" · ")}</p>
          {window && <p className="text-sm text-muted-foreground">{window}</p>}
          {visit.notDoneReason && visit.status === "unscheduled" && <p className="text-sm text-muted-foreground">{`We couldn't finish this one: ${visit.notDoneReason}.`}</p>}
        </div>
        <StatusPill status={pill.status} label={pill.label} />
      </div>
      {change === "call" ? (
        <p className="text-sm text-muted-foreground">
          {"To change this day, call or text Ryan at "}
          <a href={PHONE_TEL} className="font-semibold text-primary-deep underline underline-offset-2">
            {PHONE_DISPLAY}
          </a>
          .
        </p>
      ) : (
        action
      )}
    </li>
  )
}
