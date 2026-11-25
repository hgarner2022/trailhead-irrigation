"use client"

import { TooltipProvider } from "@/components/ui/tooltip"
import { MovedToast } from "@/components/blocks/MovedToast"
import { PlanStrip } from "@/components/blocks/PlanStrip"
import { TimeGridDndProvider } from "@/components/blocks/TimeGrid"
import { ScheduleProtoCalendar } from "./ScheduleProtoCalendar"
import { ScheduleProtoDialogs } from "./ScheduleProtoDialogs"
import { ScheduleProtoHeader } from "./ScheduleProtoHeader"
import { ScheduleProtoPanels } from "./ScheduleProtoPanels"
import { ScheduleProtoVisit } from "./ScheduleProtoVisit"
import { shortDay } from "./schedule-prototype-words"
import { mondayOf } from "./schedule-prototype-view"
import { useScheduleProto, type ProtoInitial } from "./use-schedule-prototype"

// The Schedule prototype (docs/plans/2026-11-25-scheduler-design.md, sections 7 and 9): one screen over fixtures with local state, so the whole design can be tried before anything is wired.
// Drag, resize, the keyboard, a block's menu, a row from Unscheduled and Jev's plan all move a visit the same way: a toast says "Visit moved" with Notify and Undo, the visit is marked
// not told, and nothing is sent until Notify is pressed and Send is chosen. It sits inside the admin shell like the other screen stories; the live Schedule is not touched.

export function SchedulePrototype(props: ProtoInitial) {
  const p = useScheduleProto(props)
  const toast = p.state.toast
  return (
    <TooltipProvider>
      <TimeGridDndProvider>
        <div data-slot="schedule-prototype" className="space-y-4">
          <ScheduleProtoHeader p={p} />
          {p.jev.status && (
            <PlanStrip
              status={p.jev.status}
              weekLabel={shortDay(mondayOf(p.day))}
              moves={p.jev.moves}
              savedMinutes={p.jev.savedMinutes}
              onAccept={p.jev.accept}
              onDiscard={p.jev.discard}
              onCancel={p.jev.cancel}
              onHover={p.jev.hover}
            />
          )}
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <ScheduleProtoCalendar p={p} />
            </div>
            <ScheduleProtoPanels p={p} />
          </div>
          <ScheduleProtoVisit p={p} />
          <ScheduleProtoDialogs p={p} />
          {toast && (
            <MovedToast
              key={toast.key}
              title={toast.title}
              detail={toast.detail || undefined}
              many={toast.many}
              seconds={p.toastSeconds}
              onNotify={() => p.notify(toast.ids)}
              onUndo={() => p.dispatch({ type: "undo" })}
              onClose={() => p.dispatch({ type: "dismiss-toast" })}
            />
          )}
        </div>
      </TimeGridDndProvider>
    </TooltipProvider>
  )
}
