import { linesTotal, liveQuote, type QuoteJob, type QuoteLine } from "./quote-model"

// A price change after the customer approved (Hannah, Nov 20 2026, quote versus job Q3): Ryan changes the job's lines and tells the customer. There is no
// second approval and no change-order quote. Once a quote is approved its lines are Ryan's to change (add a line, change a price, cancel a line); while a
// quote is out and waiting they stay locked. The job's total is then its lines that are not canceled, the history says "Price changed from $1,200 to
// $1,500" each time the total moves, and the customer is told in a dialog (or Ryan chooses not to). Pure.

export interface PriceChange {
  from: number
  to: number
}

/** The lines that count: a line canceled after approval is struck through and out of the total. */
export const activeLines = (lines: readonly QuoteLine[]): QuoteLine[] => lines.filter((l) => !l.canceled)

/** The customer approved the quote and the job is still on: its lines may change. */
export const isApproved = (job: QuoteJob): boolean => !job.canceled && liveQuote(job)?.state === "approved"

/** The job's total now: after approval, its lines that are not canceled; before, the quote's frozen total or the lines. */
export function currentTotal(job: QuoteJob): number {
  const q = liveQuote(job)
  if (q?.state === "approved") return linesTotal(activeLines(job.lines))
  return q ? q.total : linesTotal(job.lines)
}

/** The total the customer approved, when the job is approved and the total has moved since. */
export const approvedTotal = (job: QuoteJob): number | undefined => {
  const q = liveQuote(job)
  return isApproved(job) && q && currentTotal(job) !== q.total ? q.total : undefined
}

/** What the customer has not been told: from the total at the last telling (or the approval) to the total now, or null when nothing moved or the last step was telling them. */
export function untoldChange(job: QuoteJob): PriceChange | null {
  const changes: PriceChange[] = []
  for (let i = job.history.length - 1; i >= 0; i--) {
    const h = job.history[i]!
    if (h.kind === "price-told") break
    if (h.kind === "price-changed" && h.price) changes.unshift(h.price)
  }
  if (!changes.length) return null
  const from = changes[0]!.from
  const to = changes[changes.length - 1]!.to
  return from === to ? null : { from, to }
}
