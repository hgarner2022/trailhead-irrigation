/**
 * The pure derivations behind PassesScreen: the header's context line, the
 * consent line in the panel, and the charge rows the panel lists for one
 * pass. Kept out of the screen so they can be unit tested. Timestamps are
 * read as their calendar day in Mountain time (`TIME_ZONE`).
 */
import type { Consent, Pass, PassStatus, PassVisit } from "@/lib/admin/types"
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

const CHANNEL_WORDS: Record<Consent["marketingChannels"][number], string> = { email: "email", sms: "text" }

/**
 * "Terms 2026-11 accepted Nov 12. Marketing: email and text." or
 * "Marketing: no."; "No consent recorded." when the pass has none.
 */
export function consentLine(consent: Consent | undefined): string {
  if (!consent) return "No consent recorded."
  const terms = consent.termsAcceptedAt ? `Terms ${consent.termsVersion ?? ""} accepted ${shortDate(consent.termsAcceptedAt, TIME_ZONE)}. `.replace("  ", " ") : ""
  const channels = consent.marketingChannels.map((c) => CHANNEL_WORDS[c])
  const marketing = consent.marketingOptIn && channels.length ? channels.join(" and ") : "no"
  return `${terms}Marketing: ${marketing}.`
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
