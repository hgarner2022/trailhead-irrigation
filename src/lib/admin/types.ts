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

/**
 * A move Ryan made in Jobber after the app placed the visit. The app accepts
 * it and logs it here instead of treating its own choice as the truth.
 */
export interface VisitException {
  kind: "moved-in-jobber"
  at: string
  note: string
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
  /** the truck the visit rides on; absent until the schedule places it */
  truckId?: string
  /** the customer must be there and has not yet picked a day; the visit waits in the tray for them (scheduling flow, 2026-11-12) */
  awaitingPick?: boolean
  /** 1-based position in the truck's day; from Jobber's route tool while Jobber is the field display */
  stopOrder?: number
  /** the property's point, geocoded once when the customer is created */
  lat?: number
  lng?: number
  exception?: VisitException
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
  /** the last charge on the card failed and has not been retried since; the pass page puts it first */
  cardFailedAt?: string
  /** the customer must be there for a visit; the app offers area days to pick instead of placing one */
  needsCustomerHome?: boolean
  /** gate code, dog, where the controller is */
  accessNote?: string
}

export interface MonthTotal {
  year: number
  /** 1 to 12 */
  month: number
  revenue: number
  visits: number
}

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"

/** The visit kinds a truck's capacity is counted in; install rides under "other". */
export type CapacityKind = "turn-on" | "inspection" | "blowout" | "repair" | "other"

/** A truck is a row, not a count: its working days and how many visits of each kind fit in its day. */
export interface Truck {
  id: string
  name: string
  /** the Jobber user the truck's visits are assigned to while Jobber is the field display */
  jobberUserId?: string
  workingDays: Weekday[]
  capacityByKind: Record<CapacityKind, number>
}

/** The towns a truck works on one day: one town or two or three that sit together. */
export interface AreaGroup {
  id: string
  name: string
  towns: Town[]
}

/** When a season's pass visits may land, and how many weeks ahead the scheduler opens it. */
export interface SeasonWindow {
  kind: "turn-on" | "inspection" | "blowout"
  /** ISO dates */
  opensOn: string
  closesOn: string
  leadWeeks: number
}

/** One customer message the app sends, in Trailhead's voice. The body may carry {firstName}, {visit}, {date} and {truck}. */
export interface MessageTemplate {
  key: string
  channel: "email" | "sms"
  subject?: string
  body: string
  enabled: boolean
}

export type MessageKind =
  | "purchase-confirmation"
  | "date-set"
  | "date-moved"
  | "day-before"
  | "receipt"
  | "card-failed"
  | "cancelled"
  | "renewal"

/**
 * One email or text the app sent a customer and how it went. Messages are
 * one-way, and one per event (Hannah, 2026-11-13): text for timing (date
 * set, date moved, the day-before reminder), email for money and records
 * (confirmation, receipt, card failed, cancelled, renewal); a customer with
 * no mobile gets the timing messages by email. "On my way" is Ryan's own
 * phone, never the app. Any change the customer wants goes through the link
 * in the message to their pass page.
 */
export interface Message {
  id: string
  clientId: string
  passId?: string
  channel: "email" | "sms"
  kind: MessageKind
  /** the subject for an email, the text itself for an SMS */
  body: string
  at: string
  status: "queued" | "sent" | "delivered" | "failed" | "bounced"
}

/** Everything the Settings page edits; the scheduler reads it on its next run. */
export interface OrganizationSettings {
  trucks: Truck[]
  areas: AreaGroup[]
  windows: SeasonWindow[]
  /** percent of a truck-day held back for repairs and weather in a season's first two weeks */
  bufferPercentEarly: number
  /** the same after the first two weeks */
  bufferPercentLate: number
  /** fall runs north and high first, where the first hard freeze lands */
  fallTownOrder: Town[]
  /** spring runs the other way */
  springTownOrder: Town[]
  messages: MessageTemplate[]
}

/** One edit to the settings: who, when, which field, and the value before and after, as words. */
export interface SettingsChange {
  id: string
  at: string
  who: string
  field: string
  from: string
  to: string
}

/** Busy time on a truck from its Jobber calendar feed; the scheduler and the pass page's day picker subtract it. */
export interface BusyBlock {
  truckId: string
  /** ISO instants */
  startAt: string
  endAt: string
  title: string
}

export interface Attention {
  kind: "charge-failed" | "jobs-failed" | "card-expiring" | "not-closed" | "pass-cancelled"
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
  settings: OrganizationSettings
  settingsChanges: SettingsChange[]
  /** every message to or from a customer, newest last */
  messages: Message[]
  /** busy time read from the trucks' Jobber calendar feeds; absent in the fixtures */
  blocks?: BusyBlock[]
}
