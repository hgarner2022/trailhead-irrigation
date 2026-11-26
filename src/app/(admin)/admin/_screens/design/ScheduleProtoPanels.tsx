"use client"

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

// The right column (docs/plans/2026-11-25-scheduler-design.md, 7.6): the peek of the visit just clicked on top (docked, never over the grid), then Unscheduled and Map, side by side in one column from 1280 and then sharing its height; on a phone each is a
// sheet from the bottom, one at a time. A row's Schedule opens the one Schedule dialog on its suggested time. Hovering a row, a block or a pin lights the same visit in both: they
// read one `hoverId`.

const GRID_HEIGHT = "h-[max(40rem,min(48rem,calc(100dvh-10rem)))]"
const ASIDE_FIXED = "h-auto min-h-0 w-full shrink-0 overflow-y-auto border-b xl:max-h-[24rem]"
const ASIDE = "h-auto min-h-0 w-full flex-1 basis-0 overflow-hidden border-t first:border-t-0"

export function ScheduleProtoPanels({ p }: { p: Proto }) {
  const { state, wide } = p
  const unscheduledOpen = p.panels.unscheduled
  const mapOpen = p.panels.map
  const hover = p.hoverId
  const weekDays = p.view === "week" ? weekDaysShown(mondayOf(p.day), p.shown, state.visits) : []
  const mapDay = p.view === "week" && p.mapPick && weekDays.includes(p.mapPick) ? p.mapPick : mapDayOf(p.view, p.day, p.today)
  const visit = p.selectedId ? state.visits.find((b) => b.id === p.selectedId) : undefined
  const peekOpen = Boolean(visit)
  const closePeek = () => {
    const id = p.selectedId
    p.closePeek()
    // focus goes back to the block that opened it
    if (id) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"] [data-slot="time-block-button"]`)?.focus())
  }
  const content = (
    <>
      {visit && (
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
          className={ASIDE_FIXED}
          onEdit={() => p.setDialog({ kind: "schedule", id: visit.id, job: false })}
          onMarkDone={() => p.markDone(visit.id)}
          onOpenJob={() => p.openJob(visit.id)}
          onClose={closePeek}
        />
      )}
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
  if (!unscheduledOpen && !mapOpen && !peekOpen) return null
  const alone = peekOpen && !unscheduledOpen && !mapOpen
  return (
    <div data-slot="schedule-panels" className={`flex w-[360px] shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-background ${alone ? "h-auto" : GRID_HEIGHT}`}>
      {content}
    </div>
  )
}
