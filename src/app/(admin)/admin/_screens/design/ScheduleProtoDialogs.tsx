"use client"

import { CalendarKeysHelp } from "@/components/blocks/CalendarKeysHelp"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { NotifyDialog } from "@/components/blocks/NotifyDialog"
import { TimeOffDialog } from "@/components/blocks/TimeOffDialog"
import { moveMessage } from "./schedule-prototype-model"
import { ScheduleProtoMove } from "./ScheduleProtoMove"
import type { Proto } from "./use-schedule-prototype"

// The dialogs the Schedule prototype opens, one at a time: Notify (one customer, or many after a plan), "Move anyway?" listing what the place breaks, Time off (add or edit with Remove),
// Move, and the shortcuts list. Nothing here sends: Send and Don't tell only clear the "not told" mark.

const MANY = "Trailhead: your {service} moved to {day} at {time}."

export function ScheduleProtoDialogs({ p }: { p: Proto }) {
  const d = p.dialog
  const close = (kind: string) => (o: boolean) => !o && p.setDialog((x) => (x?.kind === kind ? null : x))
  const { state } = p
  return (
    <>
      {d?.kind === "notify" && d.ids.length === 1 && (() => {
        const v = state.visits.find((b) => b.id === d.ids[0])
        const m = v ? state.meta[v.id] : undefined
        return v && m ? (
          <NotifyDialog key={v.id} open onOpenChange={close("notify")} body={moveMessage(v)} recipient={{ customer: m.customer, phone: m.phone, email: m.email }} onSend={() => p.told(d.ids)} onDontTell={() => p.told(d.ids)} />
        ) : null
      })()}
      {d?.kind === "notify" && d.ids.length > 1 && (
        <NotifyDialog
          key="many"
          open
          onOpenChange={close("notify")}
          body={MANY}
          recipients={d.ids.flatMap((id) => {
            const v = state.visits.find((b) => b.id === id)
            const m = state.meta[id]
            return v && m ? [{ id, customer: m.customer, town: v.town, phone: m.phone, email: m.email }] : []
          })}
          onSend={(r) => p.told(r.ids)}
          onDontTell={() => p.told(d.ids)}
        />
      )}
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
        </ConfirmDialog>
      )}
      {d?.kind === "time-off" && (
        <TimeOffDialog
          key={d.id ?? "new"}
          open
          onOpenChange={close("time-off")}
          people={p.people}
          initial={d.value}
          mode={d.mode}
          visitsInside={p.visitsInside(d.value)}
          onSave={(v) => p.saveTimeOff(v, d.id)}
          onRemove={d.id ? () => p.dispatch({ type: "time-off-remove", id: d.id! }) : undefined}
        />
      )}
      {d?.kind === "move" && (() => {
        const v = state.visits.find((b) => b.id === d.id)
        return v ? <ScheduleProtoMove key={v.id} p={p} visit={v} /> : null
      })()}
      <CalendarKeysHelp open={p.keys.helpOpen} onOpenChange={p.keys.setHelpOpen} />
    </>
  )
}
