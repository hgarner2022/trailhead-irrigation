"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import { SegmentedControl } from "@/components/blocks/SegmentedControl"
import { PageHeader } from "@/components/blocks/PageHeader"
import { ToScheduleTray } from "@/components/blocks/ToScheduleTray"
import { WeekGrid } from "@/components/blocks/WeekGrid"
import type { AdminData } from "@/lib/admin/types"
import { TIME_ZONE, writtenDate } from "@/lib/admin/format"
import { dayOf, dayVisits, weekOf, weekVisits } from "@/lib/admin/calendar"
import type { Outcome } from "./action-types"
import type { VisitActions } from "./visit-actions-types"
import type { CustomersActions } from "./CustomersScreen"
import type { JobActions } from "./job-actions-types"
import { NewJob, NewJobButton } from "./NewJob"
import { RecordHost, useOpenVisit } from "./RecordHost"
import { VisitsList } from "./VisitsList"
import { ScheduleDayMap } from "./ScheduleDayMap"
import { ScheduleMoveTo } from "./ScheduleMoveTo"
import { DayStepper, Exceptions, NextJobsLine, StopGrid } from "./ScheduleParts"
import { rowsOf } from "./visits-model"
import { exceptionCount, firstJobWeek, firstWorkingDay, moveOutcome, nextJobsWeek, placeVisit, scheduleItems, trayItems, weekContext, type TrayItem } from "./schedule-model"
import { routePeople } from "@/lib/admin/people"
import { initialRecord, setQueryInUrl } from "@/lib/admin/record-url"

// Where Ryan lives in season (the scheduling flow, 2026-11-12: one state,
// no second step): the week by person, a day map beside the day's stops in
// order, and the "Unscheduled" list under the week, full width, with every job of an
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
  /** the view open on first render: `?view=` (and `?day=`) on the page, or the catalog */
  defaultTab?: ScheduleView
  /** a day (yyyy-mm-dd) to open on, from `?day=`; the week follows it */
  defaultDay?: string
  /** a Monday (yyyy-mm-dd) to open the week on, from `?week=` */
  defaultWeek?: string
  /** the visit selected on first render, from `?visit=` */
  defaultSelectedId?: string
  /** the record whose panel is open on first render: `?visit=`, `?job=` or `?customer=` in the address, or the catalog */
  defaultVisitId?: string
  defaultJobId?: string
  defaultCustomerId?: string
  /** the List view's filters: only this job's visits (`?forJob=`) and the chips Home's money line links with */
  forJob?: string
  defaultFilters?: { column: string; values: string[] }[]
  /** a tech who may Mark done and take the money */
  canCollect?: boolean
  /** a tech reads the week and changes nothing: no Schedule, Place, Move or drag */
  readOnly?: boolean
  /** Schedule: runs the scheduler for one window; without it the button only moves blocks locally, as in the catalog */
  onSchedule?: (window: "turn-on" | "inspection" | "blowout") => Promise<Outcome<{ placed: number; unplaced: number }>>
  /** Place and drag: give a visit to a person on a day; a refusal's words show and the block snaps back */
  onMove?: (visitId: string, personId: string, dayIso: string) => Promise<Outcome>
  /** the visit panel a stop opens, and New job; server actions in the app */
  visitActions?: VisitActions
  /** the job panel and the customer panel, for a record opened from a visit */
  jobActions?: JobActions
  customerActions?: CustomersActions
}

export type ScheduleView = "week" | "day" | "list"
const VIEWS = [
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
  { value: "list", label: "List" },
] as const

const WINDOWS = ["turn-on", "inspection", "blowout"] as const

/** The Schedule with the visit panel: a stop in the week, the day list or the map opens the visit. */
export function ScheduleScreen(props: ScheduleScreenProps) {
  return (
    <RecordHost
      data={props.data}
      today={props.today}
      readOnly={props.readOnly}
      canCollect={props.canCollect}
      visitActions={props.visitActions}
      jobActions={props.jobActions}
      customerActions={props.customerActions}
      initial={initialRecord({ visitId: props.defaultVisitId, jobId: props.defaultJobId, customerId: props.defaultCustomerId })}
    >
      <ScheduleBody {...props} />
    </RecordHost>
  )
}

function ScheduleBody({ data, today, defaultTab = "week", defaultDay, defaultWeek, defaultSelectedId, forJob, defaultFilters, readOnly = false, onSchedule, onMove, visitActions }: ScheduleScreenProps) {
  // With the visit panel wired (the app), a stop opens it and its Move replaces the strip above the week; without it (the catalog) the strip stays.
  const panel = Boolean(visitActions)
  const openVisit = useOpenVisit()
  const todayDay = dayOf(today, TIME_ZONE)
  const { areas } = data.settings
  const people = routePeople(data.settings.people)
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
  const [view, setView] = useState<ScheduleView>(defaultTab)
  // New job from a day: the sheet opens with that day filled in (the day view's header, a week column's "+").
  const [jobDay, setJobDay] = useState<string | null>(null)
  // The address names the view, the day and the week, so a reload or a shared link opens what is on screen (the open record is kept by RecordHost).
  useEffect(() => {
    setQueryInUrl({ view: view === "week" ? undefined : view, day: view === "day" ? day : undefined, week: view === "week" ? weekStart : undefined, ...(view === "list" ? {} : { forJob: undefined }) })
  }, [view, day, weekStart])
  const [selectedId, setSelectedId] = useState<string | undefined>(defaultSelectedId)
  /** Selecting a stop highlights it everywhere and opens its visit. */
  const select = (id: string | undefined) => {
    setSelectedId(id)
    if (id && panel) openVisit?.(id)
  }
  const [announcement, setAnnouncement] = useState("")
  /** why a Place was refused, by the job's id, shown under its row */
  const [problems, setProblems] = useState<Record<string, string>>({})
  const week = weekVisits(visits, weekStart, TIME_ZONE)
  const selected = week.find((v) => v.id === selectedId && v.startAt)
  const stops = useMemo(() => dayVisits(visits, day, undefined, TIME_ZONE), [visits, day])
  const stopRows = useMemo(() => rowsOf(data, stops, today), [data, stops, today])
  const tray = trayItems({ visits, passes: data.passes })
  // The Schedule button runs the scheduler, which places a pass's visits by window; a one-off job's visit is placed from its row.
  const passTray = tray.filter((i) => i.passId)

  const scheduleAll = () => {
    if (onSchedule) {
      // The scheduler works one window at a time; a list can hold more than one.
      const windows = [...new Set(passTray.filter((i) => !i.awaitingPick && WINDOWS.includes(i.kind as never)).map((i) => i.kind as (typeof WINDOWS)[number]))]
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
    console.info("schedule", weekStart, passTray.filter((i) => !i.awaitingPick).map((i) => i.id))
    const outcome = scheduleItems(visits, passTray, people, weekStart, TIME_ZONE)
    setVisits(outcome.visits)
    const waiting = outcome.waiting ? ` ${outcome.waiting} ${outcome.waiting === 1 ? "customer picks their own day and stays" : "customers pick their own days and stay"} in the list.` : ""
    setAnnouncement(`${outcome.placed} ${outcome.placed === 1 ? "visit" : "visits"} scheduled on the week of ${writtenDate(weekStart)}. The customers get their dates.${waiting}`)
  }
  /** Sends the move to the API; the block shows where it is going at once and goes back with the API's words if it is refused. */
  const send = (visitId: string, personId: string, dayIso: string, before: typeof visits, done: string, refused: (message: string) => void = setAnnouncement) =>
    startTransition(async () => {
      const out = await onMove!(visitId, personId, dayIso)
      if (out.ok) return setAnnouncement(done)
      setVisits(before)
      refused(out.message)
    })
  const move = (visitId: string, personId: string, dayIso: string) => {
    if (!onMove) console.info("move visit", visitId, personId, dayIso)
    const outcome = moveOutcome(visits, visitId, personId, dayIso, people, TIME_ZONE)
    if (outcome.moved) setVisits(outcome.visits)
    if (onMove) return send(visitId, personId, dayIso, visits, outcome.moved ? outcome.message : "Moved.")
    setAnnouncement(outcome.message)
  }
  const place = (item: TrayItem) => {
    const person = people[0]
    if (!person) return
    const dayIso = firstWorkingDay(person, weekStart, todayDay)
    if (!onMove) console.info("place visit", item.id, person.id, dayIso)
    const before = visits
    setProblems((p) => Object.fromEntries(Object.entries(p).filter(([id]) => id !== item.id)))
    setVisits((v) => placeVisit(v, item, person, dayIso, TIME_ZONE))
    setSelectedId(item.id)
    const done = `${item.clientName} is scheduled with ${person.name} for ${writtenDate(dayIso)}, and we'll send the date. Drag it if another day is better.`
    if (onMove) return send(item.id, person.id, dayIso, before, done, (message) => setProblems((p) => ({ ...p, [item.id]: message })))
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
          context={view === "list" ? undefined : weekContext(weekStart, week)}
          actions={
            readOnly ? undefined : (
              <>
                {passTray.length > 0 ? (
                  <Button variant="outline" className="min-h-11" onClick={scheduleAll} disabled={pending}>{`Schedule ${passTray.length} ${passTray.length === 1 ? "visit" : "visits"}`}</Button>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0} className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                        <Button variant="outline" className="min-h-11" disabled>Schedule</Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{tray.length ? "Give each job its day from the list" : "Nothing is waiting for a day"}</TooltipContent>
                  </Tooltip>
                )}
                <NewJobButton data={data} today={today} actions={visitActions} />
              </>
            )
          }
        />
        {selected && !readOnly && !panel && <ScheduleMoveTo key={`${selected.id}-${selected.personId}-${selected.startAt}`} visit={selected} people={people} weekStart={weekStart} timeZone={TIME_ZONE} onMove={move} />}
        <p role="status" className="text-sm text-muted-foreground empty:sr-only">
          {announcement}
        </p>
        <SegmentedControl label="Schedule view" options={VIEWS} value={view} onChange={(v) => setView(v as ScheduleView)} />
        {view === "week" && (
          <div data-slot="schedule-week" className="space-y-6">
            {week.length === 0 && <NextJobsLine weekStart={nextJobsWeek(visits, weekStart, TIME_ZONE)} onGo={goToWeek} />}
            <div className="space-y-6">
              <WeekGrid
                className="min-w-0"
                people={people}
                areas={areas}
                visits={visits}
                weekStart={weekStart}
                today={todayDay}
                timeZone={TIME_ZONE}
                selectedId={selectedId}
                onSelect={select}
                onMove={readOnly ? undefined : move}
                onWeekChange={setWeekStart}
                onNewJob={readOnly ? undefined : setJobDay}
              />
              <Card className="min-w-0">
                <CardHeader>
                  <SectionHeading level={2}>{`Unscheduled${tray.length ? ` (${tray.length})` : ""}`}</SectionHeading>
                </CardHeader>
                <CardContent>
                  <ToScheduleTray items={tray} onPlace={place} readOnly={readOnly} problems={problems} />
                </CardContent>
              </Card>
            </div>
            {exceptionCount(week) > 0 && <Exceptions visits={week} />}
          </div>
        )}
        {view === "day" && (
          <div data-slot="schedule-day" className="space-y-4">
            <DayStepper day={day} today={todayDay} onChange={changeDay}>
              {!readOnly && (
                <Button type="button" variant="outline" className="min-h-11" onClick={() => setJobDay(day)}>
                  New job
                </Button>
              )}
            </DayStepper>
            <div className="space-y-6">
              <Card className="min-w-0">
                <CardHeader>
                  <SectionHeading level={2}>Stops in order</SectionHeading>
                </CardHeader>
                <CardContent>
                  <StopGrid rows={stopRows} onOpen={select} />
                </CardContent>
              </Card>
              <ScheduleDayMap className="min-w-0" stops={stops} people={people} selectedId={selectedId} onSelect={select} />
            </div>
          </div>
        )}
        {view === "list" && <VisitsList data={data} today={today} forJob={forJob} defaultFilters={defaultFilters} />}
        {!readOnly && <NewJob data={data} today={today} open={jobDay !== null} onOpenChange={(o) => !o && setJobDay(null)} actions={visitActions} day={jobDay ?? undefined} />}
      </div>
    </TooltipProvider>
  )
}
