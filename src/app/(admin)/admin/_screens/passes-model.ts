/**
 * The pure derivations behind PassesScreen: the header's context line, the
 * consent line in the panel, and the job and charge rows the panel lists for
 * one pass. Kept out of the screen so they can be unit tested. Every day and
 * window is read off the visit row (`scheduledOn`, `startTime`), never off a
 * preference, and every state comes from `src/lib/admin/jobs.ts`.
 * Timestamps are read as their calendar day in Mountain time (`TIME_ZONE`).
 */
import type { Consent, Pass, PassStatus, PassVisit } from "@/lib/admin/types"
import { TIME_ZONE, fullName, shortDate } from "@/lib/admin/format"
import { dayOf } from "@/lib/admin/calendar"
import { dayWords, passVisitJob, type Job } from "@/lib/admin/jobs"
import { statusLabel } from "@/components/blocks/StatusPill"

const STATUS_ORDER: PassStatus[] = ["active", "pending", "cancelled", "lapsed"]

export const VISIT_NAMES: Record<PassVisit["kind"], string> = { "turn-on": "Turn-on", inspection: "Inspection", blowout: "Blowout" }

/** The one-line note a pending pass carries in the panel. */
export const PENDING_NOTE = "Unpaid attempt, expires after an hour."

/** "Hannah Garner", or the first name alone where no last name is on record. */
export const passName = (pass: Pick<Pass, "firstName" | "lastName">) => fullName(pass.firstName, pass.lastName)

/** The season the passes belong to: the latest one on hand, or undefined with no passes. */
export function seasonOf(passes: Pass[]): number | undefined {
  return passes.length ? Math.max(...passes.map((p) => p.season)) : undefined
}

/** "6 active, 5 pending, 1 cancelled. 2027 season." Only the statuses that occur are named; "No passes yet." with none. */
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

/** A visit's day and window for a table cell or a line: "Apr 26", "Apr 26, 8 to 10 am", or "Needs a day". */
export const visitWhen = (visit: PassVisit | undefined): string => dayWords(visit) || "Needs a day"

export interface JobRow {
  kind: PassVisit["kind"]
  name: string
  /** "Apr 26" or "Apr 26, 8 to 10 am"; "Needs a day" before there is one */
  when: string
  job: Job
  amount: number
}

/** One job per visit on the pass: its name, its day and window, its state. The same visit rows `chargeRows` reads. */
export function jobRows(pass: Pass, today: string): JobRow[] {
  const day = dayOf(today, TIME_ZONE)
  return pass.visits.map((visit) => ({ kind: visit.kind, name: VISIT_NAMES[visit.kind], when: visitWhen(visit), job: passVisitJob(pass, visit, day, TIME_ZONE), amount: visit.amount }))
}

export interface ChargeRow {
  kind: PassVisit["kind"]
  name: string
  /** the booked day as "Apr 20", else "Needs a day" */
  when: string
  amount: number
  /** "Charged Apr 20" or "Not yet" */
  charged: string
}

/** One row per visit on the pass: its name, its day, its amount and whether it has been charged. */
export function chargeRows(pass: Pass): ChargeRow[] {
  return pass.visits.map((visit) => ({
    kind: visit.kind,
    name: VISIT_NAMES[visit.kind],
    when: visitWhen(visit),
    amount: visit.amount,
    charged: visit.chargedAt ? `Charged ${shortDate(visit.chargedAt, TIME_ZONE)}` : "Not yet",
  }))
}
