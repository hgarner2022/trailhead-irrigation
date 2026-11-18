// The stage of a job, read from facts and never typed (Hannah, Nov 17 2026): Needs a quote, Quoted, Open, Done, Cancelled.
// Pure, so the Jobs screen, its filter and its header line say the same word. A pass or a booked service starts Open.
// "Quoted" is a word nothing produces yet: the quote step will add `quote_sent_on` and `quote_accepted_on` to the job,
// and a job with a quote sent and not accepted reads Quoted; until then no row shows it.
import { jobTotal, type Line } from "./lines"

export type JobStage = "needs-a-quote" | "quoted" | "open" | "done" | "cancelled"

export const STAGE_WORDS: Record<JobStage, string> = {
  "needs-a-quote": "Needs a quote",
  quoted: "Quoted",
  open: "Open",
  done: "Done",
  cancelled: "Cancelled",
}

export interface StageFacts {
  kind: "pass" | "repair" | "install" | "other"
  /** the job's own status: "cancelled" and "done" are kept on the row */
  status: "pending" | "active" | "done" | "cancelled"
  lines: readonly Pick<Line, "quantity" | "unitPrice" | "cancelledAt">[]
  /** every visit of the job; a cancelled or skipped one is not work ahead */
  visits: readonly { status: "unscheduled" | "scheduled" | "completed" | "cancelled"; skipped?: boolean }[]
  /** the day a quote went out and the day the customer accepted it; both absent until the quote step exists */
  quoteSentOn?: string | null
  quoteAcceptedOn?: string | null
}

/** The stage of one job. */
export function stageOf(job: StageFacts): JobStage {
  const live = job.visits.filter((v) => v.status !== "cancelled" && !v.skipped)
  const allLinesCancelled = job.lines.length > 0 && job.lines.every((l) => l.cancelledAt)
  if (job.status === "cancelled" || allLinesCancelled || (job.visits.length > 0 && live.length === 0)) return "cancelled"
  if (job.status === "done" || (live.length > 0 && live.every((v) => v.status === "completed"))) return "done"
  if (job.kind !== "pass") {
    if (job.quoteSentOn && !job.quoteAcceptedOn) return "quoted"
    // today's only way to a quote: a one-off whose lines are all still unpriced (the old quote request path)
    if (!job.quoteAcceptedOn && jobTotal(job.lines) === 0) return "needs-a-quote"
  }
  return "open"
}
