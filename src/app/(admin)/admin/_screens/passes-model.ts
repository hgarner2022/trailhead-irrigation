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
import { dayWords, passVisitJob, visitPaidOn, type Job } from "@/lib/admin/jobs"
import { statusLabel } from "@/components/blocks/StatusPill"

const STATUS_ORDER: PassStatus[] = ["active", "pending", "cancelled", "lapsed"]

export const VISIT_NAMES: Record<PassVisit["kind"], string> = { "turn-on": "Turn-on", inspection: "Inspection", blowout: "Blowout" }

/** The one-line note a pending pass carries in the panel. */
export const PENDING_NOTE = "Checkout not finished, expires after an hour."

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

/** "08/28" from the stored "2028-08". */
const expiry = (yearMonth: string) => `${yearMonth.slice(5, 7)}/${yearMonth.slice(2, 4)}`

/**
 * The panel's card line: "Card ending 4242, expires 08/28"; "No card yet, collect at the visit" on an active pass sold by the
 * office with none (the money is asked for at Done, and Send card link turns it into a card pass); "No card yet" on a pending
 * pass, whose card step is not done.
 */
export function cardWords(pass: Pick<Pass, "status" | "cardLast4" | "cardExpires">): string {
  if (!pass.cardLast4) return pass.status === "active" ? "No card yet, collect at the visit" : "No card yet"
  const ending = `Card ending ${pass.cardLast4}`
  return pass.cardExpires ? `${ending}, expires ${expiry(pass.cardExpires)}` : ending
}

/** A visit's day and window for a table cell or a line: "Apr 26", "Apr 26, 8 to 10 am", or "No day yet". */
export const visitWhen = (visit: PassVisit | undefined): string => dayWords(visit) || "No day yet"

export interface JobRow {
  kind: PassVisit["kind"]
  name: string
  /** "Apr 26" or "Apr 26, 8 to 10 am"; "No day yet" before there is one */
  when: string
  job: Job
  amount: number
  /** the visit row, so the panel can open it */
  visitId?: string
}

/** One job per visit on the pass: its name, its day and window, its state. The same visit rows `chargeRows` reads. */
export function jobRows(pass: Pass, today: string): JobRow[] {
  const day = dayOf(today, TIME_ZONE)
  return pass.visits.map((visit) => ({ kind: visit.kind, name: VISIT_NAMES[visit.kind], when: visitWhen(visit), job: passVisitJob(pass, visit, day, TIME_ZONE), amount: visit.amount, visitId: visit.id }))
}

export interface ChargeRow {
  kind: PassVisit["kind"]
  name: string
  /** the booked day as "Apr 20", else "No day yet" */
  when: string
  amount: number
  /** "Paid Apr 20", blank before */
  charged: string
}

/** One row per visit on the pass: its name, its day, its amount and the day it was paid, read from the visit's payment rows. */
export function chargeRows(pass: Pass): ChargeRow[] {
  return pass.visits.map((visit) => ({
    kind: visit.kind,
    name: VISIT_NAMES[visit.kind],
    when: visitWhen(visit),
    amount: visit.amount,
    charged: visitPaidOn(visit) ? `Paid ${shortDate(visitPaidOn(visit)!, TIME_ZONE)}` : "",
  }))
}
