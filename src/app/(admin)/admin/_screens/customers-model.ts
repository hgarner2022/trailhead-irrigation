/**
 * The pure derivations behind CustomersScreen: one row per customer with
 * their normal data (full name, street, town, email, phone), their pass
 * (season and status), the next job's day and whether it has one, the last
 * visit and the marketing consent on record; plus the header's context line.
 * Hannah, 2026-11-12: "for customers we need to know, are they scheduled,
 * does something coming up need to be scheduled"; 2026-11-13: "I need normal
 * data". The next job is read off the visit rows, never off a preference.
 * Timestamps are read in Mountain time (`TIME_ZONE`).
 */
import type { AdminData, Client, Pass, PassStatus, Property, Visit, Yard } from "@/lib/admin/types"
import { TIME_ZONE, fullName, shortDate } from "@/lib/admin/format"
import { dayOf } from "@/lib/admin/calendar"
import { passVisitJob } from "@/lib/admin/jobs"
import { formatPhone } from "@/lib/format/contact"
import { consentLine } from "./passes-model"

export type NextState = "booked" | "to-schedule" | "none"
export type MarketingState = "yes" | "no" | "not-asked"

export interface CustomerRow {
  id: string
  /** full name where a last name is on record */
  name: string
  firstName: string
  /** the street line; absent for a caller without the write scope */
  address?: string
  town: Client["town"]
  email?: string
  phone?: string
  /** the pass status, or "none" */
  pass: PassStatus | "none"
  passId?: string
  /** the pass's season, with `pass` the status */
  season?: number
  nextState: NextState
  /** "Apr 26" when the next job has a day; "No day yet" when it has none; "Nothing ahead" */
  next: string
  /** the next job's day, for sorting; nothing when it has none */
  nextKey?: string
  lastVisitAt?: string
  marketing: MarketingState
}

/** The earliest calendar visit with a day on or after `today`, in Mountain time. */
function nextBookedDay(visits: Visit[], today: string): string | undefined {
  return visits
    .filter((v) => v.status === "scheduled" && v.startAt && dayOf(v.startAt, TIME_ZONE) >= today)
    .map((v) => dayOf(v.startAt!, TIME_ZONE))
    .sort()[0]
}

/** The earliest day an active pass's job has, on or after `today`, and whether a job on it still needs a day. */
function passJobs(pass: Pass | undefined, today: string): { day?: string; needsDay: boolean } {
  if (!pass || pass.status !== "active") return { needsDay: false }
  const jobs = pass.visits.map((v) => ({ v, job: passVisitJob(pass, v, today, TIME_ZONE) }))
  const days = jobs.filter(({ job }) => (job.state === "scheduled" || job.state === "routed") && job.day && job.day >= today).map(({ job }) => job.day!).sort()
  return { day: days[0], needsDay: jobs.some(({ job }) => job.state === "needs-a-day") }
}

export function customerRow(client: Client, passes: Pass[], visits: Visit[], today: string): CustomerRow {
  const todayDay = dayOf(today, TIME_ZONE)
  const pass = passes.find((p) => p.clientId === client.id && p.status === "active") ?? passes.find((p) => p.clientId === client.id)
  const mine = passJobs(pass, todayDay)
  const days = [nextBookedDay(visits, todayDay), mine.day].filter((d): d is string => Boolean(d)).sort()
  const day = days[0]
  const base = {
    id: client.id,
    name: fullName(client.firstName, client.lastName),
    firstName: client.firstName,
    ...(client.address ? { address: client.address } : {}),
    town: client.town,
    ...(client.email ? { email: client.email } : {}),
    ...(client.phone ? { phone: client.phone } : {}),
    pass: pass?.status ?? ("none" as const),
    ...(pass ? { passId: pass.id, season: pass.season } : {}),
    lastVisitAt: client.lastVisitAt,
    marketing: client.consent ? (client.consent.marketingOptIn ? ("yes" as const) : ("no" as const)) : ("not-asked" as const),
  }
  if (day) return { ...base, nextState: "booked", next: shortDate(day), nextKey: day }
  if (mine.needsDay) return { ...base, nextState: "to-schedule", next: "No day yet" }
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

/** "375 customers, 12 with a pass. 10 with no day yet, 3 scheduled ahead." or "No customers yet." */
export function customersContext(rows: CustomerRow[]): string {
  if (rows.length === 0) return "No customers yet."
  const withPass = rows.filter((r) => r.pass === "active").length
  const needDay = rows.filter((r) => r.nextState === "to-schedule").length
  const scheduled = rows.filter((r) => r.nextState === "booked").length
  return `${rows.length} customers, ${withPass} with a pass. ${needDay} with no day yet, ${scheduled} scheduled ahead.`
}

const SOURCE_WORDS: Record<NonNullable<Client["consent"]>["source"], string> = { checkout: "Checkout", form: "Form", admin: "Admin" }

export interface ConsentEntry {
  /** the day it was recorded, "Nov 12" */
  day: string
  source: string
  line: string
}

/** Every consent record the customer has, newest first: when, where it was recorded, and what it says. */
export function consentEntries(client: Pick<Client, "consent" | "consentHistory">): ConsentEntry[] {
  const records = client.consentHistory ?? (client.consent ? [client.consent] : [])
  return records.map((c) => ({ day: shortDate(c.recordedAt, TIME_ZONE), source: SOURCE_WORDS[c.source], line: consentLine(c) }))
}

export const NEXT_WORDS: Record<NextState, string> = { booked: "Scheduled", "to-schedule": "No day yet", none: "Nothing ahead" }
export const SCHEDULED_WORDS: Record<NextState, string> = { booked: "Yes", "to-schedule": "No", none: "No" }
export const MARKETING_WORDS: Record<MarketingState, string> = { yes: "Yes", no: "No", "not-asked": "Not asked" }

/** The yard a pass records: the fixtures (and a property no one has filled in) keep zones and the access answer on the pass. */
export function yardFromPass(pass: Pick<Pass, "zones" | "needsCustomerHome" | "accessNote"> | undefined): Yard | undefined {
  if (!pass) return undefined
  return { zones: pass.zones, mustBeHome: Boolean(pass.needsCustomerHome), ...(pass.accessNote ? { accessNote: pass.accessNote } : {}) }
}

/** The customer's properties: the rows the API sent, else (fixtures) one built from their newest pass. */
export function propertiesOf(client: Client, passes: Pass[]): Property[] {
  if (client.properties) return client.properties
  const pass = passes.find((p) => p.clientId === client.id && p.status === "active") ?? passes.find((p) => p.clientId === client.id)
  const yard = yardFromPass(pass)
  return yard ? [{ id: `property-${client.id}`, town: client.town, ...(client.address ? { address: client.address } : {}), ...yard }] : []
}

/**
 * What the Property block and the visit's "At the property" say, one line per fact that is set, in the order the crew reads
 * them. The gate code, the access note and the on-site phone go only to someone who may see contact details (a tech does not).
 */
export function propertyLines(yard: Yard | undefined, { canSeeContact }: { canSeeContact: boolean }): string[] {
  if (!yard) return []
  const phone = canSeeContact && yard.contactPhone ? formatPhone(yard.contactPhone) : ""
  const contact = [yard.contactName, phone].filter(Boolean).join(", ")
  return [
    ...(yard.zones ? [`${yard.zones} ${yard.zones === 1 ? "zone" : "zones"}`] : []),
    ...(yard.controller ? [yard.controller] : []),
    ...(yard.backflowLocation ? [`Backflow ${yard.backflowLocation}`] : []),
    ...(canSeeContact && yard.gateCode ? [`Gate code ${yard.gateCode}`] : []),
    ...(yard.mustBeHome ? ["Must be home"] : []),
    ...(canSeeContact && yard.accessNote ? [yard.accessNote] : []),
    ...(contact ? [`Contact ${contact}`] : []),
    ...(yard.notes ? [`Property notes ${yard.notes}`] : []),
  ]
}
