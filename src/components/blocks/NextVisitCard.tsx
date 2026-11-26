import type { ReactNode } from "react"
import Link from "next/link"
import { CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Stack } from "@/components/ui/grid"
import { EmptyState } from "./EmptyState"
import { cn } from "@/lib/utils"

// The first thing on an account's Home: what is coming (docs/plans/2026-11-19-customer-side-polish-research.md, section 1a). The day with its exact time is the one headline
// ("Wednesday, April 28 at 10:30 am"), read once; under it who is coming, then the service and the street, and "Someone must be home" when the property says so. The two
// actions (Reschedule as the one filled button and Cancel visit as a quiet link, or Text Ryan and Call Ryan inside 24 hours) are a slot the screen fills. With no visit the card
// is the shared EmptyState: the trail drawing, "Nothing booked right now." and Book Online. Spacing is the 8-point scale: 8 inside a group, 16 between groups. Pure props, server-safe.

export interface NextVisitProps {
  /** "Wednesday, April 28 at 10:30 am"; "Wednesday, April 28" while the time is not set; "Pick a day" or "Day coming soon" */
  heading: string
  /** the line under it: who is coming, or what happens next ("We'll text you the time the day before."); omitted when there is nothing to add */
  detail?: string | null
  /** "Spring turn-on" */
  service: string
  /** "412 Briggs Street, Erie" */
  where: string
  /** "Season Pass 2027" */
  label?: string | null
  mustBeHome?: boolean
  /** the visit page */
  href: string
  /** Reschedule and Cancel visit, or Text Ryan and Call Ryan */
  actions?: ReactNode
  className?: string
}

const FRAME = "p-4 sm:p-6"

function Label() {
  return <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Next visit</p>
}

export function NextVisitCard({ visit, className }: { visit: NextVisitProps | null; className?: string }) {
  if (!visit) {
    return (
      <Card data-slot="next-visit" data-state="none" className={className}>
        <CardContent className={FRAME}>
          <EmptyState
            scene="trail"
            titleAs="h2"
            title="Nothing booked right now."
            className="py-4"
            action={
              <Button asChild>
                <a href="/book">Book Online</a>
              </Button>
            }
          />
        </CardContent>
      </Card>
    )
  }
  return (
    <Card data-slot="next-visit" data-state="booked" className={className}>
      <CardContent className={cn(FRAME)}>
        <Stack gap="md">
          <Stack gap="sm">
            <Label />
            <h2 className="type-title text-navy">
              <Link href={visit.href} className="hover:underline">
                {visit.heading}
              </Link>
            </h2>
          </Stack>
          <Stack gap="sm">
            {visit.detail && <p className="text-base text-foreground">{visit.detail}</p>}
            <p className="text-base text-muted-foreground">{[visit.service, visit.where].filter(Boolean).join(" · ")}</p>
            {visit.label && <p className="text-sm font-semibold text-navy-light">{visit.label}</p>}
            {visit.mustBeHome && (
              <p className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
                <CalendarDays className="size-4" aria-hidden />
                Someone must be home
              </p>
            )}
          </Stack>
          {visit.actions && <div>{visit.actions}</div>}
        </Stack>
      </CardContent>
    </Card>
  )
}
