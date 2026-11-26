"use client"

import { useMemo } from "react"
import { CalendarLegend } from "@/components/blocks/CalendarLegend"
import { MonthGrid } from "@/components/blocks/MonthGrid"
import { TimeGrid } from "@/components/blocks/TimeGrid"
import { monthOf } from "@/components/blocks/month-grid-model"
import { columnsFor, monthDays } from "./schedule-prototype-view"
import { VisitsList } from "../VisitsList"
import { adminDataOf, nowOn } from "./schedule-admin-data"
import { driveLines, routeOf } from "./schedule-engine"
import type { Proto } from "./use-schedule-prototype"

// What sits under the toolbar: the clock for Week and Day (the Unscheduled rows and the grid share one drag provider, made by the screen), the month for Month, a line for List.
// A time off band goes to Settings, People.

export function ScheduleProtoCalendar({ p }: { p: Proto }) {
  const { state, view, day } = p
  // hiding a person is a view: their stops and time off leave every view below, and the counts describe only the people shown
  const visits = useMemo(() => state.visits.filter((b) => p.shown.some((x) => x.id === b.personId)), [state.visits, p.shown])
  const timeOff = useMemo(() => state.timeOff.filter((o) => p.shown.some((x) => x.id === o.personId)), [state.timeOff, p.shown])
  const drives = useMemo(() => allDriveLines(visits, state.meta, p.shown), [visits, state.meta, p.shown])
  // the Any time stops in the order the day is driven, so the strip numbers them 1, 2, 3 as Order the day left them
  const anytime = useMemo(() => {
    const at = new Map<string, number>()
    for (const day of new Set(visits.map((b) => b.day))) for (const person of p.shown) routeOf(visits, person.id, day).forEach((b, i) => at.set(b.id, i))
    return visits.filter((b) => b.start === null).sort((a, b) => (at.get(a.id) ?? 0) - (at.get(b.id) ?? 0))
  }, [visits, p.shown])
  const listData = useMemo(() => adminDataOf({ visits, meta: state.meta }, p.people, p.moneyOf), [visits, state.meta, p.people, p.moneyOf])
  // List is the product's own visits grid over this calendar; a row opens the visit as a block does
  if (view === "list") return <VisitsList key={p.hidden.join()} data={listData} today={nowOn(p.today)} onOpenVisit={p.onSelect} defaultFilters={p.hidden.length ? [{ column: "personId", values: p.shown.map((x) => x.id) }] : undefined} />
  if (view === "month")
    return (
      <MonthGrid
        month={monthOf(day)}
        days={monthDays(visits, timeOff, p.shown)}
        people={p.shown}
        today={p.today}
        selectedDay={day}
        phoneHead={false}
        onOpenDay={p.openDay}
        onMonthChange={(m) => p.setDay(`${m}-01`)}
      />
    )
  return (
    <>
    <TimeGrid
      key={view}
      className="min-w-0"
      people={p.shown}
      allPeople={p.people}
      personRow={false}
      columns={columnsFor(view, day, p.shown, visits, state.meta, p.today, timeOff)}
      blocks={visits.filter((b) => b.start !== null)}
      anytime={anytime}
      timeOff={timeOff}
      drives={drives}
      now={p.now}
      selectedId={p.selectedId}
      hoverId={p.hoverId ?? undefined}
      showPersonNames={view === "day"}
      onSelect={p.onSelect}
      onHover={p.setHoverId}
      onMove={p.onMove}
      onResize={p.onResize}
      onDropExternal={p.onDropExternal}
      onTimeOffClick={p.onOpenSettings ? () => p.onOpenSettings?.() : undefined}
      onCreateAt={p.onNewJob ? (at) => p.onNewJob?.(at.day) : undefined}
      onToday={() => p.setDay(p.today)}
      onOpenDay={view === "week" ? p.openDay : undefined}
    />
    <CalendarLegend className="mt-1" />
    </>
  )
}

/** The drive into every timed stop from the one before it, for every person and day on the calendar. */
function allDriveLines(visits: Proto["state"]["visits"], meta: Proto["state"]["meta"], people: Proto["people"]): Map<string, number> {
  const out = new Map<string, number>()
  for (const day of new Set(visits.map((b) => b.day))) for (const person of people) for (const [id, minutes] of driveLines(visits, meta, person.id, day)) out.set(id, minutes)
  return out
}
