import type { PillStatus } from "@/components/blocks/StatusPill"
import { relativeTime } from "@/components/blocks/needs-attention-time"
import { depositOf, type DepositInput } from "./quote-deposit"

// A quote and the job it is on (docs/plans/2026-11-20-requests-and-quotes-research.md, 4.1, 4.5, 4.6 and "Deposits and card on file at approval"; Hannah's
// answers 3 to 8 of Nov 20 2026). A quote is a document made when Ryan presses "Send a quote": the job's lines frozen into it, a number, a link, an optional
// deposit and the one decision. There is no Draft: the draft is the job's live lines. The job reads Needs a quote until a quote is sent, Quote sent while
// one is out and undecided, and then Open (approved) or Canceled (declined). Lines are locked while a quote is out; Revise marks it Replaced and returns
// the job to Needs a quote. A deposit is optional, empty by default, typed as dollars or a percent and frozen as dollars, never above the total.
// Pure data and functions, nothing fetched.

export type QuoteState = "sent" | "approved" | "declined" | "replaced"
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
  /** canceled after the customer approved: struck through, and out of the total */
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

export interface QuoteData {
  /** "Q-2026-0007": the number is also its address, /quote/<number> */
  id: string
  jobId: string
  lines: QuoteLine[]
  total: number
  deposit?: Deposit
  sentOn: string
  sentVia: Channel | "none"
  state: QuoteState
  decidedOn?: string
  decidedBy?: "customer" | "Ryan"
  reminders: QuoteReminder[]
}

/** The job a quote is on, with the person it is for. */
export interface QuoteJob {
  jobId: string
  customerId: string
  customer: string
  first: string
  phone: string
  email: string
  contact: Channel
  service: string
  street: string
  town: string
  /** the request it came from, when it came from one */
  requestId?: string
  /** the customer's own words, from the request: the first note on the job */
  words?: string
  /** a job made ready to schedule without a quote (Create job on a priced service): it reads Unscheduled, not Needs a quote */
  direct?: boolean
  /** a visit already on the job, the design visit of an installation booked online: the price is set at the visit and the quote follows it */
  visit?: { name: string; day: string; done: boolean; who: string }
  /** the job's live lines: editable until a quote is sent */
  lines: QuoteLine[]
  /** the deposit Ryan has set in the quote editor and not yet sent: none by default; it is frozen as dollars when the quote is sent */
  depositDraft?: DepositInput
  /** every quote made on the job, oldest first */
  quotes: QuoteData[]
  canceled?: boolean
  /** an event line or two for Notes and history, oldest first */
  history: { at: string; actor: string; what: string; /** a note's full text (the customer's words on a job made from a request) */ note?: string; /** a price change after approval, and the telling of it (`price-change.ts`) */ kind?: "price-changed" | "price-told"; price?: { from: number; to: number } }[]
}

export type JobStageKey = "needs-a-quote" | "quote-sent" | "open" | "canceled"

/** The quote that is out and undecided, or the one that was decided: the newest that is not Replaced. */
export const liveQuote = (job: QuoteJob): QuoteData | undefined => [...job.quotes].reverse().find((q) => q.state !== "replaced")

/** The job's stage, read from its quotes: Needs a quote, Quote sent, Open (approved, or made ready without a quote) or Canceled (declined, or canceled by hand). */
export function stageOf(job: QuoteJob): JobStageKey {
  if (job.canceled) return "canceled"
  const q = liveQuote(job)
  if (!q) return job.direct ? "open" : "needs-a-quote"
  if (q.state === "approved") return "open"
  if (q.state === "declined") return "canceled"
  return "quote-sent"
}

export const STAGE_PILL: Record<JobStageKey, { status: PillStatus; label: string }> = {
  "needs-a-quote": { status: "needs-a-day", label: "Needs a quote" },
  "quote-sent": { status: "waiting", label: "Quote sent" },
  open: { status: "needs-a-day", label: "Unscheduled" },
  canceled: { status: "cancelled", label: "Canceled" },
}

export const QUOTE_PILL: Record<QuoteState, { status: PillStatus; label: string }> = {
  sent: { status: "quote-sent", label: "Sent" },
  approved: { status: "quote-approved", label: "Approved" },
  declined: { status: "quote-declined", label: "Declined" },
  replaced: { status: "quote-replaced", label: "Replaced" },
}

export { depositOf, money, type DepositInput, type DepositMode, type DepositResult } from "./quote-deposit"
/** One line's total: its price times its quantity (one when it has none). */
export const lineTotal = (l: QuoteLine) => l.amount * (l.quantity ?? 1)
/** The total of the lines that count: a canceled line is out. */
export const linesTotal = (lines: readonly QuoteLine[]) => lines.reduce((sum, l) => sum + (l.canceled ? 0 : lineTotal(l)), 0)
/** What is missing before the quote can be sent, in words, or empty when it can: a line with a price, and a deposit that is valid. */
export function sendBlock(job: QuoteJob): string {
  if (stageOf(job) !== "needs-a-quote") return ""
  const total = linesTotal(job.lines)
  if (total <= 0) return "Add a price to a line to send."
  return depositOf(total, job.depositDraft ?? { mode: "none", value: "" }).problem
}
/** A quote can be sent once a line has a price and the deposit, if one is set, is valid. */
export const canSend = (job: QuoteJob) => stageOf(job) === "needs-a-quote" && sendBlock(job) === ""

// ------------------------------------------------------------------------------------------------------------------------------ words

const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/Denver" })
export const dayOf = (iso: string) => DAY.format(new Date(iso))
export const ago = (iso: string, now: string) => relativeTime(iso, now)

/** "Quote Q-2026-0007 is out" style facts: how it was sent. */
export const VIA_WORDS: Record<Channel | "none", string> = { text: "text", email: "email", both: "text and email", none: "no message" }

/** The fixtures' today, the same as the job page's (Wed Nov 18 2026). */
export const QUOTES_NOW = "2026-11-18T18:00:00Z"

/** The next quote number: the numbers are Q-2026-0001 up, one per quote ever made. */
export function nextNumber(jobs: readonly QuoteJob[]): string {
  const taken = jobs.flatMap((j) => j.quotes.map((q) => Number(q.id.slice(-4))))
  return `Q-2026-${String(Math.max(6, ...taken) + 1).padStart(4, "0")}`
}

// ------------------------------------------------------------------------------------------------------------------------------ fixtures

const ln = (id: string, name: string, amount: number, description?: string): QuoteLine => ({ id, name, amount, ...(description ? { description } : {}) })

/** Beth Orr's Christmas lights: a quote out with a $300 deposit, sent nine days ago. */
const BETH_LINES = [ln("b1", "Roofline lights", 900, "Front of the house."), ln("b2", "Porch columns", 300, "Both columns, wrapped.")]
/** Greg Olsen's larger repair: a quote out with no deposit, sent four days ago and reminded once. */
const GREG_LINES = [ln("g1", "Sprinkler repair visit", 145, "Find the fault and fix what we can that day."), ln("g2", "Valve replacement", 230), ln("g3", "New lines, zone 6", 485)]

export const QUOTE_JOB_FIXTURES: QuoteJob[] = [
  {
    jobId: "q-dana",
    customerId: "other-dana-cho",
    customer: "Dana Cho",
    first: "Dana",
    phone: "(970) 555-0171",
    email: "dana.cho@example.com",
    contact: "text",
    service: "Larger sprinkler repair",
    street: "18 Cedar Way",
    town: "Erie",
    requestId: "rq-dana",
    words: "Zone 3 has a geyser by the driveway after the blowout. I would like a price to redo that line.",
    lines: [ln("d1", "Larger sprinkler repair", 0)],
    quotes: [],
    history: [
      { at: "2026-11-13T15:20:00Z", actor: "Dana", what: "Zone 3 has a geyser by the driveway after the blowout. I would like a price to redo that line.", note: "Zone 3 has a geyser by the driveway after the blowout. I would like a price to redo that line." },
      { at: "2026-11-13T17:00:00Z", actor: "Ryan", what: "Created from a request on Nov 13" },
    ],
  },
  {
    jobId: "q-beth",
    customerId: "other-beth-orr",
    customer: "Beth Orr",
    first: "Beth",
    phone: "(970) 555-0159",
    email: "beth.orr@example.com",
    contact: "email",
    service: "Christmas lights",
    street: "33 Aspen Ct",
    town: "Lafayette",
    requestId: "rq-beth",
    words: "Front of the house and the porch columns, please. We are away until the 20th of December.",
    lines: BETH_LINES,
    quotes: [{ id: "Q-2026-0007", jobId: "q-beth", lines: BETH_LINES, total: 1200, deposit: { amount: 300, percent: 25 }, sentOn: "2026-11-09T21:00:00Z", sentVia: "email", state: "sent", reminders: [] }],
    history: [
      { at: "2026-11-09T19:45:00Z", actor: "Beth", what: "Front of the house and the porch columns, please. We are away until the 20th of December.", note: "Front of the house and the porch columns, please. We are away until the 20th of December." },
      { at: "2026-11-10T15:00:00Z", actor: "Ryan", what: "Created from a request on Nov 10" },
      { at: "2026-11-09T21:00:00Z", actor: "Ryan", what: "Sent quote Q-2026-0007 by email" },
    ],
  },
  {
    jobId: "q-greg",
    customerId: "other-greg-olsen",
    customer: "Greg Olsen",
    first: "Greg",
    phone: "(970) 555-0123",
    email: "greg.olsen@example.com",
    contact: "text",
    service: "Larger sprinkler repair",
    street: "5 Birch Ln",
    town: "Erie",
    lines: GREG_LINES,
    quotes: [{ id: "Q-2026-0008", jobId: "q-greg", lines: GREG_LINES, total: 860, sentOn: "2026-11-14T17:00:00Z", sentVia: "text", state: "sent", reminders: [{ at: "2026-11-16T17:00:00Z", via: "text" }] }],
    history: [
      { at: "2026-11-14T17:00:00Z", actor: "Ryan", what: "Sent quote Q-2026-0008 by text" },
      { at: "2026-11-16T17:00:00Z", actor: "Ryan", what: "Sent a reminder for quote Q-2026-0008 by text" },
    ],
  },
]

export const fixtureJob = (id: string): QuoteJob => structuredClone(QUOTE_JOB_FIXTURES.find((j) => j.jobId === id)!)

/** Priya Nair's new system: booked online as a design visit, which Ryan did on Nov 12. The price is set at the visit and the job reads Needs a quote; he sends the quote from the job. */
const INSTALL_LINES = [ln("i1", "New sprinkler system installation", 0)]
export const DESIGN_VISIT_JOB: QuoteJob = {
  jobId: "q-priya",
  customerId: "priya",
  customer: "Priya Nair",
  first: "Priya",
  phone: "(970) 555-0123",
  email: "priya.nair@example.com",
  contact: "text",
  service: "New sprinkler system installation",
  street: "77 Aspen Way",
  town: "Firestone",
  visit: { name: "Design visit", day: "2026-11-12T17:00:00Z", done: true, who: "Ryan Garner" },
  lines: INSTALL_LINES,
  quotes: [],
  history: [
    { at: "2026-11-05T16:00:00Z", actor: "Priya", what: "Booked a design visit for a new sprinkler system online" },
    { at: "2026-11-12T19:00:00Z", actor: "Ryan", what: "Design visit marked done" },
  ],
}

/**
 * A job made from a request (Hannah, Nov 20 2026: the request moves into the job; nobody accepts anything). The customer's words are the first note on the
 * job, its photos come along, and Notes and history reads "Created from a request on Nov 20". The line is the service's catalogue line: priced when the
 * catalogue has a price, else unpriced, and an unpriced line reads Needs a quote. "Create job" on a priced service is ready to schedule (`direct`);
 * "Send a quote" always leaves the job in Needs a quote.
 */
export function jobFromRequest(o: { jobId: string; requestId: string; customerId: string; customer: string; first: string; phone: string; email: string; contact: Channel; service: string; street: string; town: string; words: string; receivedAt: string; at: string; price?: number; quote: boolean }): QuoteJob {
  const priced = o.price !== undefined
  return {
    jobId: o.jobId,
    customerId: o.customerId,
    customer: o.customer,
    first: o.first,
    phone: o.phone,
    email: o.email,
    contact: o.contact,
    service: o.service || "Job",
    street: o.street,
    town: o.town,
    requestId: o.requestId,
    words: o.words,
    ...(priced && !o.quote ? { direct: true } : {}),
    lines: [{ id: "l1", name: o.service || "Job", amount: o.price ?? 0 }],
    quotes: [],
    history: [
      ...(o.words ? [{ at: o.receivedAt, actor: o.first, what: o.words, note: o.words }] : []),
      { at: o.at, actor: "Ryan", what: `Created from a request on ${dayOf(o.at)}` },
    ],
  }
}
