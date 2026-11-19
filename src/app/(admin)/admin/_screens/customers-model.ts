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
import type { AdminData, Client, ClientCard, Pass, PassStatus, Property, SoldJob, Visit, Yard } from "@/lib/admin/types"
import { TIME_ZONE, fullName, shortDate } from "@/lib/admin/format"
import { dayOf } from "@/lib/admin/calendar"
import { passVisitJob } from "@/lib/admin/jobs"
import { formatPhone } from "@/lib/format/contact"
import { jobTitle } from "./jobs-model"
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
  /** the pass's number, "TH-2027-0007" */
  passNumber?: string
  /** the pass's season, with `pass` the status */
  season?: number
  /** the newest open job (any kind: a repair, an installation, the pass), what the Job fact names; none when every job is done or canceled */
  job?: { id: string; title: string; isPass: boolean }
  nextState: NextState
  /** "Apr 26" when the next job has a day; "Unscheduled" when it has none; "Nothing ahead" */
  next: string
  /** the next job's day, for sorting; nothing when it has none */
  nextKey?: string
  lastVisitAt?: string
  /** whole dollars the customer owes now: the unpaid of every job, a Season Pass's charges that are not yet due left out (the words of `jobMoney`) */
  unpaid: number
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

/** A job still being worked: a quote is out or waiting, or it is open. A pass nobody has paid for is not a job yet. */
const isOpenJob = (j: SoldJob) => (j.status === "open" || j.status === "needs-a-quote" || j.status === "quoted") && !(j.kind === "pass" && !j.soldOn)

/** The customer's newest open job: the latest sale first, whatever it is. */
function newestOpenJob(jobs: SoldJob[]): CustomerRow["job"] {
  const job = jobs.filter(isOpenJob).sort((a, b) => (b.soldOn ?? "").localeCompare(a.soldOn ?? ""))[0]
  return job ? { id: job.id, title: jobTitle(job), isPass: job.kind === "pass" } : undefined
}

/**
 * One customer's row. The facts count every job the customer has, not only the pass: Job is the newest open job's name, Next
 * the next visit with a day on any job, Scheduled yes when one is ahead, and Unscheduled when a visit of a pass or of a
 * one-off job still has no day.
 */
/** What the customer owes now: a canceled job holds nothing, and a pass's later visits are charged to the card after each visit, so neither counts (Home's Unpaid says the same). */
export function unpaidOf(jobs: readonly SoldJob[]): number {
  return jobs.reduce((sum, j) => (j.status === "cancelled" || !j.money || j.money.words.endsWith("charged after each visit") ? sum : sum + j.money.owed), 0)
}

export function customerRow(client: Client, passes: Pass[], visits: Visit[], today: string, jobs: SoldJob[] = []): CustomerRow {
  const todayDay = dayOf(today, TIME_ZONE)
  const pass = passes.find((p) => p.clientId === client.id && p.status === "active") ?? passes.find((p) => p.clientId === client.id)
  const mine = passJobs(pass, todayDay)
  const days = [nextBookedDay(visits, todayDay), mine.day].filter((d): d is string => Boolean(d)).sort()
  const day = days[0]
  // A one-off job's visit with no day (a pass's own are read above): the app owns it, so it has a job.
  const oneOffWaiting = visits.some((v) => v.jobId && !v.isPass && !v.passId && v.status === "unscheduled" && !v.startAt)
  const job = newestOpenJob(jobs)
  const base = {
    id: client.id,
    name: fullName(client.firstName, client.lastName),
    firstName: client.firstName,
    ...(client.address ? { address: client.address } : {}),
    town: client.town,
    ...(client.email ? { email: client.email } : {}),
    ...(client.phone ? { phone: client.phone } : {}),
    pass: pass?.status ?? ("none" as const),
    ...(pass ? { passId: pass.id, passNumber: pass.number, season: pass.season } : {}),
    ...(job ? { job } : {}),
    lastVisitAt: client.lastVisitAt,
    unpaid: unpaidOf(jobs),
    marketing: client.consent ? (client.consent.marketingOptIn ? ("yes" as const) : ("no" as const)) : ("not-asked" as const),
  }
  if (day) return { ...base, nextState: "booked", next: shortDate(day), nextKey: day }
  if (mine.needsDay || oneOffWaiting) return { ...base, nextState: "to-schedule", next: "Unscheduled" }
  return { ...base, nextState: "none", next: "Nothing ahead" }
}

const byClient = (visits: Visit[]) => {
  const map = new Map<string, Visit[]>()
  for (const v of visits) map.set(v.clientId, [...(map.get(v.clientId) ?? []), v])
  return map
}

/** Every customer as a row, in the order given. */
export function customerRows(data: Pick<AdminData, "clients" | "passes" | "visits" | "jobs">, today: string): CustomerRow[] {
  const visits = byClient(data.visits)
  const jobs = new Map<string, SoldJob[]>()
  for (const j of data.jobs ?? []) jobs.set(j.customerId, [...(jobs.get(j.customerId) ?? []), j])
  return data.clients.map((c) => customerRow(c, data.passes, visits.get(c.id) ?? [], today, jobs.get(c.id) ?? []))
}

/** "375 customers, 12 with a pass. 10 unscheduled, 3 scheduled ahead." or "No customers yet." */
export function customersContext(rows: CustomerRow[]): string {
  if (rows.length === 0) return "No customers yet."
  const withPass = rows.filter((r) => r.pass === "active").length
  const needDay = rows.filter((r) => r.nextState === "to-schedule").length
  const scheduled = rows.filter((r) => r.nextState === "booked").length
  return `${rows.length} customers, ${withPass} with a pass. ${needDay} unscheduled, ${scheduled} scheduled ahead.`
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

export const NEXT_WORDS: Record<NextState, string> = { booked: "Scheduled", "to-schedule": "Unscheduled", none: "Nothing ahead" }
export const SCHEDULED_WORDS: Record<NextState, string> = { booked: "Yes", "to-schedule": "No", none: "No" }
export const MARKETING_WORDS: Record<MarketingState, string> = { yes: "Yes", no: "No", "not-asked": "Not asked" }

/** The yard a pass records: the fixtures (and a property no one has filled in) keep zones and the access answer on the pass. */
export function yardFromPass(pass: Pick<Pass, "zones" | "needsCustomerHome" | "accessNote"> | undefined): Yard | undefined {
  if (!pass) return undefined
  return { zones: pass.zones, mustBeHome: Boolean(pass.needsCustomerHome), ...(pass.accessNote ? { accessNote: pass.accessNote } : {}) }
}

/** "Visa ending 4242, expires 08/28"; "Ending 4242" with no brand (it sits under the label Card, so it never says Card twice); "No card on file" with none. */
export function customerCardWords(card: ClientCard | undefined): string {
  if (!card) return "No card on file"
  const brand = card.brand ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1) : ""
  const ending = `${brand ? `${brand} ending` : "Ending"} ${card.last4}`
  return card.expires ? `${ending}, expires ${card.expires.slice(5, 7)}/${card.expires.slice(2, 4)}` : ending
}

/** The customer's card: the one the API sent, else (fixtures) the card on their newest pass. */
export function cardOf(client: Client, passes: Pass[]): ClientCard | undefined {
  if (client.card) return client.card
  // A customer the API sent (it sends their properties) with no card has none: a pass never speaks for them.
  if (client.properties) return undefined
  const mine = passes.filter((p) => p.clientId === client.id && p.cardLast4)
  const pass = mine.find((p) => p.status === "active") ?? mine[0]
  return pass?.cardLast4 ? { last4: pass.cardLast4, ...(pass.cardExpires ? { expires: pass.cardExpires } : {}), ...(pass.cardFailedAt ? { failedAt: pass.cardFailedAt } : {}) } : undefined
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
