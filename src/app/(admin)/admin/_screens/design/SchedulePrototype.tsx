"use client"

import { TooltipProvider } from "@/components/ui/tooltip"
import { TimeGridDndProvider } from "@/components/blocks/TimeGrid"
import { ScheduleOverlays } from "./ScheduleOverlays"
import { ScheduleProtoCalendar } from "./ScheduleProtoCalendar"
import { ScheduleProtoDialogs } from "./ScheduleProtoDialogs"
import { ScheduleProtoHeader } from "./ScheduleProtoHeader"
import { ScheduleProtoPanels } from "./ScheduleProtoPanels"
import { useScheduleProto, type ProtoInitial } from "./use-schedule-prototype"

// The Schedule prototype (docs/plans/2026-11-25-scheduler-design.md, sections 7 and 9, reconciled with the walkthrough on Nov 25): one screen over the walkthrough's world with local state,
// so the whole design can be tried before anything is wired. Drag, resize, the keyboard, a block's menu, a row dropped from Unscheduled and the one Schedule dialog all move a visit the
// same way: a toast says "Moved to ..." with Notify the customer and Undo, the visit is marked not notified, and nothing is sent until Send is pressed in the message. A click on a block
// goes to the job's page (`onOpenJob`). Inside the walkthrough this is its Schedule step; the standalone stories show the states the walkthrough cannot open directly.

export function SchedulePrototype({ withOverlays = true, ...props }: ProtoInitial & { /** the walkthrough draws the toast and the message once for every screen */ withOverlays?: boolean }) {
  const p = useScheduleProto(props)
  return (
    <TooltipProvider>
      <TimeGridDndProvider>
        <div data-slot="schedule-prototype" className={p.state.toast ? "space-y-4 pb-28 md:pb-20" : "space-y-4"}>
          <ScheduleProtoHeader p={p} />
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <ScheduleProtoCalendar p={p} />
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
