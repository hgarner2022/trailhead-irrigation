// The stage of a job, read from facts and never typed (Hannah, Nov 17 2026): Needs a quote, Quote sent, Open, Done, Canceled.
// Pure, so the Jobs screen, its filter, its header line and the API say the same word. Decision 2 of the step 6 plan: Canceled
// (`cancelled_at`, every line canceled, or no live visit), Done (every live visit done), then, for a job that is not a Season
// Pass, Quote sent (a quote sent, none accepted, nothing sold) and Needs a quote (nothing sold and no quote sent, or every line
// unpriced), else Open. A Season Pass starts Open.
import type { JobKind } from "./kind"
import { jobSubtotal, type Line } from "./lines"
import { paidTotal } from "@/lib/money/words"

export type JobStage = "needs-a-quote" | "quoted" | "open" | "done" | "cancelled"

export const STAGE_WORDS: Record<JobStage, string> = {
  "needs-a-quote": "Needs a quote",
  quoted: "Quote sent",
  open: "Open",
  done: "Done",
  cancelled: "Canceled",
}

export interface StageFacts {
  /** the derived kind (`jobKindOf`) */
  kind: JobKind
  /** the job's `cancelled_at` */
  cancelledAt?: Date | string | null
  /** the Mountain day the work was sold (`sold_on`); empty while a quote is waiting */
  soldOn?: string | null
  lines: readonly Pick<Line, "quantity" | "unitPrice" | "cancelledAt">[]
  /** every visit of the job; a canceled or skipped one is not work ahead */
  visits: readonly { status: string; skipped?: boolean }[]
  /** the job's payment rows (succeeded ones count, refunds against them); a job that holds money with no live visit is Done, not Canceled */
  payments?: readonly { amount: number; status: string }[]
  /** the day a quote went out and the day the customer accepted it (`quote_sent_on`, `quote_accepted_on`) */
  quoteSentOn?: string | null
  quoteAcceptedOn?: string | null
}

/** The stage of one job. */
export function stageOf(job: StageFacts): JobStage {
  const live = job.visits.filter((v) => v.status !== "cancelled" && v.status !== "skipped" && !v.skipped)
  const allLinesCancelled = job.lines.length > 0 && job.lines.every((l) => l.cancelledAt)
  if (job.cancelledAt) return "cancelled"
  // A customer's cancel keeps a job that holds money open (`cancelSelf` never moves money): the work was paid for, so with no live visit it reads
  // Done, never Canceled. The office cannot cancel such a job (`jobs.cancel` refuses it), so `cancelledAt` is never set on one.
  const paidFor = paidTotal(job.payments ?? []) > 0
  if (paidFor && (allLinesCancelled || (job.visits.length > 0 && live.length === 0))) return "done"
  if (allLinesCancelled || (job.visits.length > 0 && live.length === 0)) return "cancelled"
  if (live.length > 0 && live.every((v) => v.status === "completed")) return "done"
  if (job.kind !== "pass") {
    if (job.quoteSentOn && !job.quoteAcceptedOn && !job.soldOn) return "quoted"
    if (!job.soldOn && !job.quoteSentOn) return "needs-a-quote"
    // a one-off whose lines are all still unpriced (before tax: tax on nothing is nothing) and whose quote nobody accepted
    if (!job.quoteAcceptedOn && jobSubtotal(job.lines) === 0) return "needs-a-quote"
  }
  return "open"
}
