/**
 * Screen-facing types for the admin dashboard, checkout and pass page.
 * Screens and blocks read only these; they never see Jobber's or Stripe's
 * shapes. Dates are ISO strings. Money is whole dollars.
 */

export type Town =
  | "Erie"
  | "Longmont"
  | "Louisville"
  | "Lafayette"
  | "Firestone"
  | "Broomfield"

export type VisitKind =
  | "turn-on"
  | "inspection"
  | "blowout"
  | "repair"
  | "install"
  | "other"

export type VisitStatus = "unscheduled" | "scheduled" | "completed" | "cancelled"

export type PassStatus = "active" | "cancelled" | "lapsed"

/**
 * When the customer would like a visit, against Trailhead's recommendation:
 * the first to second week of May for the turn-on, the second week of
 * October for the blowout. Ryan (or the scheduler, later) places the day;
 * nothing has a capacity. The words for each value are in ./format.
 */
export type TimingPreference = "earlier" | "recommended" | "later"

export type MarketingChannel = "email" | "sms"

/**
 * What the customer agreed to and where. Terms acceptance is required at
 * checkout; marketing is a separate opt-in. A change appends a new record
 * on the customer rather than editing this one, so the history is auditable.
 */
export interface Consent {
  /** ISO datetime the terms were accepted; absent when only marketing was recorded */
  termsAcceptedAt?: string
  /** `TERMS_VERSION` in src/lib/season-pass.ts at the time, e.g. "2026-11" */
  termsVersion?: string
  marketingOptIn: boolean
  marketingChannels: MarketingChannel[]
  source: "checkout" | "form" | "admin"
  recordedAt: string
}

export interface Client {
  id: string
  firstName: string
  town: Town
  jobberUrl: string
  hasPass: boolean
  lastVisitAt?: string
  /** the current consent record; the history lives in the CRM */
  consent?: Consent
}

export interface Visit {
  id: string
  clientId: string
  clientName: string
  town: Town
  kind: VisitKind
  status: VisitStatus
  startAt?: string
  isPass: boolean
  jobberUrl: string
}

export interface Quote {
  id: string
  clientName: string
  town: Town
  total: number
  sentAt: string
  status: "awaiting" | "approved" | "declined"
  jobberUrl: string
}

export interface Invoice {
  id: string
  clientName: string
  total: number
  issuedAt: string
  dueAt: string
  status: "paid" | "unpaid" | "overdue"
  jobberUrl: string
}

export interface PassVisit {
  kind: Exclude<VisitKind, "repair" | "install" | "other">
  /** the month the visit lands in: "May", "July", "October"; the preference on the pass carries the rest */
  window: string
  scheduledAt?: string
  completedAt?: string
  amount: number
  chargedAt?: string
}

export interface Pass {
  id: string
  number: string
  season: number
  clientId: string
  firstName: string
  town: Town
  zones: number
  turnOnPreference: TimingPreference
  blowoutPreference: TimingPreference
  status: PassStatus
  visits: PassVisit[]
  stripeUrl: string
  jobberUrl: string
  cardLast4?: string
  cardExpires?: string
  /** the consent recorded with the purchase */
  consent?: Consent
}

export interface MonthTotal {
  year: number
  /** 1 to 12 */
  month: number
  revenue: number
  visits: number
}

export interface Attention {
  kind: "charge-failed" | "jobs-failed" | "card-expiring"
  passId?: string
  message: string
  since: string
}

export interface AdminData {
  /** Trailhead is organization one; every row is scoped for a second branch later */
  organizationId: string
  syncedAt: string
  clients: Client[]
  visits: Visit[]
  quotes: Quote[]
  invoices: Invoice[]
  passes: Pass[]
  monthTotals: MonthTotal[]
  attention: Attention[]
}
