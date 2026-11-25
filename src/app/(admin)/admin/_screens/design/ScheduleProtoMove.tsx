"use client"

import { useState } from "react"
import { addDays } from "@/lib/admin/calendar"
import { firstNameOf } from "@/lib/admin/people"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { FormRow } from "@/components/blocks/FormRow"
import { dayShort } from "@/components/blocks/find-a-time-model"
import { clockWords, type GridBlock } from "@/components/blocks/time-grid-model"
import { mondayOf } from "./schedule-prototype-view"
import type { Proto } from "./use-schedule-prototype"

// The prototype's Move (docs/plans/2026-11-25-scheduler-design.md, 7.13): the way to move a visit without dragging. Day, Time (Any time or half hours) and Person, one Move button, no text
// option: a move texts no one. The place goes through the same check a drop does, so a clash asks "Move anyway?" next.

const SELECT = "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 md:text-sm"
const TIMES = Array.from({ length: 23 }, (_, i) => 7 * 60 + i * 30)

export function ScheduleProtoMove({ p, visit }: { p: Proto; visit: GridBlock }) {
  const [day, setDay] = useState(visit.day)
  const [time, setTime] = useState(visit.start === null ? "any" : String(visit.start))
  const [who, setWho] = useState(visit.personId)
  const week = mondayOf(visit.day)
  const days = Array.from({ length: 14 }, (_, i) => addDays(week, i)).filter((_, i) => i % 7 < 5)
  return (
    <ConfirmDialog
      title={`Move ${visit.title}`}
      open
      onOpenChange={(o) => !o && p.setDialog((d) => (d?.kind === "move" ? null : d))}
      confirmLabel="Move"
      slot="move-dialog"
      onConfirm={async () => {
        p.move(visit.id, { day, personId: who, start: time === "any" ? null : Number(time) })
        return { ok: true }
      }}
    >
      <div className="flex flex-col gap-4">
        <FormRow label="Day">
          <select value={day} onChange={(e) => setDay(e.target.value)} className={SELECT}>
            {days.map((d) => (
              <option key={d} value={d}>
                {dayShort(d)}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Time">
          <select value={time} onChange={(e) => setTime(e.target.value)} className={SELECT}>
            <option value="any">Any time</option>
            {TIMES.map((m) => (
              <option key={m} value={m}>
                {clockWords(m)}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Person">
          <select value={who} onChange={(e) => setWho(e.target.value)} className={SELECT}>
            {p.people.map((x) => (
              <option key={x.id} value={x.id}>
                {firstNameOf(x.name) ?? x.name}
              </option>
            ))}
          </select>
        </FormRow>
      </div>
    </ConfirmDialog>
  )
}
