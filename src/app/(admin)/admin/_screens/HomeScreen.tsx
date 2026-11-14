import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { CardTitleHeading } from "@/components/blocks/CardTitleHeading"
import { JobPill } from "@/components/blocks/JobPill"
import { NeedsAttention, type NeedsAttentionProps } from "@/components/blocks/NeedsAttention"
import { PageHeader } from "@/components/blocks/PageHeader"
import { TIME_ZONE } from "@/lib/admin/format"
import { dayOf } from "@/lib/admin/calendar"
import { visitJob } from "@/lib/admin/jobs"
import { KIND_LABEL, type OfficeKind } from "@/lib/admin/visit-defaults"
import type { AdminData, Visit } from "@/lib/admin/types"
import { dayByTruck, dayHeading, greeting, pageContext, stopTime, tomorrowOf } from "./home-model"

// What Hannah opens to in the evening (docs/plans build-1 spec): a greeting line, Today and Tomorrow with each
// truck's stops in order, and Needs action, one row per thing a person can act on with its one button and Dismiss.
// Nothing else: the counts, the season line and the revenue moved to Reports. Pure composition over `data` and a
// fixed `today`; the route's page.tsx supplies both. Server component; the row buttons are client code.

export interface HomeScreenProps {
  data: AdminData
  /** ISO datetime the greeting, the date, "updated" and the day lists are read from */
  today: string
  /** a tech sees the day and changes nothing: no row actions */
  readOnly?: boolean
  /** a Needs action row's button; a server action in the app */
  onAttentionAction?: NeedsAttentionProps["onAction"]
  /** Dismiss on a Needs action row, and its Undo; a server action in the app */
  onDismiss?: NeedsAttentionProps["onDismiss"]
}

function Stop({ visit, today }: { visit: Visit; today: string }) {
  return (
    <li>
      <Link
        href={`/admin/visits?visit=${encodeURIComponent(visit.id)}`}
        className="-mx-2 flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <span className="w-16 shrink-0 text-sm tabular-nums text-muted-foreground">{stopTime(visit)}</span>
        <span className="min-w-0 flex-1 text-sm text-foreground">
          <span className="block truncate">
            {visit.clientName}
            <span className="text-muted-foreground"> · {visit.town}</span>
          </span>
          <span className="block truncate text-xs text-muted-foreground">{KIND_LABEL[visit.kind as OfficeKind] ?? "Visit"}</span>
        </span>
        <JobPill job={visitJob(visit, dayOf(today, TIME_ZONE), TIME_ZONE)} />
      </Link>
    </li>
  )
}

function Day({ id, heading, data, dayIso, today }: { id: string; heading: string; data: AdminData; dayIso: string; today: string }) {
  const trucks = dayByTruck(data.visits, dayIso, data.settings.trucks)
  return (
    <section aria-labelledby={id} data-slot="home-day">
      <h3 id={id} className="font-display text-sm uppercase tracking-wide text-muted-foreground">
        {heading}
      </h3>
      {trucks.length === 0 ? (
        <p className="py-2.5 text-sm text-muted-foreground">No visits scheduled.</p>
      ) : (
        trucks.map((truck) => (
          <div key={truck.truckId} data-slot="home-truck" className="mt-2">
            <p className="text-sm font-medium text-navy">{truck.name}</p>
            <ul className="divide-y divide-border">
              {truck.stops.map((visit) => (
                <Stop key={visit.id} visit={visit} today={today} />
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  )
}

export function HomeScreen({ data, today, readOnly = false, onAttentionAction, onDismiss }: HomeScreenProps) {
  return (
    <div data-slot="home-screen" className="space-y-6">
      <PageHeader title={greeting(today)} context={pageContext(data, today)} />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="sr-only">
            <CardTitleHeading>Today and tomorrow</CardTitleHeading>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <Day id="home-today" heading={dayHeading("Today", today)} data={data} dayIso={today} today={today} />
            <Day id="home-tomorrow" heading={dayHeading("Tomorrow", tomorrowOf(today))} data={data} dayIso={tomorrowOf(today)} today={today} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitleHeading>Needs action</CardTitleHeading>
          </CardHeader>
          <CardContent>
            <NeedsAttention items={data.attention} now={today} onAction={readOnly ? undefined : onAttentionAction} onDismiss={readOnly ? undefined : onDismiss} readOnly={readOnly} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
