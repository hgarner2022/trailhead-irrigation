import { stageOf, type QuoteData, type QuoteJob, type QuoteState } from "./quote-model"

// The rows of the Quotes list (Hannah, Nov 20 2026: a Quotes nav item after Jobs, a second view of every quote, modelled on the Invoices list). One row is
// one quote, read from the same jobs the job page reads (the walkthrough's quote store, or a story's fixtures), so a quote sent from a job is a row here at
// once. A quote still waiting is Sent and undecided; the rail's count is those. Pure, no React.

export interface QuoteListRow {
  /** the quote number, "Q-2026-0007": the row's id */
  id: string
  jobId: string
  customerId: string
  customer: string
  first: string
  street: string
  /** what the job is called: the service */
  jobName: string
  /** the job's stage word, for the job chip */
  jobStage: ReturnType<typeof stageOf>
  /** whole dollars */
  amount: number
  /** whole dollars, when the quote has a deposit */
  deposit?: number
  sentOn: string
  decidedOn?: string
  state: QuoteState
  /** Remind was already pressed today: the row's Remind waits until tomorrow */
  remindedToday: boolean
}

/** Every quote of every job as a row; `now` only decides whether a reminder went out today. */
export function quoteRowsOf(jobs: readonly QuoteJob[], now: string): QuoteListRow[] {
  return jobs.flatMap((j) =>
    j.quotes.map(
      (q: QuoteData): QuoteListRow => {
        const last = q.reminders[q.reminders.length - 1]
        return {
          id: q.id,
          jobId: j.jobId,
          customerId: j.customerId,
          customer: j.customer,
          first: j.first,
          street: j.street,
          jobName: j.service,
          jobStage: stageOf(j),
          amount: q.total,
          ...(q.deposit ? { deposit: q.deposit.amount } : {}),
          sentOn: q.sentOn,
          ...(q.decidedOn ? { decidedOn: q.decidedOn } : {}),
          state: q.state,
          remindedToday: Boolean(last && last.at.slice(0, 10) === now.slice(0, 10)),
        }
      },
    ),
  )
}

/** The quotes still waiting for an answer: Sent and undecided. The rail's count and Home's rows read the same. */
export const waitingQuotes = (rows: readonly QuoteListRow[]) => rows.filter((r) => r.state === "sent")

/** The rail's count: how many quotes are waiting, from the jobs. A canceled job's quote is not waiting. */
export const waitingCount = (jobs: readonly QuoteJob[]) => jobs.filter((j) => !j.canceled).reduce((n, j) => n + j.quotes.filter((q) => q.state === "sent").length, 0)

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

/** Waiting first (the longest waiting on top), then the decided ones, newest first, then the Replaced. */
export function sortQuoteRows(rows: readonly QuoteListRow[]): QuoteListRow[] {
  const rank = (r: QuoteListRow) => (r.state === "sent" ? 0 : r.state === "replaced" ? 2 : 1)
  const when = (r: QuoteListRow) => r.decidedOn ?? r.sentOn
  return [...rows].sort((a, b) => rank(a) - rank(b) || (rank(a) === 0 ? a.sentOn.localeCompare(b.sentOn) : when(b).localeCompare(when(a))))
}

export const QUOTE_STATES: readonly QuoteState[] = ["sent", "approved", "declined", "replaced"]
