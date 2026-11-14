"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUndoToast } from "@/components/blocks/UndoToast"
import { NOT_DONE_LABEL, NOT_DONE_REASONS, type NotDoneReason } from "@/lib/admin/visit-defaults"
import type { Visit } from "@/lib/admin/types"
import type { PaidByInput, VisitActions, Where } from "./visit-actions-types"
import { FORM_STATUS, useRunner } from "./use-runner"
import { TIME_CHOICES, dayLabel, dayOfVisit, moveSentence } from "./visit-panel-model"

// Move, Done and Not done: the routine actions of a visit. They act at once and offer Undo for ten seconds
// (docs/UX_PATTERNS.md); a refusal shows in the API's words under the control. Move works by picking a day and
// a time here as well as by dragging on the Schedule, because a drag fails on a phone. Client component.

const FIELD = "min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
const LABEL = "mb-1 block text-sm font-medium text-foreground"
const ERROR = "text-destructive"

const dayAfter = (day: string) => new Date(Date.parse(`${day}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10)

export function MoveForm({ visit, today, actions, className }: { visit: Visit; today: string; actions?: VisitActions; className?: string }) {
  const [day, setDay] = useState(dayOfVisit(visit) ?? dayAfter(today))
  const [time, setTime] = useState(visit.startTime ?? "")
  const { pending, error, run } = useRunner()
  const toast = useUndoToast()
  const move = () => {
    if (!actions) return console.info("move", visit.id, day, time)
    run(
      () => actions.move(visit.id, day, time || null),
      (was) => toast(`Moved to ${dayLabel(day)}. `, async () => void (await actions.putBack(visit.id, was))),
    )
  }
  return (
    <section aria-labelledby="visit-move" className={className}>
      <h3 id="visit-move" className="font-display text-lg text-navy">
        {dayOfVisit(visit) ? "Move" : "Give it a day"}
      </h3>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="move-day" className={LABEL}>
            Day
          </label>
          <Input id="move-day" type="date" value={day} min={today} onChange={(e) => setDay(e.target.value)} className="min-h-11" />
        </div>
        <div>
          <label htmlFor="move-time" className={LABEL}>
            Time
          </label>
          <select id="move-time" value={time} onChange={(e) => setTime(e.target.value)} className={FIELD}>
            <option value="">Any time</option>
            {TIME_CHOICES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{day ? moveSentence(visit, day, time) : ""}</p>
      <Button type="button" className="mt-2 min-h-11" disabled={pending || !day} onClick={move}>
        {dayOfVisit(visit) ? "Move" : "Set the day"}
      </Button>
      <p role="alert" className={`${FORM_STATUS} ${ERROR} mt-1`}>
        {error}
      </p>
    </section>
  )
}

const METHODS: { value: PaidByInput["method"]; label: string }[] = [
  { value: "check", label: "Check" },
  { value: "venmo", label: "Venmo" },
  { value: "cash", label: "Cash" },
]

/** How the money came, once: Check, Venmo or Cash, an optional reference, and the amount when the visit has no price yet. */
export function PaidByChoice({ visit, onChoose, pending, label }: { visit: Visit; onChoose: (paid: PaidByInput) => void; pending: boolean; label: string }) {
  const [method, setMethod] = useState<PaidByInput["method"]>("check")
  const [reference, setReference] = useState("")
  const [amount, setAmount] = useState("")
  const unpriced = (visit.price ?? 0) === 0
  return (
    <fieldset className="mt-2">
      <legend className={LABEL}>Paid by</legend>
      <div className="flex flex-wrap gap-2">
        {METHODS.map((m) => (
          <label key={m.value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-input px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10">
            <input type="radio" name="paid-by" value={m.value} checked={method === m.value} onChange={() => setMethod(m.value)} className="size-4 accent-primary" />
            {m.label}
          </label>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="paid-reference" className={LABEL}>
            Reference (optional)
          </label>
          <Input id="paid-reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder={method === "check" ? "Check number" : method === "venmo" ? "@handle" : ""} className="min-h-11" />
        </div>
        {unpriced && (
          <div>
            <label htmlFor="paid-amount" className={LABEL}>
              Amount received
            </label>
            <Input id="paid-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="$" className="min-h-11" />
          </div>
        )}
      </div>
      <Button
        type="button"
        className="mt-2 min-h-11"
        disabled={pending}
        onClick={() => onChoose({ method, ...(reference.trim() ? { reference: reference.trim() } : {}), ...(unpriced && amount ? { amount: Number(amount) } : {}) })}
      >
        {label}
      </Button>
    </fieldset>
  )
}

/** Done: a pass visit or a visit with no price closes at once (the card is charged, or nothing is owed yet); a priced one-off asks how it was paid, once. */
export function DoneForm({ visit, today, actions }: { visit: Visit; today: string; actions?: VisitActions }) {
  const [day, setDay] = useState(today)
  const { pending, error, run } = useRunner()
  const toast = useUndoToast()
  const asks = !visit.passId && (visit.price ?? 0) > 0
  const done = (paidBy?: PaidByInput) => {
    if (!actions) return console.info("mark done", visit.id, paidBy)
    run(
      () => actions.markDone(visit.id, { ...(day !== today ? { completedOn: day } : {}), ...(paidBy ? { paidBy } : {}) }),
      () => toast(paidBy ? "Marked done and paid. " : "Marked done. ", async () => void (await actions.undoDone(visit.id))),
    )
  }
  return (
    <section aria-labelledby="visit-done">
      <h3 id="visit-done" className="font-display text-lg text-navy">
        Done
      </h3>
      <div className="mt-2 max-w-48">
        <label htmlFor="done-day" className={LABEL}>
          Done on
        </label>
        <Input id="done-day" type="date" value={day} max={today} onChange={(e) => setDay(e.target.value)} className="min-h-11" />
      </div>
      {asks ? (
        <PaidByChoice visit={visit} pending={pending} onChoose={done} label="Mark done and record payment" />
      ) : (
        <Button type="button" className="mt-2 min-h-11" disabled={pending} onClick={() => done()}>
          Mark done
        </Button>
      )}
      <p className="mt-1 text-sm text-muted-foreground">{visit.passId ? "Charges the card on the pass and sends the receipt." : asks ? "Sends the receipt, which says how it was paid." : ""}</p>
      <p role="alert" className={`${FORM_STATUS} ${ERROR}`}>
        {error}
      </p>
    </section>
  )
}

/** Not done: a reason, then it goes back to Needs a day; the reason is kept. */
export function NotDoneForm({ visit, actions }: { visit: Visit; actions?: VisitActions }) {
  const [reason, setReason] = useState<NotDoneReason>("could-not-get-in")
  const [note, setNote] = useState("")
  const { pending, error, run } = useRunner()
  const toast = useUndoToast()
  const submit = () => {
    if (!actions) return console.info("mark not done", visit.id, reason)
    run(
      () => actions.markNotDone(visit.id, reason, note.trim() || undefined),
      (was: Where) => toast("Marked not done. ", async () => void (await actions.putBack(visit.id, was))),
    )
  }
  return (
    <section aria-labelledby="visit-not-done">
      <h3 id="visit-not-done" className="font-display text-lg text-navy">
        Not done
      </h3>
      <label htmlFor="not-done-reason" className={`${LABEL} mt-2`}>
        Why
      </label>
      <select id="not-done-reason" value={reason} onChange={(e) => setReason(e.target.value as NotDoneReason)} className={FIELD}>
        {NOT_DONE_REASONS.map((r) => (
          <option key={r} value={r}>
            {NOT_DONE_LABEL[r]}
          </option>
        ))}
      </select>
      {reason === "other" && (
        <Input aria-label="What happened" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened" className="mt-2 min-h-11" />
      )}
      <Button type="button" variant="outline" className="mt-2 min-h-11" disabled={pending} onClick={submit}>
        Mark not done
      </Button>
      <p role="alert" className={`${FORM_STATUS} ${ERROR} mt-1`}>
        {error}
      </p>
    </section>
  )
}
