"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CardTitleHeading } from "@/components/blocks/CardTitleHeading"
import { DayMap } from "@/components/blocks/DayMap"
import { EmptyState } from "@/components/blocks/EmptyState"
import { PageHeader } from "@/components/blocks/PageHeader"
import { StatusPill } from "@/components/blocks/StatusPill"
import { WeekGrid } from "@/components/blocks/WeekGrid"
import type { AdminData, Visit } from "@/lib/admin/types"
import { KIND_WORDS, TIME_ZONE, shortDate, writtenDate } from "@/lib/admin/format"
import { cn } from "@/lib/utils"
import { clockTime } from "./home-model"
import { addDays, dayOf, dayVisits, weekOf, weekVisits } from "@/lib/admin/calendar"
import { upcomingWindow } from "./home-model"
import { ScheduleMoveTo } from "./ScheduleMoveTo"
import { approveVisits, exceptionCount, moveOutcome, proposedCount, weekContext } from "./schedule-model"

// Where the scheduler's output lands and where Ryan lives in season: the
// week by truck, with the proposed visits hatched until he approves the
// batch, and a day map beside the day's stops in order. Selecting a stop in
// the grid, the list or the map highlights the same visit. Client because
// the week, the day, the tab, the selection and the moves are state; the
// moves and the approval only update local state and log in the prototype,
// and `Propose` waits for the next window to open. The route's page.tsx
// supplies `data` and `today`.

export interface ScheduleScreenProps {
  data: AdminData
  /** ISO datetime the week, today's column and the day view are read from */
  today: string
  /** the tab open on first render; for the catalog, since the prototype has no URL state */
  defaultTab?: "week" | "day"
}

function DayStepper({ day, today, onChange }: { day: string; today: string; onChange: (day: string) => void }) {
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

function StopList({ stops, trucks, selectedId, onSelect }: { stops: Visit[]; trucks: AdminData["settings"]["trucks"]; selectedId?: string; onSelect: (id: string | undefined) => void }) {
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
              <StatusPill status={stop.status} />
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function Exceptions({ visits }: { visits: Visit[] }) {
  const moved = visits.filter((v) => v.exception)
  if (moved.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <CardTitleHeading>Moved in Jobber</CardTitleHeading>
      </CardHeader>
      <CardContent>
        <ul data-slot="schedule-exceptions" className="divide-y divide-border text-sm">
          {moved.map((v) => (
            <li key={v.id} className="flex items-start gap-3 py-2.5">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <span>
                <span className="font-medium text-foreground">{`${v.clientName} · ${v.town} · ${KIND_WORDS[v.kind]}`}</span>
                <span className="text-muted-foreground">{`, now ${shortDate(v.startAt!, TIME_ZONE)}. ${v.exception!.note}.`}</span>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function ScheduleScreen({ data, today, defaultTab = "week" }: ScheduleScreenProps) {
  const todayDay = dayOf(today, TIME_ZONE)
  const { trucks, areas } = data.settings
  const [visits, setVisits] = useState(data.visits)
  const [weekStart, setWeekStart] = useState(() => weekOf(today, TIME_ZONE))
  const [day, setDay] = useState(todayDay)
  const [selectedId, setSelectedId] = useState<string>()
  const [announcement, setAnnouncement] = useState("")
  const week = weekVisits(visits, weekStart, TIME_ZONE)
  const selected = week.find((v) => v.id === selectedId && v.startAt)
  const proposeOpen = upcomingWindow(data.settings, today) !== null
  const stops = dayVisits(visits, day, undefined, TIME_ZONE)

  const approve = () => {
    const ids = new Set(week.filter((v) => v.proposed).map((v) => v.id))
    console.info("approve week", weekStart, [...ids])
    setVisits((v) => approveVisits(v, ids))
  }
  const move = (visitId: string, truckId: string, dayIso: string) => {
    console.info("move visit", visitId, truckId, dayIso)
    const outcome = moveOutcome(visits, visitId, truckId, dayIso, trucks, TIME_ZONE)
    if (outcome.moved) setVisits(outcome.visits)
    setAnnouncement(outcome.message)
  }
  const changeDay = (next: string) => {
    setDay(next)
    setWeekStart(weekOf(next, TIME_ZONE))
  }

  return (
    <TooltipProvider>
      <div data-slot="schedule-screen" className="space-y-6">
        <PageHeader
          title="Schedule"
          context={weekContext(weekStart, week)}
          actions={
            <>
              {proposeOpen ? (
                <Button variant="outline" onClick={() => console.info("propose schedule", weekStart)}>
                  Propose
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0} className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                      <Button variant="outline" disabled>
                        Propose
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Runs when the next window opens</TooltipContent>
                </Tooltip>
              )}
              {proposedCount(week) > 0 && <Button onClick={approve}>Approve week</Button>}
            </>
          }
        />
        {selected && <ScheduleMoveTo key={`${selected.id}-${selected.truckId}-${selected.startAt}`} visit={selected} trucks={trucks} weekStart={weekStart} timeZone={TIME_ZONE} onMove={move} />}
        <p role="status" className="min-h-5 text-sm text-muted-foreground">
          {announcement}
        </p>
        <Tabs defaultValue={defaultTab}>
          <TabsList aria-label="Schedule view">
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="day">Day</TabsTrigger>
          </TabsList>
          <TabsContent value="week" className="space-y-6">
            <WeekGrid
              trucks={trucks}
              areas={areas}
              visits={visits}
              weekStart={weekStart}
              today={todayDay}
              timeZone={TIME_ZONE}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMove={move}
              onWeekChange={setWeekStart}
            />
            {exceptionCount(week) > 0 && <Exceptions visits={week} />}
          </TabsContent>
          <TabsContent value="day" className="space-y-4">
            <DayStepper day={day} today={todayDay} onChange={changeDay} />
            <div className="grid gap-6 lg:grid-cols-5">
              <Card className="min-w-0 lg:col-span-2">
                <CardHeader>
                  <CardTitleHeading>Stops in order</CardTitleHeading>
                </CardHeader>
                <CardContent>
                  <StopList stops={stops} trucks={trucks} selectedId={selectedId} onSelect={setSelectedId} />
                </CardContent>
              </Card>
              <DayMap className="min-w-0 lg:col-span-3" stops={stops} trucks={trucks} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}
