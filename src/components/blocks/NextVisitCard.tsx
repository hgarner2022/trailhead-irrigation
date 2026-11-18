import type { ReactNode } from "react"
import Link from "next/link"
import { CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// The first thing on an account's Home: what is coming (docs/plans/2026-11-18-customer-portal-v2-design.md, section 3). The day as the heading, then one sentence that is
// either "We'll text your window the day before." or the window and who is coming once it was told, then the service and the street, and "Someone must be home" when the
// property says so. The two actions (Reschedule and Cancel visit, or Text Ryan and Call Ryan inside 24 hours) are slots the screen fills. With no visit the card says
// "Nothing booked right now." and offers Book Online. Pure props, server-safe; top-aligned so it is never stretched to its neighbour's height.

export interface NextVisitProps {
  /** "Wednesday, April 28", "Pick a day" or "Day coming soon" */
  heading: string
  /** the sentence under it: the window promise, or the window with who is coming */
  detail: string
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

function Label() {
  return <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Next visit</p>
}

export function NextVisitCard({ visit, className }: { visit: NextVisitProps | null; className?: string }) {
  if (!visit) {
    return (
      <Card data-slot="next-visit" data-state="none" className={cn("self-start", className)}>
        <CardContent className="space-y-3 p-5">
          <Label />
          <h2 className="font-display text-3xl leading-tight text-navy">Nothing booked right now.</h2>
          <Button asChild variant="outline">
            <a href="/book">Book Online</a>
          </Button>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card data-slot="next-visit" data-state="booked" className={cn("self-start", className)}>
      <CardContent className="space-y-3 p-5">
        <Label />
        <h2 className="font-display text-3xl leading-tight text-navy">
          <Link href={visit.href} className="hover:underline">
            {visit.heading}
          </Link>
        </h2>
        <p className="text-base text-foreground">{visit.detail}</p>
        <p className="text-base text-muted-foreground">{[visit.service, visit.where].filter(Boolean).join(" · ")}</p>
        {visit.label && <p className="text-sm font-semibold text-navy-light">{visit.label}</p>}
        {visit.mustBeHome && (
          <p className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
            <CalendarDays className="size-4" aria-hidden />
            Someone must be home
          </p>
        )}
        {visit.actions && <div className="pt-1">{visit.actions}</div>}
      </CardContent>
    </Card>
  )
}
