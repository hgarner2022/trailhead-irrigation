"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { FormRow } from "@/components/blocks/FormRow"
import { SplitButton } from "@/components/blocks/SplitButton"
import { useUndoToast } from "@/components/blocks/UndoToast"
import { Input } from "@/components/ui/input"
import { withinCutoffOn } from "@/lib/portal/change-day"
import type { Visit } from "@/lib/admin/types"
import { FIELD } from "./CustomerPicker"
import type { VisitActions } from "./visit-actions-types"
import { TIME_CHOICES, dayLabel, dayOfVisit, moveSentence } from "./visit-panel-model"

// Move: the one dialog behind the visit panel's Move and a drop on the Schedule that would move a promised time. Its button is split
// (docs/plans/2026-11-18-admin-holistic-design.md 5.2): "Move and text the customer" is primary and "Move without texting" sits under the
// caret, off for a visit with a booked time, which always texts. One optional line from Ryan goes in the text. A property that must be home is
// asked "Reply YES or pick another day" and the visit reads Waiting on customer. A move inside the customer's 24-hour window warns and goes
// through (it is the office's call). Until the slots of step 7 it offers the day and the half-hour starts as before. A visit with no day
// yet is placed, not moved: one plain "Set the day" that texts the date, as it always did. Client component.

const dayAfter = (day: string) => new Date(Date.parse(`${day}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
const NOTE_MAX = 140

export interface MoveTarget {
  day?: string
  personId?: string
  /** the person's name, said in the dialog when a drop chose another person */
  personName?: string
}

export interface MoveDialogProps {
  visit: Visit
  today: string
  actions?: VisitActions
  open: boolean
  onOpenChange: (open: boolean) => void
  /** where a drop on the Schedule landed */
  target?: MoveTarget
  /** the move went through (the Schedule shows the visit where it went) */
  onMoved?: (day: string, personId: string | undefined) => void
}

export function MoveDialog({ visit, today, actions, open, onOpenChange, target, onMoved }: MoveDialogProps) {
  const placed = Boolean(dayOfVisit(visit))
  const [day, setDay] = useState(target?.day ?? dayOfVisit(visit) ?? dayAfter(today))
  // A pass visit's start time is only the stack its day was ordered in: it is offered back as a time only when it was booked.
  const startTime = visit.timeBooked ? (visit.startTime ?? "") : ""
  const [time, setTime] = useState(startTime)
  const [note, setNote] = useState("")
  const toast = useUndoToast()
  const first = visit.clientName.split(" ")[0]
  const booked = Boolean(visit.timeBooked)
  const current = dayOfVisit(visit)
  // a move that changes nothing is a no-op: both buttons wait until the day, the time or the person differs from the visit's
  const unchanged = placed && day === current && time === startTime && (!target?.personId || target.personId === visit.personId)
  // the customer can no longer change a day online from the day before it: the old day, or the new one, is inside that window
  const locked = placed && (withinCutoffOn(current, today) || withinCutoffOn(day, today))
  const asks = placed && Boolean(visit.property?.mustBeHome)

  const move = async (variant?: string) => {
    const notify = variant !== "quiet"
    if (!actions) return (console.info("move", visit.id, day, time, notify), onMoved?.(day, target?.personId), { ok: true as const })
    const out = await actions.move(visit.id, day, time || null, { ...(target?.personId ? { personId: target.personId } : {}), notify, ...(notify && note.trim() ? { note: note.trim() } : {}) })
    if (out.ok) {
      toast(`Moved to ${dayLabel(day)}${notify ? "" : ", no text sent"}. `, async () => void (await actions.putBack(visit.id, out.data)))
      onMoved?.(day, target?.personId)
    }
    return out
  }
  return (
    <ConfirmDialog
      slot="visit-move"
      title={placed ? "Move" : "Schedule"}
      message={day ? moveSentence(visit, day, time, placed) : undefined}
      confirmLabel={placed ? undefined : "Schedule"}
      confirmDisabled={!day}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={move}
      renderConfirm={
        placed
          ? ({ confirm, pending }) => (
              <SplitButton
                label="Move and text the customer"
                menuLabel="More ways to move"
                disabled={pending || !day || unchanged}
                onClick={() => confirm("text")}
                menu={[{ label: "Move without texting", disabled: booked || note.trim() !== "", onSelect: () => confirm("quiet") }]}
              />
            )
          : undefined
      }
    >
      {target?.personName && <p className="text-sm text-muted-foreground">{`With ${target.personName}.`}</p>}
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
      {placed && (
        <FormRow label="A line for the text" hint="Optional. It goes after the new day.">
          <Input value={note} maxLength={NOTE_MAX} onChange={(e) => setNote(e.target.value)} placeholder="Rain on Tuesday" className="min-h-11" />
        </FormRow>
      )}
      {booked && placed && <p data-slot="move-note" className="text-sm text-muted-foreground">{`${first} was given a time, so the customer is always texted when it moves.`}</p>}
      {asks && <p data-slot="move-asks" className="text-sm text-muted-foreground">{`${first} needs to be home, so the text asks them to reply YES or pick another day. The visit reads Waiting on customer until they answer.`}</p>}
      {locked && (
        <p role="status" data-slot="move-lock" className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
          {`This is inside ${first}'s 24-hour window, so they can no longer change the day online. Your text is how they find out. Moving it is your call.`}
        </p>
      )}
    </ConfirmDialog>
  )
}
