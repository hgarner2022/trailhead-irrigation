import { StatusPill } from "@/components/blocks/StatusPill"
import { PreferenceDialog } from "@/components/blocks/PreferenceDialog"
import type { Pass, TimingPreference } from "@/lib/admin/types"
import { preferenceOf } from "@/lib/admin/format"
import { SCHEDULE_NOTE } from "@/lib/booking/pass-words"
import type { BookedTimes } from "@/lib/portal/booked-time"
import { AddToCalendar } from "./AddToCalendar"
import { bookedWhen, canChange, visitLineInfo, visitRows } from "./pass-page-model"

// The pass's visits, one row each, for the pass page and Home (docs/plans/2026-11-20-season-pass-booking-research.md): a visit with a day reads its day and exact time (the next visit); a visit that is
// months away reads "Preference: Mid October" and "We'll schedule it about two weeks before and tell you the day." with a Change control until its day is set. The state pill is Done, Booked or Preferred.
// Only the Season Pass tab lists these rows: Home shows the pass card and its timeline, never this list (Hannah, Nov 21 2026). Server component; the dialog carries its own client boundary.

export interface PassVisitRowsProps {
  pass: Pass
  onChangePreference?: (kind: "turn-on" | "blowout", preference: TimingPreference) => void
  /** the booked start of each visit by visit id ("10:30"), for the exact time */
  times?: BookedTimes
}

export function PassVisitRows({ pass, onChangePreference, times }: PassVisitRowsProps) {
  const rows = visitRows(pass)
  return (
    <ul data-slot="pass-visit-rows" className="divide-y divide-border">
      {pass.visits.map((visit) => {
        const row = rows.find((r) => r.kind === visit.kind)!
        const info = visitLineInfo(visit)
        const changeable = canChange(visit)
        const preference = changeable ? preferenceOf(pass, visit.kind) : null
        return (
          <li key={row.kind} data-slot="pass-visit-row" className="flex flex-wrap items-center gap-3 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold text-foreground">
                {row.name}
                <span className="font-normal text-muted-foreground">{` · ${info.price}`}</span>
              </span>
              <span className="block text-sm text-muted-foreground">{bookedWhen(visit, visit.id ? times?.[visit.id] : undefined) ?? row.when}</span>
              {preference && (
                <span data-slot="schedule-note" className="block text-sm text-muted-foreground">
                  {SCHEDULE_NOTE}
                </span>
              )}
              {info.description && <span className="block text-sm text-muted-foreground">{info.description}</span>}
            </span>
            {preference && canChange(visit) && <PreferenceDialog kind={visit.kind} value={preference} onSave={onChangePreference} />}
            <StatusPill status={row.status} label={row.label} />
            {<AddToCalendar pass={pass} visit={visit} name={row.name} />}
          </li>
        )
      })}
    </ul>
  )
}
