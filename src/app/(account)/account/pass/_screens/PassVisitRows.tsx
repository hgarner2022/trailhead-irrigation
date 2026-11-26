import { StatusPill } from "@/components/blocks/StatusPill"
import { TimingDialog } from "@/components/blocks/PreferenceAsk"
import type { Pass, TimingPreference } from "@/lib/admin/types"
import { preferenceOf } from "@/lib/admin/format"
import type { BookedTimes } from "@/lib/portal/booked-time"
import { TIMING_NEXT, type TimingKind } from "@/lib/portal/preference-words"
import { AddToCalendar } from "./AddToCalendar"
import { bookedWhen, canChange, visitLineInfo, visitRows } from "./pass-page-model"

// The plan's lines, one per visit the pass holds, for the Season Pass tab: what the plan includes and where each one stands (docs/plans/2026-11-19-customer-side-design.md, "Account structure (Nov 22 2026)").
// A visit with a day reads its day and exact time; one that is done reads when; one with no day yet reads the customer's timing ("Preference: Our recommended, mid October") with a Change link until
// its day is set. These are plan lines, not visit rows: no money word, no receipt (those are the Visits tab's) and no description of what the visit includes (the visit's own page has it), and the sentence about when we schedule is said once under the list, not on every
// line. The state pill is Done or Booked; a visit still waiting on a day has none, because its preference line already says so. Server component; the dialog carries its own client boundary.

export interface PassVisitRowsProps {
  pass: Pass
  onChangePreference?: (kind: TimingKind, preference: TimingPreference) => void | Promise<unknown>
  /** the booked start of each visit by visit id ("10:30"), for the exact time */
  times?: BookedTimes
  /** the sentence about when we schedule under the list; left off while the banner above says it */
  note?: boolean
}

export function PassVisitRows({ pass, onChangePreference, times, note = true }: PassVisitRowsProps) {
  const rows = visitRows(pass)
  const asking = pass.visits.some((v) => canChange(v))
  return (
    <div data-slot="pass-visit-list" className="space-y-3">
      <ul data-slot="pass-visit-rows" className="divide-y divide-border">
        {pass.visits.map((visit) => {
          const row = rows.find((r) => r.kind === visit.kind)!
          const info = visitLineInfo(visit)
          const changeable = canChange(visit)
          const preference = changeable ? preferenceOf(pass, visit.kind) : null
          const when = bookedWhen(visit, visit.id ? times?.[visit.id] : undefined) ?? row.when
          return (
            <li key={row.kind} data-slot="pass-visit-row" className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3">
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-4">
                  <span className="type-item font-semibold text-foreground">{row.name}</span>
                  <span className="sr-only">{" · "}</span>
                  <span className="type-value text-foreground">{info.price}</span>
                </span>
                {when !== row.label && <span className="block type-meta text-muted-foreground">{when}</span>}
              </span>
              <span className="flex flex-wrap items-center gap-3">
                {preference && canChange(visit) && <TimingDialog kind={visit.kind} value={preference} onSave={onChangePreference} />}
                {row.label !== "Preferred" && <StatusPill status={row.status} label={row.label} />}
                <AddToCalendar pass={pass} visit={visit} name={row.name} />
              </span>
            </li>
          )
        })}
      </ul>
      {asking && note && (
        <p data-slot="schedule-note" className="text-sm text-muted-foreground">
          {TIMING_NEXT}
        </p>
      )}
    </div>
  )
}
