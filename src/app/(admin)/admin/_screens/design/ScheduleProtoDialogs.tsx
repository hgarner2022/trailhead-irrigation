"use client"

import { CalendarKeysHelp } from "@/components/blocks/CalendarKeysHelp"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { firstNameOf } from "@/lib/admin/people"
import { ScheduleDialog } from "./ScheduleDialog"
import type { Proto } from "./use-schedule-prototype"

// The dialogs the Schedule prototype opens, one at a time: the one Schedule dialog (Move for a visit on the calendar, Schedule for a job with no day, the best times inside), "Move the
// visit" listing what a drop or a keyboard move breaks, and the shortcuts list. Send a message (Notify the customer) is `ScheduleOverlays`, which also holds the moved confirmation, so it works from a job page too.

export function ScheduleProtoDialogs({ p }: { p: Proto }) {
  const d = p.dialog
  const close = (kind: string) => (o: boolean) => !o && p.setDialog((x) => (x?.kind === kind ? null : x))
  const { state } = p
  return (
    <>
      {d?.kind === "schedule" && (() => {
        const visit = d.job ? undefined : state.visits.find((b) => b.id === d.id)
        const job = d.job ? state.unscheduled.find((j) => j.id === d.id) : undefined
        const meta = state.meta[d.id]
        const who = visit ?? job
        if (!who || !meta) return null
        const town = visit ? visit.town : job!.town
        const minutes = visit ? visit.minutes : job!.minutes
        const service = visit ? visit.service : job!.service
        const point = meta ? { lat: meta.lat, lng: meta.lng } : null
        const best = p.bestFor({ town, minutes, kind: who.kind, point, excludeId: visit?.id, initialPickId: d.pickId, currentDay: visit?.day })
        return (
          <ScheduleDialog
            key={d.id}
            verb={d.job ? "Schedule" : "Move"}
            first={firstNameOf(meta.customer) ?? meta.customer}
            service={service}
            address={visit ? `${visit.title}, ${visit.town}` : `${job!.street}, ${job!.town}`}
            minutes={minutes}
            best={best}
            onClose={() => p.setDialog(null)}
            onConfirm={(r) => p.schedule(d, r)}
          />
        )
      })()}
      {d?.kind === "confirm" && (
        <ConfirmDialog
          title="Move the visit"
          open
          onOpenChange={close("confirm")}
          confirmLabel="Move the visit"
          slot="move-anyway-dialog"
          onConfirm={async () => {
            p.dispatch(d.action)
            return { ok: true }
          }}
        >
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
            {d.problems.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </ConfirmDialog>
      )}
      <CalendarKeysHelp open={p.keys.helpOpen} onOpenChange={p.keys.setHelpOpen} />
    </>
  )
}
