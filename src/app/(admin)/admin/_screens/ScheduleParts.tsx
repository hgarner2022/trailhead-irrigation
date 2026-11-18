import type { ReactNode } from "react"
import { ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import { DataGrid } from "@/components/blocks/DataGrid"
import type { Visit } from "@/lib/admin/types"
import { KIND_WORDS, TIME_ZONE, shortDate, writtenDate } from "@/lib/admin/format"
import { addDays } from "@/lib/admin/calendar"
import { stopColumns } from "./visits-columns"
import type { VisitRow } from "./visits-model"

// The small pieces of the Schedule screen: the day stepper, the stops of one
// day in order, the "Moved" card and the line that points at the next week
// with jobs when this one is empty. Kept out of ScheduleScreen so each file
// stays short; they hold no state.

export function DayStepper({ day, today, onChange, children }: { day: string; today: string; onChange: (day: string) => void; children?: ReactNode }) {
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
      {children && <div className="ml-auto">{children}</div>}
    </div>
  )
}

/** The stops of one day in order: the same DataGrid and the same columns as Visits, so the two lists read alike. */
export function StopGrid({ rows, onOpen }: { rows: VisitRow[]; onOpen: (id: string) => void }) {
  return (
    <DataGrid
      columns={stopColumns}
      data={rows}
      getRowId={(r) => r.id}
      onOpen={(row) => onOpen(row.id)}
      pageSize={50}
      emptyTitle="No stops"
      emptyLine="Nothing is on the calendar for this day."
    />
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
        <SectionHeading level={2}>Moved</SectionHeading>
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
