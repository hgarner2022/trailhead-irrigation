"use client"

import { MonthGrid } from "@/components/blocks/MonthGrid"
import { NotTold } from "@/components/blocks/NotTold"
import { TimeGrid } from "@/components/blocks/TimeGrid"
import { monthOf } from "@/components/blocks/month-grid-model"
import { columnsFor, monthDays } from "./schedule-prototype-view"
import type { Proto } from "./use-schedule-prototype"

// What sits under the toolbar: the clock for Week and Day (the Unscheduled rows and the grid share one drag provider, made by the screen), the month for Month, a line for List.
// A time off band goes to Settings, People.

export function ScheduleProtoCalendar({ p }: { p: Proto }) {
  const { state, view, day } = p
  if (view === "list") return <p className="rounded-lg border border-border bg-background px-4 py-6 text-sm text-muted-foreground">The List view stays as it is today.</p>
  if (view === "month")
    return (
      <MonthGrid
        month={monthOf(day)}
        days={monthDays(state.visits, state.timeOff, p.people)}
        people={p.people}
        today={p.today}
        selectedDay={day}
        notToldMark={<NotTold className="size-4 md:size-5" />}
        onOpenDay={p.openDay}
        onMonthChange={(m) => p.setDay(`${m}-01`)}
      />
    )
  return (
    <TimeGrid
      key={view}
      className="min-w-0"
      people={p.people}
      columns={columnsFor(view, day, p.people, state.visits, state.meta, p.today)}
      blocks={state.visits.filter((b) => b.start !== null)}
      anytime={state.visits.filter((b) => b.start === null)}
      timeOff={state.timeOff}
      now={p.now}
      selectedId={p.selectedId}
      hoverId={p.hoverId ?? undefined}
      showPersonNames={view === "day"}
      notToldMark={(b) => (b.notTold ? <NotTold /> : null)}
      onSelect={p.onSelect}
      onHover={p.setHoverId}
      onMove={p.onMove}
      onResize={p.onResize}
      onDropExternal={p.onDropExternal}
      onTimeOffClick={p.onOpenSettings ? () => p.onOpenSettings?.() : undefined}
      onAction={p.onAction}
      onToday={() => p.setDay(p.today)}
    />
  )
}
