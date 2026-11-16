import { ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { CardTitleHeading } from "@/components/blocks/CardTitleHeading"
import { EmptyState } from "@/components/blocks/EmptyState"
import { JobPill } from "@/components/blocks/JobPill"
import type { AdminData, Visit } from "@/lib/admin/types"
import { KIND_WORDS, TIME_ZONE, shortDate, writtenDate } from "@/lib/admin/format"
import { visitJob } from "@/lib/admin/jobs"
import { addDays } from "@/lib/admin/calendar"
import { cn } from "@/lib/utils"
import { clockTime } from "./home-model"

// The small pieces of the Schedule screen: the day stepper, the stops of one
// day in order, the "Moved" card and the line that points at the next week
// with jobs when this one is empty. Kept out of ScheduleScreen so each file
// stays short; they hold no state.

export function DayStepper({ day, today, onChange }: { day: string; today: string; onChange: (day: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="icon" aria-label="Previous day" onClick={() => onChange(addDays(day, -1))}>
        <ChevronLeft className="size-4" aria-hidden />
      </Button>
      <Button variant="outline" onClick={() => onChange(today)}>
        Today
      </Button>
      <Button variant="outline" size="icon" aria-label="Next day" onClick={() => onChange(addDays(day, 1))}>
        <ChevronRight className="size-4" aria-hidden />
      </Button>
      <h2 className="ml-2 font-display text-2xl font-semibold leading-none text-navy">
        {writtenDate(day)}
        {day === today && <span className="text-muted-foreground"> · today</span>}
      </h2>
    </div>
  )
}

export function StopList({ stops, trucks, today, selectedId, onSelect }: { stops: Visit[]; trucks: AdminData["settings"]["trucks"]; today: string; selectedId?: string; onSelect: (id: string | undefined) => void }) {
  if (stops.length === 0) return <EmptyState title="No stops" line="Nothing is on the calendar for this day." />
  return (
    <ol data-slot="stop-list" className="divide-y divide-border">
      {stops.map((stop) => {
        const selected = stop.id === selectedId
        return (
          <li key={stop.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(selected ? undefined : stop.id)}
              className={cn("flex w-full items-center gap-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50", selected && "bg-row-selected")}
            >
              <span className="w-7 shrink-0 text-center font-display text-lg text-primary-deep">{stop.stopOrder ?? ""}</span>
              <span className="w-16 shrink-0 text-sm tabular-nums text-muted-foreground">{stop.startAt ? clockTime(stop.startAt) : ""}</span>
              <span className="min-w-0 flex-1 text-sm">
                <span className="block truncate font-medium text-foreground">{stop.clientName}</span>
                <span className="block text-muted-foreground">
                  {`${stop.town} · ${KIND_WORDS[stop.kind]} · ${trucks.find((t) => t.id === stop.truckId)?.name ?? "No truck"}`}
                </span>
              </span>
              <JobPill job={visitJob(stop, today, TIME_ZONE)} />
            </button>
          </li>
        )
      })}
    </ol>
  )
}

/** A note as the page words it: the calendar feed's source is not named. */
const plain = (note: string) => note.replace(/\s+in Jobber\b/gi, "")

export function Exceptions({ visits }: { visits: Visit[] }) {
  const moved = visits.filter((v) => v.exception)
  if (moved.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <CardTitleHeading>Moved</CardTitleHeading>
      </CardHeader>
      <CardContent>
        <ul data-slot="schedule-exceptions" className="divide-y divide-border text-sm">
          {moved.map((v) => (
            <li key={v.id} className="flex items-start gap-3 py-2.5">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <span>
                <span className="font-medium text-foreground">{`${v.clientName} · ${v.town} · ${KIND_WORDS[v.kind]}`}</span>
                <span className="text-muted-foreground">{`, now ${shortDate(v.startAt!, TIME_ZONE)}. ${plain(v.exception!.note)}.`}</span>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

/** "Next jobs: week of Apr 26", a link to that week; shown when the week on screen has no jobs and a later one does. */
export function NextJobsLine({ weekStart, onGo }: { weekStart: string | undefined; onGo: (weekStart: string) => void }) {
  if (!weekStart) return null
  return (
    <p data-slot="next-jobs" className="text-sm text-muted-foreground">
      {"Next jobs: "}
      <Button variant="link" className="h-auto p-0 text-sm text-primary-dark hover:text-primary-deep" onClick={() => onGo(weekStart)}>
        {`week of ${shortDate(weekStart)}`}
      </Button>
    </p>
  )
}
