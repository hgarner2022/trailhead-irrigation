"use client"

import { TooltipProvider } from "@/components/ui/tooltip"
import { TimeGridDndProvider } from "@/components/blocks/TimeGrid"
import { ScheduleOverlays } from "./ScheduleOverlays"
import { ScheduleProtoCalendar } from "./ScheduleProtoCalendar"
import { ScheduleProtoDialogs } from "./ScheduleProtoDialogs"
import { ScheduleProtoHeader } from "./ScheduleProtoHeader"
import { ScheduleProtoPanels, SchedulePeek } from "./ScheduleProtoPanels"
import { useScheduleProto, type ProtoInitial } from "./use-schedule-prototype"

// The Schedule prototype (docs/plans/2026-11-25-scheduler-design.md, sections 7 and 9, reconciled with the walkthrough on Nov 25, and the second review of Nov 26,
// docs/plans/2026-11-26-scheduler-review-research.md): one screen over the walkthrough's world with local state, so the whole design can be tried before anything is wired. Drag, resize,
// the keyboard, a row dropped from Unscheduled and Edit visit all move a visit the same way: a toast says "Moved to ..." with Notify the customer and Undo, and nothing is sent until Send is
// pressed in the message. A click on a block opens its peek (Edit visit, Mark done, Open job); Open job goes to the job's page (`onOpenJob`). Inside the walkthrough this is its Schedule
// step; the standalone stories show the states the walkthrough cannot open directly.

export function SchedulePrototype({ withOverlays = true, ...props }: ProtoInitial & { /** the walkthrough draws the toast and the message once for every screen */ withOverlays?: boolean }) {
  const p = useScheduleProto(props)
  return (
    <TooltipProvider>
      <TimeGridDndProvider>
        <div data-slot="schedule-prototype" className={p.state.toast ? "space-y-3 pb-28 md:space-y-4 md:pb-20" : "space-y-3 md:space-y-4"}>
          <ScheduleProtoHeader p={p} />
          <div className="flex items-start gap-4">
            <div data-slot="schedule-stage" className="relative min-w-0 flex-1">
              <ScheduleProtoCalendar p={p} />
              <SchedulePeek p={p} />
            </div>
            <ScheduleProtoPanels p={p} />
          </div>
          <ScheduleProtoDialogs p={p} />
          {withOverlays && <ScheduleOverlays store={p.store} people={p.people} toastSeconds={p.toastSeconds} />}
        </div>
      </TimeGridDndProvider>
    </TooltipProvider>
  )
}
