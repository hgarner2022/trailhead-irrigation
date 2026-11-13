/**
 * The pure derivations behind CustomersScreen: one row per customer with
 * their pass, what is next for them (a booked visit, a pass visit still to
 * schedule, or nothing ahead), their last visit and the marketing consent on
 * record; plus the header's context line. Hannah, 2026-11-12: "for customers
 * we need to know, are they scheduled, does something coming up need to be
 * scheduled". Timestamps are read in Mountain time (`TIME_ZONE`).
 */
import type { AdminData, Client, Pass, PassStatus, PassVisit, Visit } from "@/lib/admin/types"
import { KIND_WORDS, TIME_ZONE, preferenceOf, preferencePhrase, shortDate } from "@/lib/admin/format"
import { visitMonth } from "@/lib/admin/metrics"

export type NextState = "booked" | "to-schedule" | "none"
export type MarketingState = "yes" | "no" | "not-asked"

export interface CustomerRow {
  id: string
  firstName: string
  town: Client["town"]
  jobberUrl: string
  /** the pass status, or "none" */
  pass: PassStatus | "none"
  passId?: string
  nextState: NextState
  /** "Blowout, Oct 5" when booked; "Turn-on, early May" when still to schedule; "Nothing ahead" */
  next: string
  /** the day the next visit is or is wanted, for sorting; nothing with nothing ahead */
  nextKey?: string
  lastVisitAt?: string
  marketing: MarketingState
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** The pass visit still to come: the first one not completed. */
const nextPassVisit = (pass: Pass): PassVisit | undefined => pass.visits.find((v) => !v.completedAt)

/** The first day of the month a pass visit lands in, as a sort key. */
function windowKey(pass: Pass, visit: PassVisit): string | undefined {
  const month = visitMonth(visit)
  return month ? `${pass.season}-${String(month).padStart(2, "0")}-01` : undefined
}

/** The earliest Jobber visit on or after `today` that is on the calendar. */
function nextBooked(visits: Visit[], today: string): Visit | undefined {
  const day = today.slice(0, 10)
  return visits
    .filter((v) => v.status === "scheduled" && v.startAt && v.startAt.slice(0, 10) >= day)
    .sort((a, b) => (a.startAt ?? "").localeCompare(b.startAt ?? ""))[0]
}

export function customerRow(client: Client, passes: Pass[], visits: Visit[], today: string): CustomerRow {
  const pass = passes.find((p) => p.clientId === client.id && p.status === "active") ?? passes.find((p) => p.clientId === client.id)
  const booked = nextBooked(visits, today)
  const waiting = pass && pass.status === "active" ? nextPassVisit(pass) : undefined
  const base = {
    id: client.id,
    firstName: client.firstName,
    town: client.town,
    jobberUrl: client.jobberUrl,
    pass: pass?.status ?? ("none" as const),
    passId: pass?.id,
    lastVisitAt: client.lastVisitAt,
    marketing: client.consent ? (client.consent.marketingOptIn ? ("yes" as const) : ("no" as const)) : ("not-asked" as const),
  }
  // A pass visit with a day is on the Jobber calendar too, so `booked` already covers it.
  if (booked) {
    return { ...base, nextState: "booked", next: `${capital(KIND_WORDS[booked.kind])}, ${shortDate(booked.startAt!, TIME_ZONE)}`, nextKey: booked.startAt!.slice(0, 10) }
  }
  if (waiting && pass) {
    const preference = preferenceOf(pass, waiting.kind)
    const when = preference && waiting.kind !== "inspection" ? preferencePhrase(waiting.kind, preference) : waiting.window
    return { ...base, nextState: "to-schedule", next: `${capital(KIND_WORDS[waiting.kind])}, ${when}`, nextKey: windowKey(pass, waiting) }
  }
  return { ...base, nextState: "none", next: "Nothing ahead" }
}

const byClient = (visits: Visit[]) => {
  const map = new Map<string, Visit[]>()
  for (const v of visits) map.set(v.clientId, [...(map.get(v.clientId) ?? []), v])
  return map
}

/** Every customer as a row, in the order given. */
export function customerRows(data: Pick<AdminData, "clients" | "passes" | "visits">, today: string): CustomerRow[] {
  const visits = byClient(data.visits)
  return data.clients.map((c) => customerRow(c, data.passes, visits.get(c.id) ?? [], today))
}

/** "375 customers, 12 with a pass. 10 to schedule, 3 booked ahead." or "No customers yet." */
export function customersContext(rows: CustomerRow[]): string {
  if (rows.length === 0) return "No customers yet."
  const withPass = rows.filter((r) => r.pass === "active").length
  const toSchedule = rows.filter((r) => r.nextState === "to-schedule").length
  const booked = rows.filter((r) => r.nextState === "booked").length
  return `${rows.length} customers, ${withPass} with a pass. ${toSchedule} to schedule, ${booked} booked ahead.`
}

export const NEXT_WORDS: Record<NextState, string> = { booked: "Booked", "to-schedule": "To schedule", none: "Nothing ahead" }
export const MARKETING_WORDS: Record<MarketingState, string> = { yes: "Yes", no: "No", "not-asked": "Not asked" }
