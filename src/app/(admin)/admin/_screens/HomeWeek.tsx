import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { CardTitleHeading } from "@/components/blocks/CardTitleHeading"
import { JobPill } from "@/components/blocks/JobPill"
import { TIME_ZONE } from "@/lib/admin/format"
import { dayOf } from "@/lib/admin/calendar"
import { visitJob } from "@/lib/admin/jobs"
import { KIND_LABEL, type OfficeKind } from "@/lib/admin/visit-defaults"
import type { Visit } from "@/lib/admin/types"
import { OpenVisit } from "./VisitPanelHost"
import { stopTime } from "./home-model"
import type { WeekView } from "./home-week"

// Today (Hannah's first job: "is the week sane"; a card that says "week" over one day was wrong): the next day that has visits, today when it has any, each
// person's stops in route order under their name, every row opening the visit panel. A person with nothing that day
// is left out and an empty calendar says so once. Server component over a `WeekView`.

function Stop({ visit, today }: { visit: Visit; today: string }) {
  return (
    <li>
      <OpenVisit id={visit.id} className="-mx-2 flex-wrap gap-x-3 gap-y-1 rounded-lg px-2 py-2 hover:bg-accent sm:flex-nowrap">
        <span className="w-16 shrink-0 text-sm tabular-nums text-muted-foreground">{stopTime(visit)}</span>
        <span className="min-w-0 flex-1 text-sm text-foreground">
          <span className="block truncate">
            {visit.clientName}
            <span className="text-muted-foreground"> · {visit.town}</span>
          </span>
          <span className="block truncate text-xs text-muted-foreground">{KIND_LABEL[visit.kind as OfficeKind] ?? "Visit"}</span>
        </span>
        <span className="w-full pl-[4.75rem] sm:w-auto sm:pl-0">
          <JobPill job={visitJob(visit, dayOf(today, TIME_ZONE), TIME_ZONE)} />
        </span>
      </OpenVisit>
    </li>
  )
}

export function HomeWeek({ week, today, className }: { week: WeekView; today: string; className?: string }) {
  return (
    <Card data-slot="home-week" className={className}>
      <CardHeader>
        <CardTitleHeading id="home-week">{week.title}</CardTitleHeading>
        {week.day && <CardDescription data-slot="home-week-day">{week.heading}</CardDescription>}
      </CardHeader>
      <CardContent>
        {week.day === null ? (
          <p className="text-sm text-muted-foreground">Nothing is on the calendar yet. Visits appear here as days are set.</p>
        ) : (
          week.people.map((person) => (
            <div key={person.personId} data-slot="home-person" className="mt-2 first:mt-0">
              <p className="text-sm font-medium text-navy">{person.name}</p>
              <ul className="divide-y divide-border">
                {person.stops.map((visit) => (
                  <Stop key={visit.id} visit={visit} today={today} />
                ))}
              </ul>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
