"use client"

import { useState, useTransition } from "react"
import { ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CardTitleHeading } from "@/components/blocks/CardTitleHeading"
import { EmptyState } from "@/components/blocks/EmptyState"
import { PageHeader } from "@/components/blocks/PageHeader"
import { StatusPill } from "@/components/blocks/StatusPill"
import { ToScheduleTray } from "@/components/blocks/ToScheduleTray"
import { WeekGrid } from "@/components/blocks/WeekGrid"
import type { AdminData, Visit } from "@/lib/admin/types"
import { KIND_WORDS, TIME_ZONE, shortDate, writtenDate } from "@/lib/admin/format"
import { cn } from "@/lib/utils"
import { clockTime } from "./home-model"
import { addDays, dayOf, dayVisits, weekOf, weekVisits } from "@/lib/admin/calendar"
import type { Outcome } from "./action-types"
import { ScheduleDayMap } from "./ScheduleDayMap"
import { ScheduleMoveTo } from "./ScheduleMoveTo"
import { exceptionCount, firstWorkingDay, moveOutcome, placeVisit, scheduleItems, trayItems, weekContext, type TrayItem } from "./schedule-model"

// Where Ryan lives in season (the scheduling flow, 2026-11-12: one state,
// no second step): the week by truck, a day map beside the day's stops in
// order, and the "To schedule" tray beside the week with every visit that
// has no day yet. Schedule puts the whole tray on the week (the customers
// who must be there pick their own day and stay in the tray until they do);
// Place puts one; drag moves one. Placed is scheduled: in the wiring phase
// the visit goes to Jobber and the customer gets the date. Selecting a stop
// in the grid, the list or the map highlights the same visit. Client because
// the week, the day, the tab, the selection and the moves are state; every
// action only updates local state and logs in the prototype. The route's
// page.tsx supplies `data` and `today`.

export interface ScheduleScreenProps {
  data: AdminData
  /** ISO datetime the week, today's column and the day view are read from */
  today: string
  /** the tab open on first render; for the catalog, since the prototype has no URL state */
  defaultTab?: "week" | "day"
  /** a day (yyyy-mm-dd) to open on, from `?day=`; the week follows it */
  defaultDay?: string
  /** a Monday (yyyy-mm-dd) to open the week on, from `?week=` */
  defaultWeek?: string
  /** the visit selected on first render, from `?visit=` */
  defaultSelectedId?: string
  /** a tech reads the week and changes nothing: no Schedule, Place, Move or drag */
  readOnly?: boolean
  /** Schedule: runs the scheduler for one window; without it the button only moves blocks locally, as in the catalog */
  onSchedule?: (window: "turn-on" | "inspection" | "blowout") => Promise<Outcome<{ placed: number; unplaced: number }>>
  /** Place and drag: put a visit on a truck and a day; a refusal's words show and the block snaps back */
  onMove?: (visitId: string, truckId: string, dayIso: string) => Promise<Outcome>
}

const WINDOWS = ["turn-on", "inspection", "blowout"] as const

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

export function ScheduleScreen({ data, today, defaultTab = "week", defaultDay, defaultWeek, defaultSelectedId, readOnly = false, onSchedule, onMove }: ScheduleScreenProps) {
  const todayDay = dayOf(today, TIME_ZONE)
  const { trucks, areas } = data.settings
  const [visits, setVisits] = useState(data.visits)
  const [seen, setSeen] = useState(data.visits)
  const [pending, startTransition] = useTransition()
  // A refreshed `data` (after an action) replaces what the screen holds.
  if (data.visits !== seen) {
    setSeen(data.visits)
    setVisits(data.visits)
  }
  const [weekStart, setWeekStart] = useState(() => weekOf(defaultDay ?? defaultWeek ?? today, TIME_ZONE))
  const [day, setDay] = useState(defaultDay ?? todayDay)
  const [selectedId, setSelectedId] = useState<string | undefined>(defaultSelectedId)
  const [announcement, setAnnouncement] = useState("")
  const week = weekVisits(visits, weekStart, TIME_ZONE)
  const selected = week.find((v) => v.id === selectedId && v.startAt)
  const stops = dayVisits(visits, day, undefined, TIME_ZONE)
  const tray = trayItems({ visits, passes: data.passes })
  const placeable = tray.filter((i) => !i.awaitingPick).length

  const scheduleAll = () => {
    if (onSchedule) {
      // The scheduler works one window at a time; a tray can hold more than one, and open jobs are not its to place.
      const windows = [...new Set(tray.filter((i) => !i.awaitingPick && WINDOWS.includes(i.kind as never)).map((i) => i.kind as (typeof WINDOWS)[number]))]
      startTransition(async () => {
        let placed = 0
        let unplaced = 0
        for (const window of windows) {
          const out = await onSchedule(window)
          if (!out.ok) return setAnnouncement(out.message)
          placed += out.data.placed
          unplaced += out.data.unplaced
        }
        const left = unplaced ? ` ${unplaced} couldn't be placed. Home lists them.` : ""
        setAnnouncement(`${placed} ${placed === 1 ? "visit" : "visits"} scheduled. The customers get their dates.${left}`)
      })
      return
    }
    console.info("schedule", weekStart, tray.filter((i) => !i.awaitingPick).map((i) => i.id))
    const outcome = scheduleItems(visits, tray, trucks, weekStart, TIME_ZONE)
    setVisits(outcome.visits)
    const waiting = outcome.waiting ? ` ${outcome.waiting} ${outcome.waiting === 1 ? "customer picks their own day and stays" : "customers pick their own days and stay"} in the list.` : ""
    setAnnouncement(`${outcome.placed} ${outcome.placed === 1 ? "visit" : "visits"} scheduled on the week of ${writtenDate(weekStart)}. The customers get their dates.${waiting}`)
  }
  /** Sends the move to the API; the block shows where it is going at once and goes back with the API's words if it is refused. */
  const send = (visitId: string, truckId: string, dayIso: string, before: typeof visits, done: string) =>
    startTransition(async () => {
      const out = await onMove!(visitId, truckId, dayIso)
      if (out.ok) return setAnnouncement(done)
      setVisits(before)
      setAnnouncement(out.message)
    })
  const move = (visitId: string, truckId: string, dayIso: string) => {
    if (!onMove) console.info("move visit", visitId, truckId, dayIso)
    const outcome = moveOutcome(visits, visitId, truckId, dayIso, trucks, TIME_ZONE)
    if (outcome.moved) setVisits(outcome.visits)
    if (onMove) return send(visitId, truckId, dayIso, visits, outcome.moved ? outcome.message : "Moved.")
    setAnnouncement(outcome.message)
  }
  const place = (item: TrayItem) => {
    const truck = trucks[0]
    if (!truck) return
    const dayIso = firstWorkingDay(truck, weekStart)
    if (!onMove) console.info("place visit", item.id, truck.id, dayIso)
    const before = visits
    setVisits((v) => placeVisit(v, item, truck.id, dayIso, TIME_ZONE))
    setSelectedId(item.id)
    const done = `${item.clientName} is scheduled on ${truck.name} for ${writtenDate(dayIso)}, and we'll send the date. Drag it if another day is better.`
    if (onMove) return send(item.id, truck.id, dayIso, before, done)
    setAnnouncement(done)
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
            readOnly ? undefined : placeable > 0 ? (
              <Button onClick={scheduleAll} disabled={pending}>{`Schedule ${placeable} ${placeable === 1 ? "visit" : "visits"}`}</Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                    <Button disabled>Schedule</Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Nothing is waiting for a day</TooltipContent>
              </Tooltip>
            )
          }
        />
        {selected && !readOnly && <ScheduleMoveTo key={`${selected.id}-${selected.truckId}-${selected.startAt}`} visit={selected} trucks={trucks} weekStart={weekStart} timeZone={TIME_ZONE} onMove={move} />}
        <p role="status" className="text-sm text-muted-foreground empty:sr-only">
          {announcement}
        </p>
        <Tabs defaultValue={defaultTab}>
          <TabsList aria-label="Schedule view">
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="day">Day</TabsTrigger>
          </TabsList>
          <TabsContent value="week" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
              <WeekGrid
                className="min-w-0"
                trucks={trucks}
                areas={areas}
                visits={visits}
                weekStart={weekStart}
                today={todayDay}
                timeZone={TIME_ZONE}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onMove={readOnly ? undefined : move}
                onWeekChange={setWeekStart}
              />
              <Card className="min-w-0 self-start">
                <CardHeader>
                  <CardTitleHeading>{`To schedule${tray.length ? ` (${tray.length})` : ""}`}</CardTitleHeading>
                </CardHeader>
                <CardContent>
                  <ToScheduleTray items={tray} onPlace={place} readOnly={readOnly} />
                </CardContent>
              </Card>
            </div>
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
              <ScheduleDayMap className="min-w-0 lg:col-span-3" stops={stops} trucks={trucks} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}
