/**
 * Screen-facing types for the admin dashboard, checkout and pass page.
 * Screens and blocks read only these; they never see Jobber's or Stripe's
 * shapes. Dates are ISO strings. Money is whole dollars.
 */

import type { TimelineLine } from "@/lib/events/timeline"
import type { TaxRule } from "@/lib/jobs/tax"
import type { PhotoItem } from "@/lib/photos/types"

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

/**
 * One payment row as the screens hold it (`charge` in the database): whole dollars, negative for a refund. The money words
 * (Paid with how, Unpaid, Invoice sent, Failed) are read from these by `src/lib/money/words.ts` and nowhere else.
 */
export interface AdminPayment {
  id: string
  jobId?: string | null
  visitId?: string | null
  amount: number
  method: string
  status: string
  /** the Mountain day the money arrived */
  paidOn?: string | null
  refundsPaymentId?: string | null
  /** a check number or a Venmo handle; only for the write scope, never for a tech */
  reference?: string | null
}

/**
 * An invoice the office sent (`invoice`): the frozen lines are in the API; the screens need the dates, the amounts and the pay link.
 * Open while it is sent or overdue; a paid or canceled invoice is not carried here.
 */
export interface AdminInvoice {
  id: string
  jobId: string
  number: string
  /** whole dollars: the lines, the tax on them, and what is asked for */
  amount: number
  tax: number
  total: number
  /** Mountain calendar days */
  sentOn: string
  dueOn: string
  /** sent, or overdue once the day after `dueOn` has come */
  status: "sent" | "overdue"
  /** the visits its lines were invoiced after; empty when the lines name none, which means every visit of the job */
  visitIds: string[]
  /** the customer's pay link; only for the write scope, never for a tech */
  payUrl?: string
}

/** A job's money in words, from its lines and its payment rows: `words` is "Paid", "$115 unpaid" or "2 of 3 paid, $115 unpaid". */
export interface SoldJobMoney {
  paid: number
  total: number
  owed: number
  words: string
  /** the job owes money and has an open invoice; the words read Invoice sent */
  billSent?: boolean
}

export type VisitStatus = "unscheduled" | "scheduled" | "completed" | "cancelled"

/** `pending` is an unpaid checkout attempt; it expires after an hour and is never a customer. */
export type PassStatus = "pending" | "active" | "cancelled" | "lapsed"

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

/** What is true about a yard, as the property holds it. A field nobody set is absent. Gate code, access note and contact phone come only to a session with the write scope. */
export interface Yard {
  zones?: number
  controller?: string
  backflowLocation?: string
  gateCode?: string
  /** the customer must be there for a visit; the app offers area days to pick instead of placing one */
  mustBeHome: boolean
  accessNote?: string
  contactName?: string
  contactPhone?: string
  /** property notes: the yard's own, not any one visit's */
  notes?: string
}

/** A customer's property: the yard's nine facts and where it is. `address` only for a session with the write scope. */
export interface Property extends Yard {
  id: string
  address?: string
  town: Town
}

export interface Client {
  id: string
  /** the customer's story (events and messages), newest first; set for a customer of the app, absent in the fixtures */
  timeline?: TimelineLine[]
  firstName: string
  /** absent for customers the app has not asked a last name */
  lastName?: string
  /** contact details: the admin session sees them, read keys never do */
  email?: string
  phone?: string
  /** the street line of the property */
  address?: string
  town: Town
  jobberUrl: string
  hasPass: boolean
  /** the customer's properties, from the property rows; empty for a customer read from the Jobber mirror */
  properties?: Property[]
  /** a customer of the app (the office can add a visit for them), not only a client read from the Jobber mirror */
  app?: boolean
  lastVisitAt?: string
  /** the current consent record */
  consent?: Consent
  /** every consent record, newest first; it is append-only, so this is the audit trail */
  consentHistory?: Consent[]
  /** the card on file, one per customer; absent when there is none. Fixtures leave it off and the screens read it from the newest pass. */
  card?: ClientCard
}

/** The card on file as the Customers panel shows it. */
export interface ClientCard {
  brand?: string
  last4: string
  /** "2028-08" */
  expires?: string
  /** the last charge to it failed and has not been retried since */
  failedAt?: string
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
  /** the visit's story (its events and its messages), newest first; set for a visit of the app, absent in the fixtures */
  timeline?: TimelineLine[]
  clientId: string
  /** the customer's full name where the app has it */
  clientName: string
  town: Town
  kind: VisitKind
  status: VisitStatus
  startAt?: string
  isPass: boolean
  jobberUrl: string
  /** the row behind the job's state (src/lib/admin/jobs.ts): the day, the window start, done, charged, a failed charge */
  passId?: string
  scheduledOn?: string
  startTime?: string
  completedOn?: string
  chargeFailed?: boolean
  /** the visit's own payment rows, oldest first (a charged visit has one succeeded row); absent in the fixtures for a visit nothing was paid for */
  payments?: AdminPayment[]
  /** the visit was skipped (the admin shows Skipped; `status` stays cancelled for the calendar) */
  skipped?: boolean
  /** who the visit is assigned to; absent until the schedule places it */
  personId?: string
  /** that person's name, "Ryan Garner" */
  personName?: string
  /** the yard the visit is at; absent for a visit read from the Jobber mirror */
  property?: Yard
  /** the customer must be there and has not yet picked a day; the visit waits in the tray for them (scheduling flow, 2026-11-12) */
  awaitingPick?: boolean
  /** a time the customer has been promised (a told window, or a time on a one-off): moving it always texts them, so Move has no "without texting" (`timeBooked`) */
  timeBooked?: boolean
  /** Ryan moved it and asked the customer to reply YES (a property that must be home): Waiting on customer until they answer or the office clears it (`waitingVisitIds`); read from events, no column */
  waiting?: boolean
  /** a canceled visit's day before the cancel cleared it (YYYY-MM-DD), read from the `visit.cancelled` event; absent when it never had one */
  cancelledWas?: string
  /** 1-based position in the person's day; from Jobber's route tool while Jobber is the field display */
  stopOrder?: number
  /** the property's point, geocoded once when the customer is created */
  lat?: number
  lng?: number
  exception?: VisitException
  /** the job (pass or booked work) this visit belongs to */
  jobId?: string
  /** whole dollars the visit is worth, read from the visit's own line; 0 until priced */
  price?: number
  /** how long the stop takes */
  minutes?: number
  notes?: string
  /** why the last attempt did not happen, until the visit gets a day again */
  notDoneReason?: string
  /** the open invoice this visit's lines are on; its money reads Invoice sent */
  invoice?: AdminInvoice
  /** @deprecated alias for the fixtures: an invoice was sent and is not yet paid; live data reads `invoice` */
  billSent?: boolean
}

/** One sold line on a job: what the customer bought, copied from the service at the sale. */
export interface JobLine {
  id: string
  name: string
  /** what the visit includes, from the service at the sale */
  description?: string
  quantity: number
  /** whole dollars */
  unitPrice: number
  taxable: boolean
  /** set once the line is canceled; it then counts nothing */
  cancelledAt?: string
  /** the visit the line is invoiced after; absent for a line on the job as a whole */
  visitId?: string
}

/** The sold work a visit belongs to: a Season Pass (kind pass) or booked work. A visit is the stop; a job is what was sold. */
export interface SoldJob {
  id: string
  /** the job's story (its events: the sale, the visits, the pass, the notes), newest first; absent in the fixtures */
  timeline?: TimelineLine[]
  customerId: string
  /** derived (`jobKindOf`): a Season Pass is the job with a season, other work takes its first line's service kind */
  kind: "pass" | "repair" | "install" | "other"
  /** the job's stage, read from its facts (`stageOf`): never typed */
  status: "needs-a-quote" | "quoted" | "open" | "done" | "cancelled"
  /** whole dollars: the job total, absent while it is 0 */
  price?: number
  source: "checkout" | "office" | "site" | "renewal"
  /** the text of the newest note event about the job */
  notes?: string
  passId?: string
  /** the id the job's pass had before the pass became the job; an old link or alert key still opens it */
  legacyPassId?: string
  passNumber?: string
  /** the Mountain day the job was sold (`sold_on`), "2026-11-03"; absent while a pass is pending or a quote has not been accepted */
  soldOn?: string
  /** the days a quote went out and was accepted, when they have */
  quoteSentOn?: string
  quoteAcceptedOn?: string
  visitIds: string[]
  /** what was sold, oldest first; the lines are the truth for what the job costs */
  lines?: JobLine[]
  /** whole dollars: the lines added up, cancelled lines left out */
  total?: number
  /** every payment row on the job, oldest first, refunds included; absent in the fixtures */
  payments?: AdminPayment[]
  /** Paid, or the number owed, read from the lines and the payments; absent in the fixtures */
  money?: SoldJobMoney
  /** the invoice that is open on this job (sent or overdue), if there is one; its money reads Invoice sent */
  invoice?: AdminInvoice
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
  /** the Mountain day and start time behind `scheduledAt`, for the calendar links */
  scheduledOn?: string
  startTime?: string
  /** how long the window runs from `startTime`, in minutes; two hours when the row says nothing */
  windowMinutes?: number
  /** the newest charge attempt for this visit did not go through */
  chargeFailed?: boolean
  /** the signed link to the visit's .ics file, from the API */
  calendarUrl?: string
  id?: string
  /** the name of the person who has the visit, "Ryan Garner"; the pass page shows it beside the date */
  personName?: string
  completedAt?: string
  /** whole dollars, read from the visit's own line */
  amount: number
  /** what the visit includes, from the service at the sale (the visit's line) */
  description?: string
  /** the visit's own payment rows, oldest first (a charged visit has one succeeded row); absent in the fixtures for a visit nothing was paid for */
  payments?: AdminPayment[]
  notDoneReason?: string
  /** the open invoice this visit's lines are on; its money reads Invoice sent */
  invoice?: AdminInvoice
  /** @deprecated alias for the fixtures: an invoice was sent and is not yet paid */
  billSent?: boolean
}

export interface Pass {
  id: string
  number: string
  season: number
  clientId: string
  firstName: string
  lastName?: string
  town: Town
  zones: number
  turnOnPreference: TimingPreference
  blowoutPreference: TimingPreference
  status: PassStatus
  visits: PassVisit[]
  stripeUrl: string
  /** kept for the data's sake; no admin screen shows it any more */
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
  /** when the pass was started; a pending pass expires an hour after it */
  createdAt?: string
}

export interface MonthTotal {
  year: number
  /** 1 to 12 */
  month: number
  revenue: number
  visits: number
}

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"

/** The visit kinds a person's capacity is counted in; install rides under "other". */
export type CapacityKind = "turn-on" | "inspection" | "blowout" | "repair" | "other"

/** What a person is here: the owner, a manager (admin) or a tech. */
export type PersonRole = "owner" | "admin" | "tech"

/**
 * A person who works here: a row on the schedule when they have a truck to drive, with the days they work and how
 * many visits of each kind fit in their day. The truck is a label on them ("Truck 1"); an email lets them sign in.
 */
export interface Person {
  id: string
  name: string
  /** "RG" */
  initials: string
  email?: string
  phone?: string
  role: PersonRole
  /** the truck they usually drive, as a label: "Truck 1"; without one they are not on the schedule */
  truck?: string
  /** the Jobber user their visits are assigned to while Jobber is the field display */
  jobberUserId?: string
  workingDays: Weekday[]
  capacityByKind: Record<CapacityKind, number>
  /** ISO dates; the season they work, when it is shorter than the year */
  seasonStart?: string
  seasonEnd?: string
  /** the weekly working hours, "HH:MM"; absent reads as 09:00 to 17:00 (`hoursOf`) */
  hoursStart?: string
  hoursEnd?: string
}

/** The towns a person works on one day: one town or two or three that sit together. */
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

/** One customer message the app sends, in Trailhead's voice. The body may carry {firstName}, {visit}, {date}, {who} (the first name of the person on the visit) and {nextVisit}. A placeholder it does not know, such as the old {truck}, is left as written. */
export interface MessageTemplate {
  key: string
  channel: "email" | "sms"
  subject?: string
  body: string
  enabled: boolean
}

export type MessageKind =
  | "purchase-confirmation"
  | "booking-confirmation"
  | "visit-cancelled"
  | "date-set"
  | "date-moved"
  | "day-before"
  | "on-the-way"
  | "date-confirm"
  | "receipt"
  | "invoice"
  | "invoice-reminder"
  | "card-failed"
  | "card-expiring"
  | "cancelled"
  | "renewal"
  | "note"

/**
 * One email or text the app sent a customer and how it went. Messages are
 * one-way, and one per event (Hannah, 2026-11-13): text for timing (date
 * set, date moved, the day-before reminder), email for money and records
 * (confirmation, receipt, card failed, cancelled, renewal); a customer with
 * no mobile gets the timing messages by email. "On the way" is a text only, sent
 * from the visit panel's "On my way" button. Any change the customer wants goes
 * through the link in the message to their Trailhead account.
 */
export interface Message {
  id: string
  clientId: string
  passId?: string
  /** the job an invoice message is about (an invoice text is queued on the job, not a visit) */
  jobId?: string
  /** the visit the message was about, when it was about one */
  visitId?: string
  channel: "email" | "sms"
  kind: MessageKind
  /** the subject for an email, the text itself for an SMS */
  body: string
  at: string
  status: "queued" | "sent" | "delivered" | "failed" | "bounced"
}

/** How invoices are due and taxed (Settings › Billing). With the switch on, sales tax is part of every job's total, its visits' prices and its invoice. */
export interface BillingSettings {
  /** an invoice is due this many days after it is sent */
  dueDays: number
  /** whether an invoice adds Colorado sales tax to its taxable lines */
  collectsSalesTax: boolean
  /** percent, one decimal at most; used only while `collectsSalesTax` is on */
  salesTaxPercent: number
}

/** Everything the Settings page edits; the scheduler reads it on its next run. */
export interface OrganizationSettings {
  /** everyone who works here, owners first; the ones with a truck are the schedule's rows */
  people: Person[]
  areas: AreaGroup[]
  windows: SeasonWindow[]
  /** percent of a person's day held back for repairs and weather in a season's first two weeks */
  bufferPercentEarly: number
  /** the same after the first two weeks */
  bufferPercentLate: number
  /** fall runs north and high first, where the first hard freeze lands */
  fallTownOrder: Town[]
  /** spring runs the other way */
  springTownOrder: Town[]
  messages: MessageTemplate[]
  billing: BillingSettings
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

/** Busy time on a person from their Jobber calendar feed; the scheduler and the pass page's day picker subtract it. */
export interface BusyBlock {
  personId: string
  /** ISO instants */
  startAt: string
  endAt: string
  title: string
}

export interface Attention {
  /** what Dismiss records with `kind`: a stored alert's key, or the pass, visit or task the row is worked out from */
  key?: string
  kind: "new-pass" | "pending-pass" | "owed" | "charge-not-pressed" | "overdue" | "charge-failed" | "no-card" | "jobs-failed" | "card-expiring" | "not-closed" | "pass-cancelled" | "scheduled" | "unplaced" | "customer-changed"
  passId?: string
  /** the visit an unplaced alert is about; Home links to it on the Schedule. An owed row names the job's done visit, which opens its panel */
  visitId?: string
  /** the job an owed row, or an overdue invoice's row, is about */
  jobId?: string
  /** whole dollars: what a Charge not pressed row's button will charge */
  amount?: number
  /** the invoice an overdue row is about: what Remind sends the reminder of */
  invoiceId?: string
  /** the customer an overdue row's invoice is to: the row opens their panel on Customers, where the invoice is */
  customerId?: string
  message: string
  since: string
  /** a queue failure: the task kind, and the queue rows Retry puts back in line */
  queueKind?: string
  queueIds?: string[]
  /** a grouped row (several failures with one cause): the rows it stands for, which Dismiss clears together */
  members?: Attention[]
}

/** One service in the catalogue, as `services.list` sends it (inactive ones too; the New job sheet offers the active ones). Absent from the fixtures, where the screens read the catalogue in `src/lib/services.ts`, which has no id and none of the three flags. */
export interface ServiceItem {
  /** the database row; what `services.update` takes. Absent from the site's own catalogue */
  id?: string
  key: string
  /** read as not taxable when absent */
  taxable?: boolean
  /** read as active when absent; false once deactivated */
  active?: boolean
  bookable?: boolean
  name: string
  description: string | null
  kind: string
  minZones?: number
  maxZones?: number
  includedZones?: number
  /** whole dollars; absent when the service is quoted */
  price?: number
  extraZonePrice?: number
  slotMinutes: number
  quoteOnly: boolean
  /** the span of the year a visit's day may fall in, "MM-DD" each, repeating yearly; both empty is all year (`src/lib/services-window.ts`) */
  bookableFrom?: string | null
  bookableTo?: string | null
}

export interface AdminData {
  /** Trailhead is organization one; every row is scoped for a second branch later */
  organizationId: string
  syncedAt: string
  clients: Client[]
  visits: Visit[]
  /** the sold work, with its visits; absent in the fixtures */
  jobs?: SoldJob[]
  quotes: Quote[]
  invoices: Invoice[]
  passes: Pass[]
  monthTotals: MonthTotal[]
  attention: Attention[]
  settings: OrganizationSettings
  /** the sales tax rule (`settings.billing`) every total on a screen carries; absent in the fixtures, where nothing is taxed */
  billing?: TaxRule
  settingsChanges: SettingsChange[]
  /** every message to or from a customer, newest last */
  messages: Message[]
  /** busy time read from the people's Jobber calendar feeds; absent in the fixtures */
  blocks?: BusyBlock[]
  /** every service in the catalogue, by key, inactive ones included; absent in the fixtures */
  services?: ServiceItem[]
  /** the photos the caller may see, oldest first (a tech's only for the visits they had); the panels group them by visit; absent in the fixtures */
  photos?: PhotoItem[]
  /** whether the photo store is connected; false says "Photos are not set up yet."; absent means connected */
  photosConfigured?: boolean
}
