"use client"

import { CalendarKeysHelp } from "@/components/blocks/CalendarKeysHelp"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { firstNameOf } from "@/lib/admin/people"
import { useState } from "react"
import { hoursWords } from "@/lib/admin/day-fill"
import { OrderDayDialog } from "./OrderDayDialog"
import { ScheduleAllDialog } from "./ScheduleAllDialog"
import { ScheduleDialog } from "./ScheduleDialog"
import { windowLines } from "./schedule-window"
import { scheduleAllPlan } from "./schedule-all"
import { orderDay } from "./schedule-order"
import type { Dialog, Proto } from "./use-schedule-prototype"

// The dialogs the Schedule prototype opens, one at a time: the one Schedule dialog (Edit visit for a visit on the calendar, Schedule for a job with no day, the best times inside), "Move anyway?"
// listing what a drop or a keyboard move breaks, and the shortcuts list. Send a message (Notify the customer) is `ScheduleOverlays`, which also holds the moved confirmation, so it works from a job page too.

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
        const best = p.bestFor({ town, minutes, kind: who.kind, point, excludeId: visit?.id, initialPickId: d.pickId, currentDay: visit?.day, current: visit ? { day: visit.day, start: visit.start === null ? null : `${String(Math.floor(visit.start / 60)).padStart(2, "0")}:${String(visit.start % 60).padStart(2, "0")}`, personName: p.people.find((x) => x.id === visit.personId)?.name ?? "" } : undefined })
        return (
          <ScheduleDialog
            key={d.id}
            verb={d.job ? "Schedule" : "Move"}
            title={d.job || !visit?.day ? "Schedule visit" : "Edit visit"}
            lengthField
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
          title="Move anyway?"
          open
          onOpenChange={close("confirm")}
          confirmLabel="Move anyway"
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
          {windowOf(p, d.action).map((x) => (
            <p key={x} data-slot="window-line" className="mt-3 text-sm text-muted-foreground">{x}</p>
          ))}
        </ConfirmDialog>
      )}
      {d?.kind === "order" && <OrderDay p={p} personId={d.personId} />}
      {d?.kind === "schedule-all" && <ScheduleAll p={p} />}
      <CalendarKeysHelp open={p.keys.helpOpen} onOpenChange={p.keys.setHelpOpen} />
    </>
  )
}

/** Reorder stops for one person's day in view: the plan is read from the calendar as it stands, the confirm is one change with one Undo. */
function OrderDay({ p, personId }: { p: Proto; personId: string }) {
  const { state } = p
  const person = p.people.find((x) => x.id === personId)
  if (!person) return null
  const cal = { people: p.people, visits: state.visits, meta: state.meta, timeOff: state.timeOff }
  const plan = orderDay(cal, person, p.day)
  const message = plan.saved > 0 ? `Stops reordered. ${hoursWords(plan.saved)} less driving.` : "Stops reordered."
  return <OrderDayDialog plan={plan} meta={state.meta} who={firstNameOf(person.name) ?? person.name} onClose={() => p.setDialog(null)} onConfirm={() => p.dispatch({ type: "order-day", moves: plan.moves, message })} onAnotherDay={(id) => p.setDialog({ kind: "schedule", id, job: false })} />
}

/** Schedule all N: where each job with no day would go, planned again whenever a row is removed. */
function ScheduleAll({ p }: { p: Proto }) {
  const { state } = p
  const [removed, setRemoved] = useState<readonly string[]>([])
  const cal = { people: p.people, visits: state.visits, meta: state.meta, timeOff: state.timeOff }
  const rows = scheduleAllPlan(cal, state.unscheduled.filter((j) => !removed.includes(j.id)), p.today)
  return (
    <ScheduleAllDialog
      rows={rows}
      onRemove={(id) => setRemoved((r) => [...r, id])}
      onClose={() => p.setDialog(null)}
      onConfirm={(notify) => p.dispatch({ type: "place-all", places: rows.flatMap((r) => (r.to ? [{ jobId: r.job.id, to: { day: r.to.day, personId: r.to.personId, start: r.to.start } }] : [])), notified: notify })}
    />
  )
}

/** The day the visit is on and the day it is going to, said when either is inside the customer's 24 hours. */
function windowOf(p: Proto, action: Extract<Dialog, { kind: "confirm" }>["action"]): string[] {
  const here = "id" in action ? p.state.visits.find((b) => b.id === action.id)?.day : undefined
  return windowLines(p.today, { old: action.type === "move" || action.type === "resize" ? here : null, next: action.type === "move" || action.type === "place" ? action.to.day : null })
}
