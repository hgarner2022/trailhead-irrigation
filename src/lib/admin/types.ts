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

export interface Client {
  id: string
  firstName: string
  town: Town
  jobberUrl: string
  hasPass: boolean
  lastVisitAt?: string
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
  /** e.g. "April to May", "July", "October, week of the 13th" */
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
  /** ISO date of the Monday */
  blowoutWeek: string
  status: PassStatus
  visits: PassVisit[]
  stripeUrl: string
  jobberUrl: string
  cardLast4?: string
  cardExpires?: string
}

export interface BlowoutWeek {
  season: number
  weekStart: string
  capacity: number
  taken: number
  towns: Town[]
}

export interface MonthTotal {
  year: number
  /** 1 to 12 */
  month: number
  revenue: number
  visits: number
}

export interface Attention {
  kind: "charge-failed" | "jobs-failed" | "week-full" | "card-expiring"
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
  blowoutWeeks: BlowoutWeek[]
  monthTotals: MonthTotal[]
  attention: Attention[]
}
