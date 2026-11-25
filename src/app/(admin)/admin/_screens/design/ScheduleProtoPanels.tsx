"use client"

import { ExternalJobDraggable } from "@/components/blocks/ExternalJobDraggable"
import { MapPanel } from "@/components/blocks/MapPanel"
import { UnscheduledPanel } from "@/components/blocks/UnscheduledPanel"
import { ScheduleProtoNewJob } from "./ScheduleProtoNewJob"
import { notToldList } from "./schedule-prototype-model"
import { mapDayOf, mapDayWords, visitsOf } from "./schedule-prototype-view"
import type { Proto } from "./use-schedule-prototype"

// The right column (docs/plans/2026-11-25-scheduler-design.md, 7.6): Unscheduled and Map, side by side in one column from 1280 and then sharing its height, the New job sheet above
// the map while it is open (it takes the Unscheduled panel's place); on a phone each is a sheet from the bottom, one at a time. Hovering a row, a block or a pin lights the same visit
// in all three: they read one `hoverId`.

const GRID_HEIGHT = "h-[max(40rem,min(48rem,calc(100dvh-10rem)))]"
const ASIDE = "h-auto min-h-0 w-full flex-1 basis-0 overflow-hidden border-t first:border-t-0"

export function ScheduleProtoPanels({ p }: { p: Proto }) {
  const { state, wide } = p
  const njOpen = p.newJob.open
  const unscheduledOpen = p.panels.unscheduled && !(wide && njOpen)
  const mapOpen = p.panels.map
  const hover = p.hoverId ?? p.jev.hoverId
  const mapDay = p.newJob.pick?.day ?? mapDayOf(p.view, p.day, p.today)
  const content = (
    <>
      <ScheduleProtoNewJob p={p} className={wide ? `${ASIDE} flex-[5]` : undefined} />
      <UnscheduledPanel
        key={p.tab.key}
        className={ASIDE}
        open={unscheduledOpen}
        onOpenChange={(o) => p.setPanel("unscheduled", o)}
        jobs={state.unscheduled}
        notTold={notToldList(state)}
        defaultTab={p.tab.tab}
        hoverId={hover}
        onHover={p.setHoverId}
        onFindATime={(job) => p.newJob.start(state.unscheduled.find((j) => j.id === job.id) ?? null)}
        dragWrap={
          wide
            ? (job, words) => (
                <ExternalJobDraggable id={job.id} minutes={state.unscheduled.find((j) => j.id === job.id)?.minutes} label={job.customer} className="min-w-0 flex-1">
                  {words}
                </ExternalJobDraggable>
              )
            : undefined
        }
        onNotify={(v) => p.notify([v.id])}
        onDontTell={(v) => p.told([v.id])}
        onNotifyAll={() => p.notify(state.visits.filter((b) => b.notTold).map((b) => b.id))}
      />
      <MapPanel
        className={njOpen && wide ? `${ASIDE} flex-[2]` : ASIDE}
        open={mapOpen}
        onOpenChange={(o) => p.setPanel("map", o)}
        stops={visitsOf(state.visits, state.meta, mapDay)}
        people={[...p.people]}
        unscheduled={unscheduledOpen || !wide ? state.unscheduled : undefined}
        ghost={p.newJob.ghostPin}
        day={mapDayWords(mapDay)}
        hoverId={hover}
        onHover={p.setHoverId}
        selectedId={p.selectedId}
        onSelect={p.setSelectedId}
      />
    </>
  )
  if (!wide) return content
  if (!unscheduledOpen && !mapOpen && !njOpen) return null
  return (
    <div data-slot="schedule-panels" className={`flex w-[360px] shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-background ${GRID_HEIGHT}`}>
      {content}
    </div>
  )
}
