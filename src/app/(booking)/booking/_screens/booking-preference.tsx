"use client"

import { useId } from "react"
import { TimingChoice } from "@/components/blocks/TimingChoice"
import type { TimingPreference } from "@/lib/admin/types"
import type { PassVisitPlan } from "@/lib/booking/pass-visits"
import { preferenceDates, rangeWords } from "@/lib/booking/pass-visits"
import { PREFERENCE_KEPT, SCHEDULE_NOTE, SCHEDULE_NOTE_EACH } from "@/lib/booking/pass-words"
import { TIMING_PREFERENCES } from "@/lib/admin/format"

// The preference step of a Season Pass, for each visit that is months away (the next-season turn-on, a blowout bought in the spring): Early, Mid or Late in that visit's window with the window's real
// dates, Mid pressed (the checkout's "recommended"). The step's question names what is being booked ("Your fall blowout"), and one plain line under it says when it is scheduled; the freeze sentence
// and the reason line are gone (Hannah, Nov 21 2026). A day is never asked for a visit this far out (Nov 20 2026), and a visit next season is asked here too, because the preference is kept for every season (Nov 21 2026). Pure props.

export const VISIT_HEADINGS: Record<PassVisitPlan["kind"], string> = { "turn-on": "Your spring turn-on", blowout: "Your fall blowout" }

/** "Your fall blowout", or "Your 2028 spring turn-on" for a visit that belongs to next season. */
export const visitHeading = (v: Pick<PassVisitPlan, "kind" | "season" | "nextSeason">) => (v.nextSeason ? `Your ${v.season} ${VISIT_HEADINGS[v.kind].slice(5)}` : VISIT_HEADINGS[v.kind])

/** The step's question: the visit by name, or both of them. */
export const preferenceQuestion = (visits: readonly PassVisitPlan[]) => (visits.length === 1 ? visitHeading(visits[0]!) : "Your spring turn-on and fall blowout")

function Group({ visit, value, onChange, single }: { visit: PassVisitPlan; value: TimingPreference; onChange: (p: TimingPreference) => void; single: boolean }) {
  const id = useId()
  const dates = preferenceDates(visit)
  const ranges = Object.fromEntries(TIMING_PREFERENCES.map((p) => [p, rangeWords(dates[p])])) as Record<TimingPreference, string>
  return (
    // A single visit is named by the step's own heading and the choice group's label, so it is a plain block; two visits are each a region named by their own heading.
    <div role={single ? undefined : "region"} aria-labelledby={single ? undefined : id} data-slot="preference-group" data-kind={visit.kind}>
      {!single && (
        <h2 id={id} className="mb-4 font-display text-3xl leading-[1.05] text-navy">
          {visitHeading(visit)}
        </h2>
      )}
      <TimingChoice kind={visit.kind} label={visitHeading(visit)} value={value} onChange={onChange} ranges={ranges} />
    </div>
  )
}

export function PreferenceGroups({ visits, prefs, onPref }: { visits: readonly PassVisitPlan[]; prefs: Record<string, TimingPreference>; onPref: (kind: string, p: TimingPreference) => void }) {
  return (
    <div data-slot="preference-groups" className="space-y-10">
      <p data-slot="preference-note" className="text-base text-foreground">
        {visits.length === 1 ? SCHEDULE_NOTE : SCHEDULE_NOTE_EACH} {PREFERENCE_KEPT}
      </p>
      {visits.map((v) => (
        <Group key={v.kind} visit={v} value={prefs[v.kind] ?? "recommended"} onChange={(p) => onPref(v.kind, p)} single={visits.length === 1} />
      ))}
    </div>
  )
}
