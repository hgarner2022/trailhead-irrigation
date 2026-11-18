import type { ReactNode } from "react"
import { CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/nav"
import { arrivalWindow, visitDayWords } from "@/lib/portal/words"
import { cn } from "@/lib/utils"

// The first thing on an account's Home: what is coming and who is coming (docs/plans/2026-11-18-customer-portal-design.md, Home, item 2).
// A booked visit shows its day, "Arrive between 9 and 11 am", the person's first name and what the visit is, and "Must be home" when the property
// says so. The change control is a slot: the screen hands in Change my day (or Pick a day) when the customer may move the day online, and
// `change="call"` says to call Ryan instead once the day is within two days. A visit with no day says Pick a day, or Day coming soon when
// there is nothing to pick; with no visit at all the card says "Nothing booked" and offers Book Online. Pure props, server-safe.

export interface NextVisit {
  /** "Spring turn-on" */
  name: string
  scheduledOn: string | null
  startTime?: string | null
  durationMinutes?: number | null
  /** "Ryan", never a surname */
  personFirstName?: string | null
  mustBeHome?: boolean
  /** why the last try did not happen, when the visit needs a new day */
  notDoneReason?: string | null
}

export interface NextVisitCardProps {
  visit: NextVisit | null
  /** today's day, so a day in another year shows its year */
  today: string
  /** "call": the day is within two days, so Change my day becomes the phone number; "yes" and "no" leave the slot as given */
  change?: "yes" | "call" | "no"
  /** what the customer may do about the day: the Change my day or Pick a day buttons */
  action?: ReactNode
  /** there are days on offer for a visit with no day yet; false reads Day coming soon */
  canPick?: boolean
  className?: string
}

function Label() {
  return <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Next visit</p>
}

export function NextVisitCard({ visit, today, change = "no", action, canPick = false, className }: NextVisitCardProps) {
  if (!visit) {
    return (
      <Card data-slot="next-visit" data-state="none" className={className}>
        <CardContent className="space-y-3 p-5">
          <Label />
          <h2 className="font-display text-3xl leading-tight text-navy">Nothing booked</h2>
          <Button asChild variant="outline">
            <a href="/book">Book Online</a>
          </Button>
        </CardContent>
      </Card>
    )
  }
  const booked = Boolean(visit.scheduledOn)
  const window = booked ? arrivalWindow(visit.startTime, visit.durationMinutes) : null
  const who = [visit.personFirstName, visit.name].filter(Boolean).join(" · ")
  return (
    <Card data-slot="next-visit" data-state={booked ? "booked" : canPick ? "pick" : "soon"} className={cn(className)}>
      <CardContent className="space-y-3 p-5">
        <Label />
        <h2 className="font-display text-3xl leading-tight text-navy">{booked ? visitDayWords({ status: "scheduled", scheduledOn: visit.scheduledOn }, today) : visit.notDoneReason ? "Needs a new day" : canPick ? "Pick a day" : "Day coming soon"}</h2>
        {!booked && visit.notDoneReason && <p className="text-base text-muted-foreground">{`We couldn't finish this one: ${visit.notDoneReason}.`}</p>}
        {booked && <p className="text-base text-foreground">{window ?? "We'll text you your arrival window the day before."}</p>}
        <p className="text-base text-muted-foreground">{who}</p>
        {visit.mustBeHome && (
          <p className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
            <CalendarDays className="size-4" aria-hidden />
            Must be home
          </p>
        )}
        {!booked && !canPick && !visit.notDoneReason && <p className="text-base text-muted-foreground">{"We'll text you as soon as your day is set."}</p>}
        {change === "call" ? (
          <p data-slot="call-ryan" className="text-base text-foreground">
            {"To change this day, call or text Ryan at "}
            <a href={PHONE_TEL} className="font-semibold text-primary-deep underline underline-offset-2">
              {PHONE_DISPLAY}
            </a>
            .
          </p>
        ) : (
          action
        )}
      </CardContent>
    </Card>
  )
}
