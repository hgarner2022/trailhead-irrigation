import { linesTotal, type ApprovedJob, type QuoteLine } from "./quote-model"

// A price change after the customer approved (Hannah, Nov 20 2026, quote versus job Q3; Nov 22 2026: it stays on the JOB, which was made when the quote was approved): Ryan
// changes the job's lines and tells the customer. There is no second approval and no change-order quote, and the quote itself never changes: it stays frozen. The job's
// total is its lines that are not canceled, the history says "Price changed from $1,200 to $1,500" each time the total moves, and the customer is told in a dialog (or
// Ryan chooses not to). Pure.

export interface PriceChange {
  from: number
  to: number
}

/** The lines that count: a line canceled after approval is struck through and out of the total. */
export const activeLines = (lines: readonly QuoteLine[]): QuoteLine[] => lines.filter((l) => !l.canceled)

/** A job made from an approved quote is still on: its lines may change. */
export const isApproved = (job: ApprovedJob): boolean => !job.canceled

/** The job's total now: its lines that are not canceled. */
export const currentTotal = (job: ApprovedJob): number => linesTotal(activeLines(job.lines))

/** The total the customer approved, when the job's total has moved since. */
export const approvedTotal = (job: ApprovedJob): number | undefined => (isApproved(job) && currentTotal(job) !== job.approvedTotal ? job.approvedTotal : undefined)

/** What the customer has not been told: from the total at the last telling (or the approval) to the total now, or null when nothing moved or the last step was telling them. */
export function untoldChange(job: ApprovedJob): PriceChange | null {
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
