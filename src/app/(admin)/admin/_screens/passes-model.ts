/**
 * The pure derivations behind PassesScreen: the header's context line, the
 * week label the filter chips and the panel share, and the charge rows the
 * panel lists for one pass. Kept out of the screen so they can be unit
 * tested. Timestamps are read as their calendar day in Mountain time
 * (`TIME_ZONE`); date-only strings, like the week's Monday, never shift.
 */
import type { Pass, PassStatus, PassVisit } from "@/lib/admin/types"
import { TIME_ZONE, shortDate } from "@/lib/admin/format"
import { statusLabel } from "@/components/blocks/StatusPill"

const STATUS_ORDER: PassStatus[] = ["active", "cancelled", "lapsed"]

export const VISIT_NAMES: Record<PassVisit["kind"], string> = { "turn-on": "Turn-on", inspection: "Inspection", blowout: "Blowout" }

/** The season the passes belong to: the latest one on hand, or undefined with no passes. */
export function seasonOf(passes: Pass[]): number | undefined {
  return passes.length ? Math.max(...passes.map((p) => p.season)) : undefined
}

/** "11 active, 1 cancelled. 2027 season." Only the statuses that occur are named; "No passes yet." with none. */
export function passesContext(passes: Pass[]): string {
  const season = seasonOf(passes)
  if (season === undefined) return "No passes yet."
  const counts = STATUS_ORDER.map((status) => [status, passes.filter((p) => p.status === status).length] as const)
    .filter(([, n]) => n > 0)
    .map(([status, n]) => `${n} ${statusLabel(status).toLowerCase()}`)
  return `${counts.join(", ")}. ${season} season.`
}

/** "Week of Oct 4" from the week's Monday. */
export function weekLabel(iso: string): string {
  return `Week of ${shortDate(iso)}`
}

/** The blowout weeks the passes use, soonest first, as filter options labelled "Oct 4". */
export function weekOptions(passes: Pass[]): { value: string; label: string }[] {
  return [...new Set(passes.map((p) => p.blowoutWeek))].sort().map((week) => ({ value: week, label: shortDate(week) }))
}

export interface ChargeRow {
  kind: PassVisit["kind"]
  name: string
  /** the booked date as "Apr 20", else the window */
  when: string
  amount: number
  /** "Charged Apr 20" or "Not yet" */
  charged: string
}

/** One row per visit on the pass: its name, when it is or was, its amount and whether it has been charged. */
export function chargeRows(pass: Pass): ChargeRow[] {
  return pass.visits.map((visit) => ({
    kind: visit.kind,
    name: VISIT_NAMES[visit.kind],
    when: visit.scheduledAt ? shortDate(visit.scheduledAt, TIME_ZONE) : visit.window,
    amount: visit.amount,
    charged: visit.chargedAt ? `Charged ${shortDate(visit.chargedAt, TIME_ZONE)}` : "Not yet",
  }))
}
