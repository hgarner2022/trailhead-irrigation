"use client"

import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "radix-ui"
import { ConfirmDialog } from "./ConfirmDialog"
import { FormRow } from "./FormRow"
import { NOTE_MAX, TIME_CHOICES, timeOffProblems, type TimeOffValue } from "./time-off-model"

// Time off for a person (docs/plans/2026-11-25-scheduler-design.md, 7.9): whole days or blocked hours. Opened from a person's row in Settings, People (the Person field is not drawn); the Schedule only draws the band. Nothing is offered or booked into it. Visits already inside the span are listed ("2 visits are inside this time. They stay where they
// are.") and never moved by saving. In edit mode there is Remove. A ConfirmDialog with its own footer because Remove is a third answer. Pure props: the screen owns what Save does. Client component.

export type { TimeOffValue } from "./time-off-model"

export interface TimeOffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** the people who may be chosen; a tech sees only themselves */
  people: readonly { id: string; name: string }[]
  /** the span to start from: a drag, a day header, or the saved time off */
  initial: TimeOffValue
  mode?: "add" | "edit"
  /** visits that fall inside the span as it stands, "Cassie, Erie" */
  visitsInside?: readonly { id: string; label: string }[]
  onSave: (value: TimeOffValue) => void | Promise<void>
  onRemove?: () => void | Promise<void>
  /** opens the Move dialog for the visits inside; the button is drawn only when this is given */
  onMoveThem?: () => void
  /** the person is fixed (opened from that person's row in Settings, People): the Person field is not drawn */
  hidePerson?: boolean
}

const SELECT = "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 md:text-sm"

export function TimeOffDialog({ open, onOpenChange, people, initial, mode = "add", visitsInside = [], onSave, onRemove, onMoveThem, hidePerson }: TimeOffDialogProps) {
  return (
    <ConfirmDialog title="Time off" open={open} onOpenChange={onOpenChange} actions="none" size="md" slot="time-off-dialog">
      <Form hidePerson={hidePerson} people={people} initial={initial} mode={mode} visitsInside={visitsInside} onSave={onSave} onRemove={onRemove} onMoveThem={onMoveThem} onDone={() => onOpenChange(false)} />
    </ConfirmDialog>
  )
}

function Form({ people, initial, mode, visitsInside, onSave, onRemove, onMoveThem, onDone, hidePerson }: Pick<TimeOffDialogProps, "people" | "initial" | "visitsInside" | "onSave" | "onRemove" | "onMoveThem" | "hidePerson"> & { mode: "add" | "edit"; onDone: () => void }) {
  const uid = useId()
  const [v, setV] = useState(initial)
  const [tried, setTried] = useState(false)
  const set = <K extends keyof TimeOffValue>(key: K, value: TimeOffValue[K]) => setV((x) => ({ ...x, [key]: value }))
  const problems = timeOffProblems(v)
  const bad = Object.keys(problems).length > 0
  const inside = visitsInside ?? []
  const save = async () => {
    setTried(true)
    if (bad) return
    await onSave(v)
    onDone()
  }
  return (
    <>
      <div className="flex flex-col gap-4">
        {!hidePerson && <FormRow label="Person">
          <select value={v.personId} onChange={(e) => set("personId", e.target.value)} disabled={people.length < 2} className={SELECT}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </FormRow>}
        <FormRow label="All day">
          <Switch.Root
            checked={v.allDay}
            onCheckedChange={(c) => set("allDay", c)}
            data-slot="switch"
            className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent outline-none transition-colors before:absolute before:-inset-y-2.5 before:inset-x-0 before:content-[''] focus-visible:ring-2 focus-visible:ring-primary/50 data-[state=checked]:bg-primary-dark data-[state=unchecked]:bg-muted"
          >
            <Switch.Thumb className="pointer-events-none block size-5 rounded-full bg-background shadow-sm transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5" />
          </Switch.Root>
        </FormRow>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="From" error={tried ? problems.from : undefined}>
            <Input type="date" value={v.from} onChange={(e) => set("from", e.target.value)} className="min-h-11" />
          </FormRow>
          <FormRow label="To" error={tried ? problems.to : undefined}>
            <Input type="date" value={v.to} min={v.from} onChange={(e) => set("to", e.target.value)} className="min-h-11" />
          </FormRow>
        </div>
        {!v.allDay && (
          <FormRow label="Times" htmlFor={`${uid}-start`} error={tried ? problems.endTime : undefined}>
            <div data-slot="time-off-times" className="flex items-center gap-2">
              <select id={`${uid}-start`} aria-label="Start time" value={v.startTime} onChange={(e) => set("startTime", e.target.value)} className={SELECT}>
                {TIME_CHOICES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <span className="text-sm text-muted-foreground">to</span>
              <select aria-label="End time" value={v.endTime} onChange={(e) => set("endTime", e.target.value)} className={SELECT}>
                {TIME_CHOICES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </FormRow>
        )}
        <FormRow label="Note" hint="Staff only">
          <Input value={v.note} maxLength={NOTE_MAX} onChange={(e) => set("note", e.target.value)} className="min-h-11" />
        </FormRow>
        {inside.length > 0 && (
          <div data-slot="time-off-inside" role="status" className="rounded-lg border border-warning/40 bg-warning/14 px-3 py-2 text-sm text-warning-ink">
            <p className="font-medium">{`${inside.length} ${inside.length === 1 ? "visit is" : "visits are"} inside this time. ${inside.length === 1 ? "It stays" : "They stay"} where ${inside.length === 1 ? "it is" : "they are"}.`}</p>
            <p>{inside.map((x) => x.label).join(", ")}</p>
            {onMoveThem && (
              <Button type="button" size="sm" variant="ghost" className="-ml-3 min-h-11 font-semibold text-warning-ink hover:bg-warning/14 hover:text-warning-ink" onClick={onMoveThem}>
                Move them
              </Button>
            )}
          </div>
        )}
      </div>
      <DialogFooter>
        {mode === "edit" && onRemove && (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto"
            onClick={async () => {
              await onRemove()
              onDone()
            }}
          >
            Remove
          </Button>
        )}
        <Button type="button" variant="outline" className="min-h-11" onClick={onDone}>
          Cancel
        </Button>
        <Button type="button" className="min-h-11" onClick={save}>
          {mode === "edit" ? "Save" : "Add time off"}
        </Button>
      </DialogFooter>
    </>
  )
}
