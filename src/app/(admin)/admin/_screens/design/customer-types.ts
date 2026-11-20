import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Message, Pass } from "@/lib/admin/types"
import type { TimelineLine } from "@/lib/events/timeline"
import type { PhotoItem } from "@/lib/photos/types"
import type { RecordFact } from "@/components/blocks/RecordPanel"
import type { PillStatus } from "@/components/blocks/StatusPill"
import type { CustomerStatus, CustomerStatusFacts } from "@/lib/customers/status"
import type { PillData } from "./job-fixtures"

// The shapes the customer page takes (docs/plans/2026-11-19-admin-page-layout-research.md): pure data, kept apart from the fixtures that fill them.

export type CustomerState = "pass-holder" | "two-seasons" | "one-off" | "nothing-yet" | "opted-out" | "refunded" | "part-refunded" | "deposit" | "active-recent" | "past-customer" | "archived"
export const CUSTOMER_STATES: readonly CustomerState[] = ["pass-holder", "two-seasons", "one-off", "nothing-yet", "opted-out", "refunded", "part-refunded", "deposit", "active-recent", "past-customer", "archived"]

export interface MoneyWord {
  /** the word, from `words.ts`: "Paid, card", "$145 unpaid", "Invoice sent", "Past due" */
  word: string
  tone?: "past-due" | "failed" | "plain"
  /** the quiet second line: "due Dec 2", "Charged after each visit" */
  note?: string
}

export interface CustomerJobRow {
  id: string
  name: string
  /** open jobs sort above closed ones */
  open: boolean
  /** newest first within open and closed: the day of its next or last visit, ISO */
  sortDay: string
  day?: { iso: string; label: string; time: string; stops: number }
  who?: string
  status: PillStatus
  statusLabel: string
  /** a job waiting on its quote: it is not yet a job that makes a customer (`customerStatusOf`) */
  quote?: "needs-a-quote" | "quote-sent"
  /** what has happened so far; null when nothing is due yet */
  money: MoneyWord | null
  /** a quiet line under the money word, or under the dash when nothing is due: "Charged after each visit" */
  note?: string
}

export interface CustomerInvoiceRow {
  id: string
  /** "INV-2026-0042" */
  number: string
  jobId: string
  jobName: string
  amount: string
  sent: string
  due: string
  status: PillStatus
  statusLabel: string
  sortDay: string
  /** a quiet line about the invoice: "$145 less the $50 deposit" */
  note?: string
}

export interface ConsentEventRow {
  id: string
  on: string
  /** "Opted in to marketing email" */
  what: string
  /** "Website", "Phone, by the office", "Reply STOP" */
  source: string
  who: string
}

export interface MarketingChannel {
  on: boolean
  /** the source and date once it has changed: "Opted in Nov 2 by the customer on the website", "Opted out Nov 9, asked by phone, Ryan" */
  note?: string
}

/** The consent rows of a customer (docs/DATA_MODEL.md, "consent (terms, marketing)"): visits and billing texts and email are transactional and go whatever the marketing choice; marketing is its own yes, per channel, off by default. */
export interface ConsentData {
  /** "Agreed Apr 14, 2026 on the website, terms v3"; empty when the customer was never asked */
  agreed: string
  /** "Oct 3": a reply of STOP stopped the texts, so every text goes as an email */
  stoppedOn?: string
  email: MarketingChannel
  text: MarketingChannel
  contactBy: "text" | "email" | "both"
  /** newest first */
  history: ConsentEventRow[]
}

export interface CustomerPaymentRow {
  /** a refund row: negative, grey */
  refund?: boolean
  /** this payment has been refunded in full: no Refund under its More */
  refunded?: boolean
  /** the payment this refund reverses: the refund sits under it */
  refundOf?: string
  /** the invoice this payment settled: the two are one row of Invoices and payments */
  invoiceId?: string
  id: string
  /** the receipt's number: "R-1031" */
  receipt: string
  date: string
  sortDay: string
  jobId: string
  jobName: string
  /** "Card", "Check 2210", "Venmo @andrea-d" */
  how: string
  amount: string
  /** a card payment opens in Stripe */
  stripeUrl?: string
  /** a word about the payment, as the quiet line in place of who recorded it: "Deposit" */
  note?: string
}

export interface SeasonLink {
  season: number
  number: string
  jobId: string
}

export interface EarlierSeason extends SeasonLink {
  state: string
  renewedAs?: SeasonLink
}

export type PassArea =
  | { kind: "pass"; jobId: string; /** from November 1 the block and More offer Reserve next season */ reserveNext?: boolean; pass: Pass; facts: RecordFact[]; card: string; renewedFrom?: SeasonLink; renewedAs?: SeasonLink; earlier: EarlierSeason[] }
  | { kind: "sell"; label: "Get a Season Pass" | "Reserve next season"; line: string; earlier: EarlierSeason[] }

export interface BandCell {
  value: string
  sub: string
  alert?: boolean
  /** the job, invoice or pass the tile opens; none for a tile with nothing behind it */
  jobId?: string
  invoiceId?: string
}

export interface CustomerBillingData {
  /** "Paid in full", "$145 unpaid", "Nothing billed yet", "$145 refunded to the card on Nov 19, by Ryan" */
  line: string
  /** a settled line draws green (paid) or grey (refunded) */
  settled?: "paid" | "refunded"
  /** replaces Unpaid in the facts once something came back: "$145" */
  refunded?: string
  tone: "past-due" | "failed" | "plain"
  total: string
  paid: string
  unpaid: string
  card?: { brand: string; last4: string; expires: string; stripeUrl: string }
  payments: CustomerPaymentRow[]
  invoices: CustomerInvoiceRow[]
}

export interface CustomerPageData {
  id: string
  name: string
  firstName: string
  /** how the customer wants to hear from us: every customer-facing confirmation names this channel and its address */
  contact: { channel: "text" | "email"; phone: { text: string; href: string }; email: string }
  address: [string, string]
  subtitle: string
  /** the badges beside the name after the status: the Season Pass. Money never goes here (the Unpaid tile and Billing say it). */
  pills: PillData[]
  /** worked out from the customer's jobs by `customerStatusOf`, never typed (the one typed status, Archived, is `statusFacts.archivedAt`) */
  status: CustomerStatus
  statusFacts: CustomerStatusFacts
  /** a mark only: it blocks nothing. The reason stays in the history and is never shown to the customer. */
  doNotService?: { reason?: string }
  band: { next: BandCell; unpaid: BandCell; pass: BandCell; card: BandCell }
  /** the amount of the open invoice or unpaid job, when something is unpaid ("$145") */
  unpaid?: string
  openInvoice?: { id: string; number: string; amount: string; jobName: string; due: string }
  /** nothing has ever happened for this customer: Delete is offered */
  untouched?: boolean
  jobs: CustomerJobRow[]
  billing: CustomerBillingData
  messages: Message[]
  photos: PhotoItem[]
  notes: TimelineLine[]
  property: RecordFact[]
  consent: ConsentData
  area: PassArea
}
