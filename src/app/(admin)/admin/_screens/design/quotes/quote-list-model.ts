import { depositOf, linesTotal, quoteTotal, type QuoteRecord, type QuoteState } from "./quote-model"

// The rows of the Quotes list (Hannah, Nov 20 2026: a Quotes nav item after Jobs, modelled on the Invoices list; Nov 22 2026: a quote is its own record, so this is THE list
// of them, Drafts included). One row is one quote, read from the quote store (or a story's fixtures), so a quote made from a request or by hand is a row here at once. A quote
// still waiting is Sent and undecided; the rail's count is those. Pure, no React.

export interface QuoteListRow {
  /** the quote number, "Q-2026-0007": the row's id */
  id: string
  customerId: string
  customer: string
  first: string
  street: string
  /** what the quote is for: the service */
  service: string
  /** whole dollars: the lines' total while a Draft, the frozen total after */
  amount: number
  /** whole dollars, when the quote has a deposit */
  deposit?: number
  createdOn: string
  /** a Draft has not been sent */
  sentOn?: string
  decidedOn?: string
  state: QuoteState
  /** the job made when the quote was approved */
  jobId?: string
  /** Remind was already pressed today: the row's Remind waits until tomorrow */
  remindedToday: boolean
}

/** Every quote as a row; `now` only decides whether a reminder went out today. */
export function quoteRowsOf(quotes: readonly QuoteRecord[], now: string): QuoteListRow[] {
  return quotes.map((q): QuoteListRow => {
    const last = q.reminders[q.reminders.length - 1]
    const dep = q.state === "draft" ? depositOf(linesTotal(q.lines), q.depositDraft ?? { mode: "none", value: "" }).amount : (q.deposit?.amount ?? null)
    return {
      id: q.id,
      customerId: q.customerId,
      customer: q.customer,
      first: q.first,
      street: q.street,
      service: q.service,
      amount: quoteTotal(q),
      ...(dep ? { deposit: dep } : {}),
      createdOn: q.createdOn,
      ...(q.sentOn ? { sentOn: q.sentOn } : {}),
      ...(q.decidedOn ? { decidedOn: q.decidedOn } : {}),
      state: q.state,
      ...(q.jobId ? { jobId: q.jobId } : {}),
      remindedToday: Boolean(last && last.at.slice(0, 10) === now.slice(0, 10)),
    }
  })
}

/** The quotes still waiting for an answer: Sent and undecided. The rail's count and Home's rows read the same. */
export const waitingQuotes = (rows: readonly QuoteListRow[]) => rows.filter((r) => r.state === "sent")

/** The rail's count: how many quotes are waiting for an answer. */
export const waitingCount = (quotes: readonly QuoteRecord[]) => quotes.filter((q) => q.state === "sent").length

const inMonth = (iso: string | undefined, now: string) => Boolean(iso && iso.slice(0, 7) === now.slice(0, 7))
const sum = (rows: readonly QuoteListRow[]) => rows.reduce((n, r) => n + r.amount, 0)

/** The three tiles: what is waiting, and what was approved and declined this month (by the day it was decided). */
export function quoteTotals(rows: readonly QuoteListRow[], now: string) {
  const waiting = waitingQuotes(rows)
  const approved = rows.filter((r) => r.state === "approved" && inMonth(r.decidedOn, now))
  const declined = rows.filter((r) => r.state === "declined" && inMonth(r.decidedOn, now))
  return {
    waiting: { total: sum(waiting), count: waiting.length },
    approved: { total: sum(approved), count: approved.length },
    declined: { total: sum(declined), count: declined.length },
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

/** How long the oldest waiting quote has waited, in whole days ("Oldest: 8 days"), or null when nothing waits. */
export function oldestWaitingDays(rows: readonly QuoteListRow[], now: string): number | null {
  const waiting = waitingQuotes(rows)
  if (waiting.length === 0) return null
  const oldest = Math.min(...waiting.map((r) => Date.parse(r.sentOn!)))
  return Math.max(0, Math.floor((Date.parse(now) - oldest) / DAY_MS))
}

/**
 * Close rate: the quotes approved out of the quotes decided (approved plus declined), as a whole percent. A derived figure, nothing else: no target and no
 * comparison. Null until one quote is decided. Drafts, Sent, Replaced and Archived quotes are not decided.
 */
export function closeRate(rows: readonly QuoteListRow[]): { percent: number; approved: number; decided: number } | null {
  const approved = rows.filter((r) => r.state === "approved").length
  const decided = approved + rows.filter((r) => r.state === "declined").length
  return decided === 0 ? null : { percent: Math.round((approved / decided) * 100), approved, decided }
}

/** The status tabs: All and the quote's own six states, each with its live count. */
export type QuoteTab = "all" | QuoteState
export const QUOTE_TABS: readonly QuoteTab[] = ["all", "draft", "sent", "approved", "declined", "replaced", "archived"]
export function tabCounts(rows: readonly QuoteListRow[]): Record<QuoteTab, number> {
  const n = (s: QuoteState) => rows.filter((r) => r.state === s).length
  return { all: rows.length, draft: n("draft"), sent: n("sent"), approved: n("approved"), declined: n("declined"), replaced: n("replaced"), archived: n("archived") }
}

/** Waiting first (the longest waiting on top), then Drafts (newest first), then the decided ones newest first, then Replaced and Archived. */
export function sortQuoteRows(rows: readonly QuoteListRow[]): QuoteListRow[] {
  const rank = (r: QuoteListRow) => (r.state === "sent" ? 0 : r.state === "draft" ? 1 : r.state === "replaced" || r.state === "archived" ? 3 : 2)
  const when = (r: QuoteListRow) => r.decidedOn ?? r.sentOn ?? r.createdOn
  return [...rows].sort((a, b) => rank(a) - rank(b) || (rank(a) === 0 ? when(a).localeCompare(when(b)) : when(b).localeCompare(when(a))))
}

export const QUOTE_STATES: readonly QuoteState[] = ["draft", "sent", "approved", "declined", "replaced", "archived"]
