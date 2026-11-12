import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { NeedsAttention } from "@/components/blocks/NeedsAttention"
import { PageHeader } from "@/components/blocks/PageHeader"
import { SeasonLine } from "@/components/blocks/SeasonLine"
import { StatTile } from "@/components/blocks/StatTile"
import { StatusPill } from "@/components/blocks/StatusPill"
import type { AdminData, Visit } from "@/lib/admin/types"
import { committedByMonth, visitsOn } from "@/lib/admin/metrics"
import { SEASON, TIME_ZONE, clockTime, dayHeading, greeting, pageContext, seasonDescription, tileModels, tomorrowOf } from "./home-model"

// What Hannah opens to in the morning: a greeting, the four numbers that
// matter today, the season line, the next two days of visits and the short
// list of what needs a person. Pure composition over `data` and a fixed
// `today`; the route's page.tsx supplies both. Server component.

export interface HomeScreenProps {
  data: AdminData
  /** ISO datetime the greeting, the date, "updated" and the day lists are read from */
  today: string
}

function Title({ children }: { children: string }) {
  return <h2 className="font-display text-2xl font-semibold leading-none text-navy">{children}</h2>
}

function VisitRow({ visit }: { visit: Visit }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="w-16 shrink-0 text-sm tabular-nums text-muted-foreground">{visit.startAt ? clockTime(visit.startAt) : ""}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {visit.clientName}
        <span className="text-muted-foreground"> · {visit.town}</span>
      </span>
      {visit.isPass && <Badge variant="outline">Pass</Badge>}
      <StatusPill status={visit.status} />
    </li>
  )
}

function Day({ id, heading, visits }: { id: string; heading: string; visits: Visit[] }) {
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="font-display text-sm uppercase tracking-wide text-muted-foreground">
        {heading}
      </h3>
      {visits.length === 0 ? (
        <p className="py-2.5 text-sm text-muted-foreground">No visits scheduled.</p>
      ) : (
        <ul className="divide-y divide-border">
          {visits.map((visit) => (
            <VisitRow key={visit.id} visit={visit} />
          ))}
        </ul>
      )}
    </section>
  )
}

export function HomeScreen({ data, today }: HomeScreenProps) {
  const tomorrow = tomorrowOf(today)
  const bars = committedByMonth(data.passes, SEASON)
  return (
    <div data-slot="home-screen" className="space-y-6">
      <PageHeader title={greeting(today)} context={pageContext(data, today)} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tileModels(data, today).map((tile) => (
          <StatTile key={tile.label} {...tile} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <Title>{`Season ${SEASON}`}</Title>
          <CardDescription>{seasonDescription(data)}</CardDescription>
        </CardHeader>
        <CardContent>
          <SeasonLine
            mode="business"
            season={SEASON}
            bars={bars}
            today={today}
            caption={bars.length === 0 ? "No passes sold yet. The line fills in as customers reserve their season." : undefined}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <Title>Today and tomorrow</Title>
          </CardHeader>
          <CardContent className="space-y-5">
            <Day id="home-today" heading={dayHeading("Today", today)} visits={visitsOn(data.visits, today, TIME_ZONE)} />
            <Day id="home-tomorrow" heading={dayHeading("Tomorrow", tomorrow)} visits={visitsOn(data.visits, tomorrow, TIME_ZONE)} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <Title>Needs attention</Title>
          </CardHeader>
          <CardContent>
            <NeedsAttention items={data.attention} now={today} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
