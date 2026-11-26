"use client"

import { useLayoutEffect, useState } from "react"
import { conflictMap } from "@/components/blocks/time-grid-model"
import { ExternalJobDraggable } from "@/components/blocks/ExternalJobDraggable"
import { MapPanel } from "@/components/blocks/MapPanel"
import { UnscheduledPanel } from "@/components/blocks/UnscheduledPanel"
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
const FLOAT = "cal-enter absolute top-3 z-30 h-auto max-h-[calc(100%-1.5rem)] w-[360px] overflow-hidden rounded-lg border border-border shadow-xl"

export function SchedulePeek({ p }: { p: Proto }) {
  const { state, wide } = p
  const visit = p.selectedId ? state.visits.find((b) => b.id === p.selectedId) : undefined
  const id = visit?.id
  // the card sits at the edge away from the visit, so it never covers the block it describes
  const [side, setSide] = useState<"left" | "right">("right")
  useLayoutEffect(() => {
    if (!wide || !id) return
    const stage = document.querySelector<HTMLElement>('[data-slot="schedule-stage"]')
    const block = stage?.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`)
    if (!stage || !block) return setSide("right")
    const s = stage.getBoundingClientRect()
    const b = block.getBoundingClientRect()
    setSide(b.left + b.width / 2 > s.left + s.width / 2 ? "left" : "right")
  }, [id, wide, p.view])
  if (!visit) return null
  const names = (personId: string) => firstNameOf(p.people.find((x) => x.id === personId)?.name) ?? "They"
  const closePeek = () => {
    const was = p.selectedId
    p.closePeek()
    // focus goes back to the block that opened it
    if (was) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-id="${CSS.escape(was)}"] [data-slot="time-block-button"]`)?.focus())
  }
  return (
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
      className={wide ? `${FLOAT} ${side === "left" ? "left-16" : "right-3"}` : undefined}
      onEdit={() => p.setDialog({ kind: "schedule", id: visit.id, job: false })}
      onMarkDone={() => p.markDone(visit.id)}
      onOpenJob={() => p.openJob(visit.id)}
      onClose={closePeek}
    />
  )
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
