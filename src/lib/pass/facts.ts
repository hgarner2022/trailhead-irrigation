// What a Season Pass is, read from the facts and never typed: its status from the job's sold day and cancellation, its inspection
// from the lines, its timing preferences from the visits. Pure: no database, no React.
import { LINE_NAMES } from "@/lib/jobs/lines"
import { currentSeason } from "./season"

export { currentSeason }

export type PassStatusValue = "pending" | "active" | "cancelled" | "lapsed"
export type PassPreference = "earlier" | "recommended" | "later"

export interface PassJobFacts {
  /** the Mountain day the pass was sold; empty while the checkout's card step is not finished */
  soldOn: string | null
  cancelledAt: Date | null
  season: number | null
}

/**
 * Cancelled (the job's `cancelled_at`), pending (not sold yet), lapsed once the season's year is over, else active. A season runs to the end of
 * its calendar year even though `currentSeason` rolls on November 1 (the renewal sale): a pass bought for 2026 is still active on
 * November 17, with its blowout window open until the 15th and "Reserve next season" on its page.
 * `today` is the Mountain day string (`YYYY-MM-DD`).
 */
export function passStatus(job: PassJobFacts, today: string): PassStatusValue {
  if (job.cancelledAt) return "cancelled"
  if (!job.soldOn) return "pending"
  if (job.season !== null && job.season < Number(today.slice(0, 4))) return "lapsed"
  return "active"
}

/** The July inspection is on the pass when a live line is the inspection, by its name or by the band it was priced from. */
export function passInspection(lines: readonly { name: string; serviceId: string | null; cancelledAt: Date | null }[]): boolean {
  return lines.some((l) => !l.cancelledAt && (l.name === LINE_NAMES.inspection || (l.serviceId?.startsWith("inspection-") ?? false)))
}

/** The timing the customer asked for, from the turn-on visit and the blowout visit. */
export function passPreferences(visits: readonly { kind: string; preference: PassPreference | null }[]): { turnOnPreference: PassPreference; blowoutPreference: PassPreference } {
  const of = (kind: string): PassPreference => visits.find((v) => v.kind === kind)?.preference ?? "recommended"
  return { turnOnPreference: of("turn-on"), blowoutPreference: of("blowout") }
}
