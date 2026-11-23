import type { PillStatus } from "@/components/blocks/StatusPill"
import { relativeTime } from "@/components/blocks/needs-attention-time"
import { depositOf, type DepositInput } from "./quote-deposit"
import type { QuoteArchiveReason } from "../requests/request-model"

// A quote is its own record, and a job is made only when the quote is approved (Hannah, Nov 22 2026, superseding the Nov 20 "job first" model:
// "I don't want jobs that will never be that we will have to archive"). A quote has its own number, page and list (docs/plans/2026-11-20-requests-and-quotes-research.md,
// "Deposits and card on file at approval"; docs/plans/2026-11-20-quote-job-relationship-research.md, where every pitfall sits on a copy step: so the quote is FROZEN when it is
// sent and the job is built once from it, at approval). Statuses are read from facts: Draft (lines being priced, not sent), Sent, Approved, Declined, Replaced (revised, and the
// revision is its own quote), Archived (typed, with a reason; archiving a quote archives the request it came from). A deposit is optional, empty by default, typed as dollars or a
// percent and frozen as dollars, never above the total. At approval the job is created at that moment, ready to schedule with no day: the quote's frozen lines copied once, the
// sold day set and the deposit payment attached to it. A price change after approval is made on the job. Pure data and functions, nothing fetched.

export type QuoteState = "draft" | "sent" | "approved" | "declined" | "replaced" | "archived"
export type Channel = "text" | "email" | "both"
export type DepositHow = "card" | "check" | "cash" | "venmo"

export interface QuoteLine {
  id: string
  name: string
  description?: string
  /** whole dollars, the price of one; 0 is an unpriced line */
  amount: number
  /** how many; left out means one, and the editor shows a quantity only when it is more than one */
  quantity?: number
  /** canceled after approval, on the job: struck through, and out of the total */
  canceled?: boolean
}

export interface Deposit {
  /** whole dollars, frozen when the quote is sent */
  amount: number
  /** the percent Ryan typed, kept only to show */
  percent?: number
  paid?: { how: DepositHow; reference?: string; on: string; refundedOn?: string }
}

export interface QuoteReminder {
  at: string
  via: Channel
}

/** The person and the place a quote or a job is for. */
export interface Party {
  customerId: string
  customer: string
  first: string
  phone: string
  email: string
  contact: Channel
  /** what it is for: the service */
  service: string
  street: string
  town: string
}

export interface HistoryLine {
  at: string
  actor: string
  what: string
  /** a note's full text (the customer's words on a quote made from a request) */
  note?: string
  /** a price change after approval, and the telling of it (`price-change.ts`) */
  kind?: "price-changed" | "price-told"
  price?: { from: number; to: number }
}

export interface QuoteRecord extends Party {
  /** "Q-2026-0007": the number is also its address, /quote/<number> */
  id: string
  /** the request it came from, when it came from one */
  requestId?: string
  /** the customer's own words, from the request: the first note on the quote */
  words?: string
  /** the design visit of an installation booked online: the price is set at the visit and the quote follows it */
  visit?: { name: string; day: string; done: boolean; who: string }
  /** the quote's lines: editable while Draft, frozen from the moment it is sent */
  lines: QuoteLine[]
  /** the deposit Ryan has set and not yet sent: none by default; it is frozen as dollars when the quote is sent */
  depositDraft?: DepositInput
  /** the total, frozen when the quote is sent (a Draft reads its lines) */
  total: number
  deposit?: Deposit
  createdOn: string
  sentOn?: string
  sentVia?: Channel | "none"
  state: QuoteState
  decidedOn?: string
  decidedBy?: "customer" | "Ryan"
  reminders: QuoteReminder[]
  /** the quote this one revises, and the quote that replaced this one */
  replaces?: string
  replacedBy?: string
  archived?: { reason: QuoteArchiveReason; on: string }
  /** the job made when the quote was approved: nothing before then */
  jobId?: string
  /** an event line or two for Notes and history, oldest first */
  history: HistoryLine[]
}

/** The job a quote became: made at approval, ready to schedule (no day), with the quote's frozen lines copied once. */
export interface ApprovedJob extends Party {
  /** "qj-0007": made from quote Q-2026-0007 */
  jobId: string
  quoteId: string
  lines: QuoteLine[]
  /** the total the customer approved: the quote's */
  approvedTotal: number
  /** the deposit, with the payment attached to this job */
  deposit?: Deposit
  soldOn: string
  decidedBy: "customer" | "Ryan"
  canceled?: boolean
  history: HistoryLine[]
}

/** The job a quote becomes, "qj-0007" for "Q-2026-0007". */
export const jobIdOf = (quoteId: string) => `qj-${quoteId.slice(-4)}`

export type JobStageKey = "open" | "canceled"
/** A job made from a quote is Unscheduled until it has a day, or Canceled. The stages Needs a quote and Quote sent are quote statuses now (Draft and Sent). */
export const jobStageOf = (job: ApprovedJob): JobStageKey => (job.canceled ? "canceled" : "open")

export const STAGE_PILL: Record<JobStageKey, { status: PillStatus; label: string }> = {
  open: { status: "needs-a-day", label: "Unscheduled" },
  canceled: { status: "cancelled", label: "Canceled" },
}

export const QUOTE_PILL: Record<QuoteState, { status: PillStatus; label: string }> = {
  draft: { status: "quote-draft", label: "Draft" },
  sent: { status: "quote-sent", label: "Sent" },
  approved: { status: "quote-approved", label: "Approved" },
  declined: { status: "quote-declined", label: "Declined" },
  replaced: { status: "quote-replaced", label: "Replaced" },
  archived: { status: "quote-archived", label: "Archived" },
}

export { depositOf, money, type DepositInput, type DepositMode, type DepositResult } from "./quote-deposit"
/** One line's total: its price times its quantity (one when it has none). */
export const lineTotal = (l: QuoteLine) => l.amount * (l.quantity ?? 1)
/** The total of the lines that count: a canceled line is out. */
export const linesTotal = (lines: readonly QuoteLine[]) => lines.reduce((sum, l) => sum + (l.canceled ? 0 : lineTotal(l)), 0)

/** The quote's total: its lines while it is a Draft, the frozen figure once sent. */
export const quoteTotal = (q: QuoteRecord) => (q.state === "draft" ? linesTotal(q.lines) : q.total)
export const isDraft = (q: QuoteRecord) => q.state === "draft"

/** What is missing before the quote can be sent, in words, or empty when it can: a line with a price, and a deposit that is valid. */
export function sendBlock(q: QuoteRecord): string {
  if (!isDraft(q)) return ""
  const total = linesTotal(q.lines)
  if (total <= 0) return "Add a price to a line to send."
  return depositOf(total, q.depositDraft ?? { mode: "none", value: "" }).problem
}
/** A quote can be sent once a line has a price and the deposit, if one is set, is valid. */
export const canSend = (q: QuoteRecord) => isDraft(q) && sendBlock(q) === ""
/** A quote can be archived until a job was made from it or it was replaced or archived already. */
export const canArchive = (q: QuoteRecord) => q.state === "draft" || q.state === "sent" || q.state === "declined"
/** The service can be changed on a Draft that is not a revision and was not made from a design visit. */
export const canChangeService = (q: QuoteRecord) => isDraft(q) && !q.replaces && !q.visit

// ------------------------------------------------------------------------------------------------------------------------------ words

const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/Denver" })
export const dayOf = (iso: string) => DAY.format(new Date(iso))
export const ago = (iso: string, now: string) => relativeTime(iso, now)

/** "Quote Q-2026-0007 is out" style facts: how it was sent. */
export const VIA_WORDS: Record<Channel | "none", string> = { text: "text", email: "email", both: "text and email", none: "no message" }

/** The fixtures' today, the same as the job page's (Wed Nov 18 2026). */
export const QUOTES_NOW = "2026-11-18T18:00:00Z"

/** The next quote number: the numbers are Q-2026-0001 up, one per quote ever made. */
export function nextNumber(quotes: readonly QuoteRecord[]): string {
  const taken = quotes.map((q) => Number(q.id.slice(-4)))
  return `Q-2026-${String(Math.max(8, ...taken) + 1).padStart(4, "0")}`
}

/** The job a quote is approved into: the frozen lines copied once, no day, the sold day set; the deposit, when paid, comes with it. */
export function jobFromQuote(q: QuoteRecord, o: { by: "customer" | "Ryan"; at: string; deposit?: { how: DepositHow; reference?: string } }): ApprovedJob {
  const paid = q.deposit && o.deposit ? { ...o.deposit, on: o.at } : undefined
  const deposit = q.deposit ? { amount: q.deposit.amount, ...(q.deposit.percent ? { percent: q.deposit.percent } : {}), ...(paid ? { paid } : {}) } : undefined
  return {
    jobId: jobIdOf(q.id),
    quoteId: q.id,
    customerId: q.customerId,
    customer: q.customer,
    first: q.first,
    phone: q.phone,
    email: q.email,
    contact: q.contact,
    service: q.service,
    street: q.street,
    town: q.town,
    lines: structuredClone(q.lines.filter((l) => !l.canceled)),
    approvedTotal: q.total,
    ...(deposit ? { deposit } : {}),
    soldOn: o.at,
    decidedBy: o.by,
    history: [{ at: o.at, actor: o.by === "customer" ? q.first : "Ryan", what: `Created from quote ${q.id}` }],
  }
}

