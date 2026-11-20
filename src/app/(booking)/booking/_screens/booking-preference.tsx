"use client"

import { useId } from "react"
import { TimingChoice } from "@/components/blocks/TimingChoice"
import type { TimingPreference } from "@/lib/admin/types"
import type { PassVisitPlan } from "@/lib/booking/pass-visits"
import { preferenceDates, rangeWords } from "@/lib/booking/pass-visits"
import { SCHEDULE_NOTE } from "@/lib/booking/pass-words"
import { TIMING_PREFERENCES } from "@/lib/admin/format"

// The "When would you like it?" step of a Season Pass: for each visit that is months away (the next-season turn-on, a blowout bought in the spring), Early, Mid or Late in that visit's window with the
// window's real dates, Mid pressed (the checkout's "recommended"), and one line saying when it is scheduled. A day is never asked for a visit this far out (Hannah, Nov 20 2026). Pure props.

export const VISIT_HEADINGS: Record<PassVisitPlan["kind"], string> = { "turn-on": "Your spring turn-on", blowout: "Your fall blowout" }

function Group({ visit, value, onChange, single }: { visit: PassVisitPlan; value: TimingPreference; onChange: (p: TimingPreference) => void; single: boolean }) {
  const id = useId()
  const dates = preferenceDates(visit)
  const ranges = Object.fromEntries(TIMING_PREFERENCES.map((p) => [p, rangeWords(dates[p])])) as Record<TimingPreference, string>
  return (
    <section aria-labelledby={id} data-slot="preference-group" data-kind={visit.kind}>
      <h2 id={id} className={single ? "sr-only" : "mb-4 font-display text-3xl leading-[1.05] text-navy"}>
        {VISIT_HEADINGS[visit.kind]}
      </h2>
      <TimingChoice kind={visit.kind} labelledBy={id} value={value} onChange={onChange} ranges={ranges} />
      <p data-slot="preference-note" className="mt-3 text-base text-foreground">
        {SCHEDULE_NOTE}
      </p>
    </section>
  )
}

export function PreferenceGroups({ visits, prefs, onPref }: { visits: readonly PassVisitPlan[]; prefs: Record<string, TimingPreference>; onPref: (kind: string, p: TimingPreference) => void }) {
  return (
    <div data-slot="preference-groups" className="space-y-10">
      {visits.map((v) => (
        <Group key={v.kind} visit={v} value={prefs[v.kind] ?? "recommended"} onChange={(p) => onPref(v.kind, p)} single={visits.length === 1} />
      ))}
    </div>
  )
}
