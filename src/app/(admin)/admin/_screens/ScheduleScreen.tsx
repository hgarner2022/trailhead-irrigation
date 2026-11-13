"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CardTitleHeading } from "@/components/blocks/CardTitleHeading"
import { PageHeader } from "@/components/blocks/PageHeader"
import { ToScheduleTray } from "@/components/blocks/ToScheduleTray"
import { WeekGrid } from "@/components/blocks/WeekGrid"
import type { AdminData } from "@/lib/admin/types"
import { TIME_ZONE, writtenDate } from "@/lib/admin/format"
import { dayOf, dayVisits, weekOf, weekVisits } from "@/lib/admin/calendar"
import type { Outcome } from "./action-types"
import { ScheduleDayMap } from "./ScheduleDayMap"
import { ScheduleMoveTo } from "./ScheduleMoveTo"
import { DayStepper, Exceptions, NextJobsLine, StopList } from "./ScheduleParts"
import { exceptionCount, firstJobWeek, firstWorkingDay, moveOutcome, nextJobsWeek, placeVisit, scheduleItems, trayItems, weekContext, type TrayItem } from "./schedule-model"

// Where Ryan lives in season (the scheduling flow, 2026-11-12: one state,
// no second step): the week by truck, a day map beside the day's stops in
// order, and the "Needs a day" list beside the week with every job of an
// active pass that has no day. It opens on the first week that has a job; a
// week with none points at the next week that does. Schedule puts the whole
// list on the week (the customers who must be there pick their own day and
// stay in it until they do); Place puts one; drag moves one. Placed is
// scheduled, and the customer gets the date. A refused Place or move says
// why, in the API's words, under the row or in the status line and nowhere
// else. Selecting a stop in the grid, the list or the map highlights the same
// visit. Client because the week, the day, the tab, the selection and the
// moves are state; the route's page.tsx supplies `data` and `today`.

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
  const [weekStart, setWeekStart] = useState(() => (defaultDay || defaultWeek ? weekOf(defaultDay ?? defaultWeek!, TIME_ZONE) : firstJobWeek(data.visits, today, TIME_ZONE)))
  const [day, setDay] = useState(defaultDay ?? todayDay)
  const [selectedId, setSelectedId] = useState<string | undefined>(defaultSelectedId)
  const [announcement, setAnnouncement] = useState("")
  /** why a Place was refused, by the job's id, shown under its row */
  const [problems, setProblems] = useState<Record<string, string>>({})
  const week = weekVisits(visits, weekStart, TIME_ZONE)
  const selected = week.find((v) => v.id === selectedId && v.startAt)
  const stops = dayVisits(visits, day, undefined, TIME_ZONE)
  const tray = trayItems({ visits, passes: data.passes })

  const scheduleAll = () => {
    if (onSchedule) {
      // The scheduler works one window at a time; a list can hold more than one.
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
  const send = (visitId: string, truckId: string, dayIso: string, before: typeof visits, done: string, refused: (message: string) => void = setAnnouncement) =>
    startTransition(async () => {
      const out = await onMove!(visitId, truckId, dayIso)
      if (out.ok) return setAnnouncement(done)
      setVisits(before)
      refused(out.message)
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
    setProblems((p) => Object.fromEntries(Object.entries(p).filter(([id]) => id !== item.id)))
    setVisits((v) => placeVisit(v, item, truck.id, dayIso, TIME_ZONE))
    setSelectedId(item.id)
    const done = `${item.clientName} is scheduled on ${truck.name} for ${writtenDate(dayIso)}, and we'll send the date. Drag it if another day is better.`
    if (onMove) return send(item.id, truck.id, dayIso, before, done, (message) => setProblems((p) => ({ ...p, [item.id]: message })))
    setAnnouncement(done)
  }
  const goToWeek = (next: string) => {
    setWeekStart(next)
    setDay(next)
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
            readOnly ? undefined : tray.length > 0 ? (
              <Button onClick={scheduleAll} disabled={pending}>{`Schedule ${tray.length} ${tray.length === 1 ? "visit" : "visits"}`}</Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                    <Button disabled>Schedule</Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Nothing needs a day</TooltipContent>
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
            {week.length === 0 && <NextJobsLine weekStart={nextJobsWeek(visits, weekStart, TIME_ZONE)} onGo={goToWeek} />}
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
                  <CardTitleHeading>{`Needs a day${tray.length ? ` (${tray.length})` : ""}`}</CardTitleHeading>
                </CardHeader>
                <CardContent>
                  <ToScheduleTray items={tray} onPlace={place} readOnly={readOnly} problems={problems} />
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
                  <StopList stops={stops} trucks={trucks} today={todayDay} selectedId={selectedId} onSelect={setSelectedId} />
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
