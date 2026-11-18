"use client"

import { useMemo, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SegmentedControl } from "@/components/blocks/SegmentedControl"
import { PageHeader } from "@/components/blocks/PageHeader"
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
import { useScheduleAddress } from "./schedule-address"
import { ScheduleDay } from "./ScheduleDay"
import { ScheduleUnscheduled, TextingStrips } from "./ScheduleUnscheduled"
import { usePlacing } from "./use-placing"
import { plainRefusal, restoreVisit } from "./place-model"
import { TEXT_DELAY_SECONDS } from "./use-texting-queue"
import { ScheduleMoveTo } from "./ScheduleMoveTo"
import { DayStepper, Exceptions, NextJobsLine } from "./ScheduleParts"
import { dayContext, exceptionCount, firstJobWeek, moveOutcome, nextJobsWeek, weekContext } from "./schedule-model"
import { routePeople } from "@/lib/admin/people"
import { initialRecord } from "@/lib/admin/record-url"

// Where Ryan lives in season (docs/plans/2026-11-18-admin-holistic-design.md, 5.2): the week with a row per person on the schedule (each with their route colour, each
// day headed by how full it is and which towns are in it), the Day view's stops per person beside one map, and the "Unscheduled" list under the week with every
// job that has no day, a pass's or a one-off's. Place puts one job on the next open day with the first person who has room and Place all puts the list, after a
// preview; the customer's text waits a minute under a strip and Undo inside it sends nothing (`usePlacing`). Drag a stop to another day or another person and it
// goes through the same Move the visit panel uses, and the customer is texted. A refused Place or move says why, in the API's words, under the row or in the
// status line and nowhere else. Selecting a stop in the grid, the list or the map highlights the same visit. Client because the week, the day, the tab, the selection
// and the moves are state; the route's page.tsx supplies `data` and `today`.

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
  /** Place, Place all and drag: give a visit to a person on a day (the API's Move, which texts the date); a refusal's words show and the block snaps back */
  onMove?: (visitId: string, personId: string, dayIso: string) => Promise<Outcome>
  /** the visit panel a stop opens, and New job; server actions in the app */
  visitActions?: VisitActions
  /** the job panel and the customer panel, for a record opened from a visit */
  jobActions?: JobActions
  customerActions?: CustomersActions
  /** the seconds a Place's text waits under the strip; 60 in the app, 0 books at once (the tests) */
  textDelaySeconds?: number
}

export type ScheduleView = "week" | "day" | "list"
const VIEWS = [
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
  { value: "list", label: "List" },
] as const

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

function ScheduleBody({ data, today, defaultTab = "week", defaultDay, defaultWeek, defaultSelectedId, forJob, defaultFilters, readOnly = false, onMove, visitActions, textDelaySeconds = TEXT_DELAY_SECONDS }: ScheduleScreenProps) {
  // With the visit panel wired (the app), a stop opens it and its Move replaces the strip above the week; without it (the catalog) the strip stays.
  const panel = Boolean(visitActions)
  const openVisit = useOpenVisit()
  const todayDay = dayOf(today, TIME_ZONE)
  const { areas } = data.settings
  const people = routePeople(data.settings.people)
  const [visits, setVisits] = useState(data.visits)
  const [seen, setSeen] = useState(data.visits)
  const [, startTransition] = useTransition()
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
  useScheduleAddress({ view, day, weekStart, setView, setDay, setWeekStart })
  const [selectedId, setSelectedId] = useState<string | undefined>(defaultSelectedId)
  /** Selecting a stop highlights it everywhere and opens its visit. */
  const select = (id: string | undefined) => {
    setSelectedId(id)
    if (id && panel) openVisit?.(id)
  }
  const [announcement, setAnnouncement] = useState("")
  // Place and Place all show their placements at once and hold the text for a minute; everything below reads the visits with them laid on.
  const placing = usePlacing({ data, visits, setVisits, people, todayDay, onMove, seconds: textDelaySeconds, announce: setAnnouncement, highlight: setSelectedId })
  const shown = placing.shown
  const week = weekVisits(shown, weekStart, TIME_ZONE)
  const selected = week.find((v) => v.id === selectedId && v.startAt)

  /** Sends the move to the API; the block shows where it is going at once and goes back with the API's words if it is refused. */
  const send = (visitId: string, personId: string, dayIso: string, done: string) =>
    startTransition(async () => {
      const out = await onMove!(visitId, personId, dayIso)
      if (out.ok) return setAnnouncement(done)
      // only this job goes back, to the server's row: the rest of the screen's state is not touched
      setVisits((v) => restoreVisit(v, visitId, data.visits))
      setAnnouncement(plainRefusal(out.message))
    })
  const move = (visitId: string, personId: string, dayIso: string) => {
    if (placing.isPending(visitId)) return setAnnouncement("That job is waiting to be texted. Undo it, or wait for the minute to pass.")
    if (!onMove) console.info("move visit", visitId, personId, dayIso)
    const outcome = moveOutcome(visits, visitId, personId, dayIso, people, TIME_ZONE)
    // a drop where it already is, a day off and an unknown stop are answered here and make no call
    if (!outcome.moved) return setAnnouncement(outcome.message)
    setVisits(outcome.visits)
    if (onMove) return send(visitId, personId, dayIso, outcome.message)
    setAnnouncement(outcome.message)
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
        <PageHeader title="Schedule" context={view === "list" ? undefined : view === "day" ? dayContext(day, dayVisits(shown, day, undefined, TIME_ZONE)) : weekContext(weekStart, week)} actions={readOnly ? undefined : <NewJobButton data={data} today={today} actions={visitActions} />} />
        {selected && !readOnly && !panel && <ScheduleMoveTo key={`${selected.id}-${selected.personId}-${selected.startAt}`} visit={selected} people={people} weekStart={weekStart} timeZone={TIME_ZONE} onMove={move} />}
        <p role="status" className="text-sm text-muted-foreground empty:sr-only">
          {announcement}
        </p>
        <TextingStrips strips={placing.strips} />
        <SegmentedControl label="Schedule view" options={VIEWS} value={view} onChange={(v) => setView(v as ScheduleView)} />
        {view === "week" && (
          <div data-slot="schedule-week" className="space-y-6">
            {week.length === 0 && <NextJobsLine weekStart={nextJobsWeek(shown, weekStart, TIME_ZONE)} onGo={goToWeek} />}
            <div className="space-y-6">
              <WeekGrid
                className="min-w-0"
                people={people}
                areas={areas}
                visits={shown}
                weekStart={weekStart}
                today={todayDay}
                timeZone={TIME_ZONE}
                selectedId={selectedId}
                onSelect={select}
                onMove={readOnly ? undefined : move}
                onWeekChange={setWeekStart}
                onNewJob={readOnly ? undefined : setJobDay}
              />
              <ScheduleUnscheduled
                items={placing.tray}
                readOnly={readOnly}
                problems={placing.problems}
                noRoom={placing.noRoom}
                onPlace={placing.place}
                onPlaceAll={placing.openPlaceAll}
                onAnotherDay={(item) => select(item.id)}
                preview={{ open: placing.previewOpen, rows: placing.rows, onOpenChange: (o) => !o && placing.closePlaceAll(), onConfirm: placing.confirmPlaceAll }}
              />
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
            <ScheduleDay day={day} visits={shown} people={people} areas={areas} timeZone={TIME_ZONE} selectedId={selectedId} onSelect={select} onMove={readOnly ? undefined : move} />
          </div>
        )}
        {view === "list" && <VisitsList data={data} today={today} forJob={forJob} defaultFilters={defaultFilters} />}
        {!readOnly && <NewJob data={data} today={today} open={jobDay !== null} onOpenChange={(o) => !o && setJobDay(null)} actions={visitActions} day={jobDay ?? undefined} />}
      </div>
    </TooltipProvider>
  )
}
