"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Person, Visit } from "@/lib/admin/types"
import { dayLabel, dayOf, weekDays } from "@/lib/admin/calendar"
import { KIND_WORDS } from "@/lib/admin/format"

// The way to move a visit without dragging: with a visit selected, pick a
// person and a day of the visible week and press Move. It calls the same
// `onMove` the grid's drop does, so the keyboard and a phone reach the same
// reducer. A day the person does not work is offered anyway; the refusal
// is read out in the screen's status line, which says why.

export interface ScheduleMoveToProps {
  visit: Visit
  people: Person[]
  weekStart: string
  timeZone: string
  onMove: (visitId: string, personId: string, dayIso: string) => void
}

export function ScheduleMoveTo({ visit, people, weekStart, timeZone, onMove }: ScheduleMoveToProps) {
  const [personId, setPersonId] = useState(visit.personId ?? people[0]?.id ?? "")
  const [day, setDay] = useState(dayOf(visit.startAt!, timeZone))
  return (
    <section data-slot="schedule-move-to" aria-label="Move the selected visit" className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3">
      <p className="w-full text-sm font-medium text-foreground sm:w-auto sm:pb-2">{`Move ${visit.clientName}, ${KIND_WORDS[visit.kind]}`}</p>
      <div className="grid gap-1.5">
        <Label htmlFor="move-person">Who</Label>
        <Select value={personId} onValueChange={setPersonId}>
          <SelectTrigger id="move-person" aria-label="Move to person" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {people.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="move-day">Day</Label>
        <Select value={day} onValueChange={setDay}>
          <SelectTrigger id="move-day" aria-label="Move to day" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {weekDays(weekStart).map((d) => (
              <SelectItem key={d} value={d}>
                {dayLabel(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button variant="outline" onClick={() => onMove(visit.id, personId, day)}>
        Move
      </Button>
    </section>
  )
}
