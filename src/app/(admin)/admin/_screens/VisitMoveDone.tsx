"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { FormRow } from "@/components/blocks/FormRow"
import { Input } from "@/components/ui/input"
import { useUndoToast } from "@/components/blocks/UndoToast"
import { NOT_DONE_LABEL, NOT_DONE_REASONS, type NotDoneReason } from "@/lib/admin/visit-defaults"
import type { Visit } from "@/lib/admin/types"
import { FIELD } from "./CustomerPicker"
import type { VisitActions, Where } from "./visit-actions-types"
import { TIME_CHOICES, dayLabel, dayOfVisit, moveSentence } from "./visit-panel-model"

// Move and Not done: the routine actions of a visit (Done is the footer's Mark done, `VisitFooter`). Each is a footer button that opens
// ONE `ConfirmDialog`, acts at once and offers Undo for ten seconds (docs/UX_PATTERNS.md); a refusal shows in the API's words in the dialog.
// Move works by picking a day and a time here as well as by dragging on the Schedule, because a drag fails on a phone. Step 4 of the
// admin design replaces this Move with the split button and the open slots. Client component.

const dayAfter = (day: string) => new Date(Date.parse(`${day}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10)

interface Shown {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MoveDialog({ visit, today, actions, open, onOpenChange }: { visit: Visit; today: string; actions?: VisitActions } & Shown) {
  const [day, setDay] = useState(dayOfVisit(visit) ?? dayAfter(today))
  const [time, setTime] = useState(visit.startTime ?? "")
  const toast = useUndoToast()
  const move = async () => {
    if (!actions) return (console.info("move", visit.id, day, time), { ok: true as const })
    const out = await actions.move(visit.id, day, time || null)
    if (out.ok) toast(`Moved to ${dayLabel(day)}. `, async () => void (await actions.putBack(visit.id, out.data)))
    return out
  }
  const placed = Boolean(dayOfVisit(visit))
  return (
    <ConfirmDialog slot="visit-move" title={placed ? "Move" : "Give it a day"} message={day ? moveSentence(visit, day, time) : undefined} confirmLabel={placed ? "Move" : "Set the day"} confirmDisabled={!day} open={open} onOpenChange={onOpenChange} onConfirm={move}>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Day">
          <Input type="date" value={day} min={today} onChange={(e) => setDay(e.target.value)} className="min-h-11" />
        </FormRow>
        <FormRow label="Time">
          <select value={time} onChange={(e) => setTime(e.target.value)} className={FIELD}>
            <option value="">Any time</option>
            {TIME_CHOICES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </FormRow>
      </div>
    </ConfirmDialog>
  )
}

/** Not done: a reason, then it goes back to Unscheduled; the reason is kept. */
export function NotDoneDialog({ visit, actions, open, onOpenChange }: { visit: Visit; actions?: VisitActions } & Shown) {
  const [reason, setReason] = useState<NotDoneReason>("could-not-get-in")
  const [note, setNote] = useState("")
  const toast = useUndoToast()
  const submit = async () => {
    if (!actions) return (console.info("mark not done", visit.id, reason), { ok: true as const })
    const out = await actions.markNotDone(visit.id, reason, note.trim() || undefined)
    if (out.ok) toast("Marked not done. ", async () => void (await actions.putBack(visit.id, out.data as Where)))
    return out
  }
  return (
    <ConfirmDialog slot="visit-not-done" title="Not done" message="It goes back to Unscheduled, and the reason is kept." confirmLabel="Mark not done" open={open} onOpenChange={onOpenChange} onConfirm={submit}>
      <FormRow label="Why">
        <select value={reason} onChange={(e) => setReason(e.target.value as NotDoneReason)} className={FIELD}>
          {NOT_DONE_REASONS.map((r) => (
            <option key={r} value={r}>
              {NOT_DONE_LABEL[r]}
            </option>
          ))}
        </select>
      </FormRow>
      {reason === "other" && <Input aria-label="What happened" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened" className="min-h-11" />}
    </ConfirmDialog>
  )
}
