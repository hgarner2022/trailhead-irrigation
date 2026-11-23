"use client"

import { useId } from "react"
import { TimingChoice } from "@/components/blocks/TimingChoice"
import type { TimingPreference } from "@/lib/admin/types"
import type { PassVisitPlan } from "@/lib/booking/pass-visits"
import { SCHEDULE_NOTE, SCHEDULE_NOTE_EACH } from "@/lib/booking/pass-words"
import { visitName } from "./booking-pass-model"

// The preference step of a Season Pass, for each visit that is months away (the next-season turn-on, a blowout bought in the spring): Our recommended (pressed), Early season or Late season, by name
// only, with no dates and no months under them (Hannah, Nov 22 2026). The step's heading names what is being booked ("Fall blowout"), and one plain line says when it is scheduled. A day is never asked
// for a visit this far out, and a visit next season is asked here too, because the preference is kept for every season. Pure props.

/** The step's heading: the visit by name, or "Preferences" when there are two. */
export const preferenceQuestion = (visits: readonly PassVisitPlan[]) => (visits.length === 1 ? visitName(visits[0]!) : "Preferences")

function Group({ visit, value, onChange, single }: { visit: PassVisitPlan; value: TimingPreference; onChange: (p: TimingPreference) => void; single: boolean }) {
  const id = useId()
  return (
    // A single visit is named by the step's own heading and the choice group's label, so it is a plain block; two visits are each a region named by their own heading.
    <div role={single ? undefined : "region"} aria-labelledby={single ? undefined : id} data-slot="preference-group" data-kind={visit.kind}>
      {!single && (
        <h2 id={id} className="mb-4 font-display text-3xl leading-[1.05] text-navy">
          {visitName(visit)}
        </h2>
      )}
      <TimingChoice kind={visit.kind} label={`${visitName(visit)}, preferred time`} value={value} onChange={onChange} plain />
    </div>
  )
}

export function PreferenceGroups({ visits, prefs, onPref }: { visits: readonly PassVisitPlan[]; prefs: Record<string, TimingPreference>; onPref: (kind: string, p: TimingPreference) => void }) {
  return (
    <div data-slot="preference-groups" className="space-y-8">
      {visits.map((v) => (
        <Group key={v.kind} visit={v} value={prefs[v.kind] ?? "recommended"} onChange={(p) => onPref(v.kind, p)} single={visits.length === 1} />
      ))}
      <p data-slot="preference-note" className="text-base text-foreground">
        {visits.length === 1 ? SCHEDULE_NOTE : SCHEDULE_NOTE_EACH}
      </p>
    </div>
  )
}
