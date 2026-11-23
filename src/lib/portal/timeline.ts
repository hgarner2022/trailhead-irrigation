// The customer's one timeline, derived and pure (docs/plans/2026-11-18-customer-portal-architecture.md section 5, design section 3): every visit of every
// job in time order, split Upcoming and Past, each row with its job's name, its person's first name (only once the window was told), its day, its pill and
// its money word. Nothing here is stored: it reads the customer-safe `PortalJob`s and `PortalCustomer` the API sends. A customer has visits, a Season
// Pass and invoices; "job", "line", "stage" and "request" never appear. The words come only from `./words`.
import type { PortalCustomerType, PortalJobType, PortalVisitType } from "@/api/v1/portal/schemas"
import { monthDay } from "@/emails/format"
import { waitingDay } from "./preference-words"
import { timelineDay, upcomingMoney, visitDay, visitPill, type MoneyTone, type VisitPill } from "./words"

export interface TimelineRow {
  id: string
  jobId: string
  /** the visit page */
  href: string
  /** the day the row sorts by: the day it was done, the day it was canceled, or its booked day; null while it has none */
  day: string | null
  /** "Tue, Apr 28" ("Tue, Apr 28, 2027" in another year); for a visit with no day its preference with the real days ("Our recommended, Oct 1 to Oct 15") or "Not scheduled yet" */
  dayWords: string
  /** the line under a visit with no day: "We'll schedule it about two weeks before and tell you the day."; null for any other row */
  note: string | null
  /** "Spring turn-on" */
  service: string
  /** "Season Pass 2027" for a pass visit, else null */
  label: string | null
  /** the street, only when the customer has more than one property */
  street: string | null
  /** the first name of who is coming, only once the window was told */
  who: string | null
  /** the money line: "$145, charged after the visit", "$145 · Paid", "$115 unpaid", "Invoice sent, due Dec 1", "Past due since Dec 1", or "" */
  money: string
  tone: MoneyTone
  pill: VisitPill
  /** the payment whose receipt the row links to, on a paid visit */
  receiptId: string | null
  /** the visit and job as the API sent them, for the screens that need more */
  visit: PortalVisitType
  job: PortalJobType
}

export interface PortalTimeline {
  upcoming: TimelineRow[]
  past: TimelineRow[]
  /** the customer's street lines when there are two or more (the Visits filter), else empty */
  streets: string[]
}

const GONE = ["cancelled", "skipped"]

const isUpcoming = (job: PortalJobType, v: PortalVisitType, today: string) =>
  !job.canceled && (job.open || v.status === "scheduled") && (v.status === "unscheduled" || (v.status === "scheduled" && (v.scheduledOn ?? "") >= today))

function rowOf(job: PortalJobType, v: PortalVisitType, customer: Pick<PortalCustomerType, "card" | "properties">, today: string, upcoming: boolean): TimelineRow {
  const gone = GONE.includes(v.status)
  const day = gone ? v.canceledOn : visitDay(v)
  const waiting = !gone && !day ? waitingDay(v.kind, v.preference) : null
  const money = v.money.tone !== "none" ? (v.money.tone === "paid" && v.price > 0 ? `$${v.price} · ${v.money.label}` : v.money.label) : upcoming ? upcomingMoney(v.price, Boolean(customer.card?.last4)) : ""
  return {
    id: v.id,
    jobId: job.id,
    href: `/account/visits/${v.id}`,
    day,
    dayWords: gone && day ? `Canceled ${monthDay(day)}${day.slice(0, 4) === today.slice(0, 4) ? "" : `, ${day.slice(0, 4)}`}` : day ? timelineDay(day, today) : (waiting?.heading ?? ""),
    note: waiting?.detail ?? null,
    service: v.name,
    label: job.season !== null ? job.name : null,
    street: customer.properties.length > 1 ? job.address : null,
    who: v.windowTold ? v.personFirstName : null,
    money,
    tone: v.money.tone !== "none" ? v.money.tone : "none",
    pill: visitPill({ status: v.status, notDoneReason: v.notDoneReason }),
    receiptId: v.money.tone === "paid" ? (v.money.paymentIds.at(-1) ?? null) : null,
    visit: v,
    job,
  }
}

/** Upcoming: booked days from today on (soonest first), then visits still waiting for a day. Past: everything else, newest first; a canceled visit sits by the day it was canceled. */
export function portalTimeline(customer: Pick<PortalCustomerType, "card" | "properties">, jobs: readonly PortalJobType[], today: string): PortalTimeline {
  const upcoming: TimelineRow[] = []
  const past: TimelineRow[] = []
  for (const job of jobs) {
    for (const v of job.visits) {
      if (isUpcoming(job, v, today)) upcoming.push(rowOf(job, v, customer, today, true))
      else past.push(rowOf(job, v, customer, today, false))
    }
  }
  // on one day a canceled row sits after the done and booked ones
  const goneLast = (a: TimelineRow, b: TimelineRow) => Number(GONE.includes(a.visit.status)) - Number(GONE.includes(b.visit.status))
  const byDay = (a: TimelineRow, b: TimelineRow) => (a.day ?? "9999-12-31").localeCompare(b.day ?? "9999-12-31") || goneLast(a, b) || a.id.localeCompare(b.id)
  upcoming.sort(byDay)
  past.sort((a, b) => (b.day ?? "").localeCompare(a.day ?? "") || goneLast(a, b) || a.id.localeCompare(b.id))
  const streets = customer.properties.length > 1 ? [...new Set(jobs.map((j) => j.address).filter(Boolean))] : []
  return { upcoming, past, streets }
}

/** The next visit on the account: the first upcoming row (a booked day before one still waiting for a day); null when there is none. */
export const nextRow = (timeline: PortalTimeline): TimelineRow | null => timeline.upcoming[0] ?? null
