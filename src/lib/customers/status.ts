// A customer's status, read from the facts the model already holds by one pure function (docs/plans/2026-11-19-customer-status-research.md,
// Hannah's answers of Nov 20 2026). Nobody types it except the office's one deliberate act, Archive. The first rule that matches wins:
//   Archived        `archived_at` is set.
//   Active          a job is open, a visit is ahead, a Season Pass is in force, or ANY job in the last 24 months.
//   Past customer   at least one job, none in the last 24 months, nothing ahead.
//   New             no job yet. A canceled job, a pending pass (`sold_on` empty), Needs a quote and Quote sent do not count.
// `asOf` is a day ("2026-11-20"), so any past day can be recomputed from the same rows. Pure: not wired to anything yet; it moves into the
// build step with the customer panel.

export type CustomerStatus = "new" | "active" | "past" | "archived"
export const CUSTOMER_STATUS_WORDS: Record<CustomerStatus, string> = { new: "New", active: "Active", past: "Past customer", archived: "Archived" }

/** The stages of `src/lib/jobs/stage.ts` that matter here. */
export type StatusJobStage = "needs-a-quote" | "quote-sent" | "open" | "done" | "canceled"

export interface StatusJob {
  stage: StatusJobStage
  /** the day of its newest done visit, else the day it was sold or booked; empty when nothing has happened yet */
  on?: string | null
  /** a Season Pass whose `sold_on` is empty: it counts as nothing until it is paid for */
  pending?: boolean
}

export interface CustomerStatusFacts {
  /** the day the office archived the customer, when it did */
  archivedAt?: string | null
  jobs: readonly StatusJob[]
  /** a visit is ahead: scheduled or unscheduled, not canceled and not skipped */
  visitAhead: boolean
  /** a Season Pass is in force (`passStatus` active for the current season) */
  passInForce: boolean
}

export const ACTIVE_MONTHS = 24

/** The day `months` before `asOf`, clamped to the end of a shorter month (Feb 29 less 24 months is Feb 28 of that year). */
export function monthsBefore(asOf: string, months: number): string {
  const [y, m, d] = asOf.split("-").map(Number) as [number, number, number]
  const target = new Date(Date.UTC(y, m - 1 - months, 1))
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(d, last))
  return target.toISOString().slice(0, 10)
}

/** A job that makes a person a customer: done or open, with something that happened, and not a pending pass. */
const counts = (j: StatusJob): boolean => (j.stage === "open" || j.stage === "done") && !j.pending && Boolean(j.on)

export function customerStatusOf(facts: CustomerStatusFacts, asOf: string): CustomerStatus {
  if (facts.archivedAt) return "archived"
  if (facts.visitAhead || facts.passInForce) return "active"
  if (facts.jobs.some((j) => j.stage === "open" && !j.pending)) return "active"
  const since = monthsBefore(asOf, ACTIVE_MONTHS)
  const had = facts.jobs.filter(counts)
  if (had.some((j) => j.on! >= since)) return "active"
  return had.length > 0 ? "past" : "new"
}
