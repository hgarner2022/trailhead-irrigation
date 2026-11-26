"use client"

import { useLayoutEffect, useState } from "react"
import { conflictMap } from "@/components/blocks/time-grid-model"
import { ExternalJobDraggable } from "@/components/blocks/ExternalJobDraggable"
import { MapPanel } from "@/components/blocks/MapPanel"
import { UnscheduledPanel } from "@/components/blocks/UnscheduledPanel"
import { PeekAnchor } from "@/components/blocks/PeekAnchor"
import { VisitPeek } from "@/components/blocks/VisitPeek"
import { hoursWords } from "@/lib/admin/day-fill"
import { visitWhen } from "./schedule-prototype-model"
import { dayLabel } from "@/lib/admin/calendar"
import { firstNameOf } from "@/lib/admin/people"
import { personDay } from "./schedule-engine"
import { mapDayOf, mapDayWords, mondayOf, visitsOf, weekDaysShown } from "./schedule-prototype-view"
import type { Proto } from "./use-schedule-prototype"

// Beside and over the calendar (docs/plans/2026-11-25-scheduler-design.md, 7.6). `SchedulePeek` is the peek of the visit just clicked: from 1280 a light card that floats over the calendar's own
// stage, at the edge away from the visit, so the calendar never moves or narrows when it opens; another visit swaps its words in place (the card stays mounted, so it does not enter again). Below
// 1280 it is the full-height sheet. `ScheduleProtoPanels` is Unscheduled and Map: from 1280 one column beside the calendar, sharing its height (the calendar keeps its column widths and scrolls
// sideways inside itself); on a phone each is a sheet from the bottom, one at a time. A row's Schedule opens the one Schedule dialog on its suggested time. Hovering a row, a block or a pin
// lights the same visit in both: they read one `hoverId`.

const GRID_HEIGHT = "h-[max(40rem,min(48rem,calc(100dvh-11rem)))]"
const ASIDE = "h-auto min-h-0 w-full flex-1 basis-0 overflow-hidden border-l-0 border-t first:border-t-0"
const FLOAT = "cal-enter absolute top-3 right-3 z-30 h-auto max-h-[calc(100%-1.5rem)] w-[360px] overflow-hidden rounded-lg border border-border shadow-xl"
const ANCHORED = "cal-enter relative h-auto min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-border"

const STAGE = '[data-slot="schedule-stage"]'
/** The block (or Any time chip) of a visit on the clock, wherever it is drawn now. */
const findBlock = (id: string) => document.querySelector<HTMLElement>(`${STAGE} :is([data-slot="time-block"],[data-slot="time-chip"])[data-id="${CSS.escape(id)}"]`)
const gridOf = () => document.querySelector<HTMLElement>(`${STAGE} [data-slot="time-grid"]`)

export function SchedulePeek({ p }: { p: Proto }) {
  const { state, wide } = p
  const visit = p.selectedId ? state.visits.find((b) => b.id === p.selectedId) : undefined
  const id = visit?.id
  // From 1280 the card opens beside the block that was clicked (PeekAnchor); a visit with no block on a clock (the Month, the List, a map pin) keeps the old fixed card at the stage's edge.
  // `mode` is read once the block is in the page, before it paints, so the card never draws in the wrong place first.
  const [mode, setMode] = useState<"pending" | "anchored" | "float">("pending")
  useLayoutEffect(() => {
    if (!wide || !id) return
    setMode(findBlock(id) ? "anchored" : "float")
  }, [id, wide, p.view])
  if (!visit) return null
  const names = (personId: string) => firstNameOf(p.people.find((x) => x.id === personId)?.name) ?? "They"
  const closePeek = () => {
    const was = p.selectedId
    p.closePeek()
    // focus goes back to the block that opened it
    if (was) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-id="${CSS.escape(was)}"] [data-slot="time-block-button"]`)?.focus())
  }
  const peek = (className?: string) => (
    <VisitPeek
      customer={state.meta[visit.id]?.customer ?? visit.name}
      service={visit.service}
      when={visitWhen(visit)}
      length={hoursWords(visit.minutes)}
      who={p.people.find((x) => x.id === visit.personId)?.name ?? "No one yet"}
      address={`${visit.title}, ${visit.town}`}
      job={`${visit.service} at ${visit.title}`}
      done={visit.done}
      waiting={visit.waiting}
      canMarkDone={visit.day <= p.today && !visit.done}
      conflict={conflictMap(state.visits.filter((b) => b.start !== null && b.day === visit.day), state.timeOff, names).get(visit.id)}
      className={className}
      onEdit={() => p.setDialog({ kind: "schedule", id: visit.id, job: false })}
      onMarkDone={() => p.markDone(visit.id)}
      onOpenJob={() => p.openJob(visit.id)}
      onClose={closePeek}
    />
  )
  if (!wide) return peek()
  if (mode === "pending") return null
  if (mode === "anchored")
    return (
      <PeekAnchor anchorId={visit.id} find={findBlock} boundary={gridOf()} onClose={closePeek}>
        {peek(ANCHORED)}
      </PeekAnchor>
    )
  return peek(FLOAT)
}

export function ScheduleProtoPanels({ p }: { p: Proto }) {
  const { state, wide } = p
  const unscheduledOpen = p.panels.unscheduled
  const mapOpen = p.panels.map
  const hover = p.hoverId
  const weekDays = p.view === "week" ? weekDaysShown(mondayOf(p.day), p.shown, state.visits) : []
  const mapDay = p.view === "week" && p.mapPick && weekDays.includes(p.mapPick) ? p.mapPick : mapDayOf(p.view, p.day, p.today)
  const content = (
    <>
      <UnscheduledPanel
        className={ASIDE}
        open={unscheduledOpen}
        onOpenChange={(o) => p.setPanel("unscheduled", o)}
        jobs={p.jobs}
        hoverId={hover}
        onHover={p.setHoverId}
        onSchedule={(job) => p.setDialog({ kind: "schedule", id: job.id, job: true, pickId: p.jobs.find((j) => j.id === job.id)?.pickId })}
        dragWrap={
          wide
            ? (job, words) => (
                <ExternalJobDraggable id={job.id} minutes={state.unscheduled.find((j) => j.id === job.id)?.minutes} label={job.customer} className="min-w-0 flex-1">
                  {words}
                </ExternalJobDraggable>
              )
            : undefined
        }
        onScheduleAll={() => p.setDialog({ kind: "schedule-all" })}
      />
      <MapPanel
        className={ASIDE}
        open={mapOpen}
        onOpenChange={(o) => p.setPanel("map", o)}
        stops={visitsOf(state.visits, state.meta, mapDay).filter((v) => p.shown.some((x) => x.id === v.personId))}
        peopleMenu={false}
        people={[...p.people]}
        unscheduled={unscheduledOpen || !wide ? state.unscheduled : undefined}
        day={mapDayWords(mapDay)}
        days={weekDays.map((d) => ({ day: d, label: dayLabel(d) }))}
        dayValue={mapDay}
        onDayChange={p.setMapPick}
        driving={p.shown.map((x) => ({ id: x.id, name: firstNameOf(x.name) ?? x.name, minutes: personDay({ people: p.people, visits: state.visits, meta: state.meta, timeOff: state.timeOff }, x, mapDay).driving }))}
        hoverId={hover}
        onHover={p.setHoverId}
        selectedId={p.selectedId}
        onSelect={p.setSelectedId}
      />
    </>
  )
  if (!wide) return content
  if (!unscheduledOpen && !mapOpen) return null
  return (
    <div data-slot="schedule-panels" className={`cal-enter flex w-[328px] shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-background ${GRID_HEIGHT}`}>
      {content}
    </div>
  )
}
