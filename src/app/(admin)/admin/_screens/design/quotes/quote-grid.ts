import type { GridJob, GridStatus } from "../JobsGridDesign"
import { liveQuote, linesTotal, money, stageOf, type QuoteJob } from "./quote-model"

// The Jobs grid's row for a job that has a quote: its Status is the job's stage read from the quotes (Needs a quote, Quote sent, then Unscheduled once
// approved and ready for a day, or Canceled), the Total is the quote's or the lines', and Billing is the balance once a deposit is paid. Pure.

const STAGE_GRID: Record<ReturnType<typeof stageOf>, GridStatus> = { "needs-a-quote": "needs-a-quote", "quote-sent": "quote-sent", open: "unscheduled", canceled: "cancelled" }

export function quoteGridRow(base: GridJob, job: QuoteJob): GridJob {
  const q = liveQuote(job)
  const total = q ? q.total : linesTotal(job.lines)
  const paid = q?.state === "approved" && q.deposit?.paid && !q.deposit.paid.refundedOn ? q.deposit.amount : 0
  return {
    ...base,
    stage: STAGE_GRID[stageOf(job)],
    total,
    billingState: paid ? "owed" : null,
    billing: paid ? `${money(total - paid)} unpaid` : "",
    next: stageOf(job) === "canceled" ? "None" : stageOf(job) === "open" ? "Unscheduled" : base.next,
  }
}
