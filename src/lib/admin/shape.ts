/**
 * Database rows (as the API returns them) to the screen-facing `AdminData`.
 * Pure: `live.ts` fetches, this shapes, and the tests run it on a seeded
 * database. Calendar days are Mountain time; instants are ISO strings.
 */
import { zonedToUtc } from "./calendar"
import { fullName } from "./format"
import { NOT_CLOSED_LOOKBACK_DAYS, visitJob } from "./jobs"
import type {
  SoldJob, AdminData, Attention, BusyBlock, Client, Consent, Invoice, Message, MessageKind, MonthTotal, Pass, PassVisit, Quote, SettingsChange,
  Truck, AreaGroup, OrganizationSettings, Town, Visit, VisitKind, VisitStatus,
} from "./types"

const ZONE = "America/Denver"
const DEFAULT_START = "08:00"
const DAY_MS = 86_400_000

export interface ApiVisit {
  id: string; jobId?: string; notes?: string | null; passId: string | null; bookingId: string | null; customerId: string; firstName: string; town: Town; kind: string; status: string
  window: string | null; amount: number; preference: string | null; awaitingPick: boolean; truckId: string | null; scheduledOn: string | null
  notDoneReason?: string | null; paidBy?: string | null; paymentStatus?: string; startTime: string | null; durationMinutes?: number | null; truckName?: string | null; stopOrder: number | null; completedOn: string | null; chargedAt: string | null
  exception: { kind: "moved-in-jobber"; at: string; note: string } | null; lat: number | null; lng: number | null
}
export interface ApiPass {
  id: string; number: string; season: number; customerId: string; firstName: string; town: Town; zones: number; status: string
  turnOnPreference: Pass["turnOnPreference"]; blowoutPreference: Pass["blowoutPreference"]; needsCustomerHome: boolean
  accessNote?: string | null; cardLast4: string | null; cardExpires: string | null; cardFailedAt: string | null; cancelledAt: string | null; createdAt?: string
}
export interface ApiCustomer { id: string; firstName: string; lastName?: string | null; email?: string | null; phone?: string | null; address?: string | null; town: Town | null; hasPass: boolean }
export interface ApiMessage { id: string; customerId: string; visitId: string | null; channel: "email" | "sms"; kind: string; subject: string | null; body: string; status: Message["status"]; sentAt: string | null; createdAt: string }
export interface ConsentRow { customerId: string; termsAcceptedAt: Date | null; termsVersion: string | null; marketingOptIn: boolean; marketingChannels: ("email" | "sms")[]; source: string; recordedAt: Date }
export interface MirrorClient { id: string; firstName: string | null; lastName?: string | null; email?: string | null; phone?: string | null; town: Town | null; jobberUrl: string | null }
export interface MirrorVisit { id: string; clientId: string | null; kind: string | null; town: Town | null; startAt: Date | null; completedAt: Date | null; jobberUrl: string | null }
export interface MirrorJob { id: string; clientId: string | null; jobberUrl: string | null }
export interface MirrorQuote { id: string; clientName: string | null; town: Town | null; total: number | null; sentAt: Date | null; status: Quote["status"] | null; jobberUrl: string | null }
export interface MirrorInvoice { id: string; clientName: string | null; total: number | null; issuedAt: Date | null; dueAt: Date | null; status: Invoice["status"] | null; jobberUrl: string | null }
export interface JobRow { id: string; customerId: string; kind: SoldJob["kind"]; status: SoldJob["status"]; price: number | null; source: SoldJob["source"]; notes: string | null }
export interface QueueProblem { kind: string; lastError: string | null; updatedAt: Date; status: string }

/** `key` is what the alert is about: a visit's id for an unplaced visit. */
export interface AlertRow { kind: string; key?: string; passId: string | null; message: string; createdAt: Date }

export interface ShapeInput {
  organizationId: string
  now: Date
  today: string
  syncedAt: Date
  customers: ApiCustomer[]
  /** customer id to Jobber client id, for the customers the mirror already knows */
  jobberClientOf: Map<string, string>
  consents: ConsentRow[]
  visits: ApiVisit[]
  passes: ApiPass[]
  messages: ApiMessage[]
  trucks: Truck[]
  areas: AreaGroup[]
  settings: Omit<OrganizationSettings, "trucks" | "areas">
  settingsChanges: SettingsChange[]
  mirror: { clients: MirrorClient[]; visits: MirrorVisit[]; jobsWithoutVisit: MirrorJob[]; quotes: MirrorQuote[]; invoices: MirrorInvoice[] }
  queueProblems: QueueProblem[]
  /** the visits whose newest charge attempt did not go through */
  failedChargeVisitIds?: string[]
  /** unresolved free-form alerts (a new Season Pass); absent in the fixtures */
  alerts?: AlertRow[]
  /** the (kind, key) of rows Home must not show again: dismissed by the office */
  dismissed?: { kind: string; key: string }[]
  /** the job rows; absent in the fixtures */
  jobRows?: JobRow[]
  blocks: BusyBlock[]
}

/** What the newest charge and the last not-done say about a visit: the reason, how it was paid, a bill waiting. */
const money = (v: Pick<ApiVisit, "notDoneReason" | "paidBy" | "paymentStatus">) => ({
  ...(v.notDoneReason ? { notDoneReason: v.notDoneReason } : {}),
  ...(v.paymentStatus === "paid" && v.paidBy ? { paidMethod: v.paidBy } : {}),
  ...(v.paymentStatus === "pending" && v.paidBy === "bill" ? { billSent: true } : {}),
})

const toKind = (k: string): VisitKind => (k === "turn-on" || k === "inspection" || k === "blowout" || k === "repair" || k === "install" ? k : "other")
/** The visits whose newest charge attempt failed: a retry that went through clears the earlier failure. */
export function failedChargeVisits(rows: { visitId: string; attempt: number; status: string }[]): string[] {
  const newest = new Map<string, { attempt: number; status: string }>()
  for (const r of rows) if (r.attempt > (newest.get(r.visitId)?.attempt ?? 0)) newest.set(r.visitId, r)
  return [...newest].filter(([, r]) => r.status === "failed").map(([id]) => id)
}

const toStatus = (s: string): VisitStatus => (s === "completed" ? "completed" : s === "cancelled" || s === "skipped" ? "cancelled" : s === "unscheduled" ? "unscheduled" : "scheduled")

/** A Mountain day and clock time as a UTC ISO instant. */
export function instantOf(day: string, time: string | null): string {
  const t = time ?? DEFAULT_START
  return zonedToUtc(Number(day.slice(0, 4)), Number(day.slice(5, 7)), Number(day.slice(8, 10)), Number(t.slice(0, 2)), Number(t.slice(3, 5)), 0, ZONE).toISOString().replace(".000Z", "Z")
}

const mountainDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d)
const iso = (d: Date) => d.toISOString().replace(".000Z", "Z")

const consentOf = (c: ConsentRow): Consent => ({
  ...(c.termsAcceptedAt ? { termsAcceptedAt: iso(c.termsAcceptedAt) } : {}),
  ...(c.termsVersion ? { termsVersion: c.termsVersion } : {}),
  marketingOptIn: c.marketingOptIn,
  marketingChannels: c.marketingChannels,
  source: c.source === "checkout" ? "checkout" : c.source === "admin" ? "admin" : "form",
  recordedAt: iso(c.recordedAt),
})

/** The month a pass visit's window names, as in `PassVisit.window`. */
const WINDOWS: Record<string, string> = { "turn-on": "May", inspection: "July", blowout: "October" }

export function shapeAdminData(i: ShapeInput): AdminData {
  const customerOfJobber = new Map([...i.jobberClientOf].map(([customerId, jobberId]) => [jobberId, customerId]))
  const clientId = (jobberId: string | null) => (jobberId ? (customerOfJobber.get(jobberId) ?? jobberId) : "")
  const mirrorClient = new Map(i.mirror.clients.map((c) => [c.id, c]))
  const newestConsent = new Map<string, ConsentRow>()
  for (const c of i.consents) {
    const seen = newestConsent.get(c.customerId)
    if (!seen || c.recordedAt > seen.recordedAt) newestConsent.set(c.customerId, c)
  }
  const customerOf = new Map(i.customers.map((c) => [c.id, c]))
  const lastNameOf = (id: string) => customerOf.get(id)?.lastName ?? undefined
  const failed = new Set(i.failedChargeVisitIds ?? [])
  // A pending pass is an unpaid attempt: its visits are never a job anywhere on the Schedule or in the counts.
  const pending = new Set(i.passes.filter((p) => p.status === "pending").map((p) => p.id))

  // Visits the app owns (pass and booked), then the mirror's: the calendar feed's visits, and open jobs with no visit.
  const appVisits: Visit[] = i.visits.filter((v) => !(v.passId && pending.has(v.passId))).map((v) => {
    const point = v.lat !== null && v.lng !== null ? { lat: v.lat, lng: v.lng } : {}
    return {
      id: v.id, clientId: v.customerId, clientName: fullName(v.firstName, lastNameOf(v.customerId)), town: v.town, kind: toKind(v.kind), status: toStatus(v.status),
      ...(v.scheduledOn ? { startAt: instantOf(v.scheduledOn, v.startTime), scheduledOn: v.scheduledOn } : {}),
      ...(v.startTime ? { startTime: v.startTime } : {}), ...(v.completedOn ? { completedOn: v.completedOn } : {}), ...(v.chargedAt ? { chargedAt: v.chargedAt } : {}),
      ...(failed.has(v.id) ? { chargeFailed: true } : {}), ...(v.status === "skipped" ? { skipped: true } : {}), ...(v.passId ? { passId: v.passId } : {}),
      isPass: v.passId !== null, jobberUrl: "",
      ...(v.jobId ? { jobId: v.jobId } : {}), ...money(v), price: v.amount, ...(v.durationMinutes ? { minutes: v.durationMinutes } : {}), ...(v.notes ? { notes: v.notes } : {}), ...(v.truckName ? { truckName: v.truckName } : {}),
      ...(v.truckId ? { truckId: v.truckId } : {}),
      ...(v.awaitingPick ? { awaitingPick: true } : {}),
      ...(v.stopOrder !== null ? { stopOrder: v.stopOrder } : {}),
      ...point,
      ...(v.exception ? { exception: v.exception } : {}),
    }
  })
  const mirrorVisits: Visit[] = i.mirror.visits.map((v) => {
    const cid = clientId(v.clientId)
    const who = mirrorClient.get(v.clientId ?? "")
    return {
      id: v.id, clientId: cid, clientName: fullName(who?.firstName ?? "", who?.lastName), town: (v.town ?? who?.town ?? "Erie") as Town, kind: toKind(v.kind ?? "other"),
      status: v.completedAt ? "completed" : v.startAt ? "scheduled" : "unscheduled",
      ...(v.startAt ? { startAt: iso(v.startAt), scheduledOn: mountainDay(v.startAt) } : {}), ...(v.completedAt ? { completedOn: mountainDay(v.completedAt) } : {}),
      isPass: false, jobberUrl: v.jobberUrl ?? "",
    }
  })
  const jobs: Visit[] = i.mirror.jobsWithoutVisit.map((j) => {
    const who = mirrorClient.get(j.clientId ?? "")
    return { id: j.id, clientId: clientId(j.clientId), clientName: fullName(who?.firstName ?? "", who?.lastName), town: (who?.town ?? "Erie") as Town, kind: "other", status: "unscheduled", isPass: false, jobberUrl: j.jobberUrl ?? "" }
  })
  const visits = [...appVisits, ...mirrorVisits, ...jobs]

  // Clients: the app's customers, then the mirror's that no customer is linked to.
  const lastVisit = new Map<string, string>()
  for (const v of visits) if (v.status === "completed" && v.startAt && v.startAt > (lastVisit.get(v.clientId) ?? "")) lastVisit.set(v.clientId, v.startAt)
  const appIds = new Set(i.customers.map((c) => c.id))
  const history = new Map<string, ConsentRow[]>()
  for (const c of i.consents) history.set(c.customerId, [...(history.get(c.customerId) ?? []), c])
  const present = <T extends string | null | undefined>(k: string, v: T) => (v ? { [k]: v } : {})
  const clients: Client[] = [
    ...i.customers.map((c): Client => {
      const consent = newestConsent.get(c.id)
      const jobberId = i.jobberClientOf.get(c.id)
      const records = (history.get(c.id) ?? []).sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
      return {
        id: c.id, firstName: c.firstName, town: (c.town ?? "Erie") as Town, jobberUrl: (jobberId && mirrorClient.get(jobberId)?.jobberUrl) || "", hasPass: c.hasPass, app: true,
        ...present("lastName", c.lastName), ...present("email", c.email), ...present("phone", c.phone), ...present("address", c.address),
        ...(lastVisit.has(c.id) ? { lastVisitAt: lastVisit.get(c.id) } : {}), ...(consent ? { consent: consentOf(consent), consentHistory: records.map(consentOf) } : {}),
      }
    }),
    ...i.mirror.clients.filter((c) => !customerOfJobber.has(c.id) && !appIds.has(c.id)).map((c): Client => ({
      id: c.id, firstName: c.firstName ?? "", town: (c.town ?? "Erie") as Town, jobberUrl: c.jobberUrl ?? "", hasPass: false,
      ...present("lastName", c.lastName), ...present("email", c.email), ...present("phone", c.phone),
      ...(lastVisit.has(c.id) ? { lastVisitAt: lastVisit.get(c.id) } : {}),
    })),
  ]

  const passes: Pass[] = i.passes.map((p) => {
    const mine = i.visits.filter((v) => v.passId === p.id && v.status !== "cancelled" && v.status !== "skipped")
    const order = ["turn-on", "inspection", "blowout"]
    const passVisits: PassVisit[] = mine
      .filter((v) => order.includes(v.kind))
      .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
      .map((v) => ({
        kind: v.kind as PassVisit["kind"], window: v.window ?? WINDOWS[v.kind]!, amount: v.amount, id: v.id,
        ...(v.scheduledOn ? { scheduledAt: instantOf(v.scheduledOn, v.startTime), scheduledOn: v.scheduledOn } : {}),
        ...(v.startTime ? { startTime: v.startTime } : {}), ...(v.durationMinutes ? { windowMinutes: v.durationMinutes } : {}),
        ...(failed.has(v.id) ? { chargeFailed: true } : {}),
        ...(v.truckName ? { truckName: v.truckName } : {}),
        ...(v.completedOn ? { completedAt: instantOf(v.completedOn, "12:00") } : {}),
        ...(v.chargedAt ? { chargedAt: v.chargedAt } : {}),
        ...money(v),
      }))
    const consent = newestConsent.get(p.customerId)
    const jobberId = i.jobberClientOf.get(p.customerId)
    return {
      id: p.id, number: p.number, season: p.season, clientId: p.customerId, firstName: p.firstName, ...present("lastName", lastNameOf(p.customerId)), town: p.town, zones: p.zones, ...present("createdAt", p.createdAt),
      turnOnPreference: p.turnOnPreference, blowoutPreference: p.blowoutPreference, status: p.status === "cancelled" ? "cancelled" : p.status === "lapsed" ? "lapsed" : p.status === "pending" ? "pending" : "active",
      visits: passVisits, stripeUrl: "", jobberUrl: (jobberId && mirrorClient.get(jobberId)?.jobberUrl) || "",
      ...(p.cardLast4 ? { cardLast4: p.cardLast4 } : {}), ...(p.cardExpires ? { cardExpires: p.cardExpires } : {}),
      ...(consent ? { consent: consentOf(consent) } : {}), ...(p.cardFailedAt ? { cardFailedAt: p.cardFailedAt } : {}),
      ...(p.needsCustomerHome ? { needsCustomerHome: true } : {}), ...(p.accessNote ? { accessNote: p.accessNote } : {}),
    }
  })

  const quotes: Quote[] = i.mirror.quotes.map((q) => ({ id: q.id, clientName: q.clientName ?? "", town: (q.town ?? "Erie") as Town, total: q.total ?? 0, sentAt: q.sentAt ? iso(q.sentAt) : "", status: q.status ?? "awaiting", jobberUrl: q.jobberUrl ?? "" }))
  const invoices: Invoice[] = i.mirror.invoices.map((v) => ({ id: v.id, clientName: v.clientName ?? "", total: v.total ?? 0, issuedAt: v.issuedAt ? iso(v.issuedAt) : "", dueAt: v.dueAt ? iso(v.dueAt) : "", status: v.status ?? "unpaid", jobberUrl: v.jobberUrl ?? "" }))

  const messages: Message[] = i.messages
    .map((m): Message => {
      const passId = m.visitId ? (i.visits.find((v) => v.id === m.visitId)?.passId ?? undefined) : undefined
      return { id: m.id, clientId: m.customerId, ...(passId ? { passId } : {}), ...(m.visitId ? { visitId: m.visitId } : {}), channel: m.channel, kind: m.kind as MessageKind, body: m.channel === "email" ? (m.subject ?? m.body) : m.body, at: m.sentAt ?? m.createdAt, status: m.status }
    })
    .sort((a, b) => a.at.localeCompare(b.at))

  const soldJobs: SoldJob[] | undefined = i.jobRows?.map((j) => {
    const pass = i.passes.find((p) => p.id && i.visits.some((v) => v.passId === p.id && v.jobId === j.id))
    return {
      id: j.id, customerId: j.customerId, kind: j.kind, status: j.status, source: j.source,
      ...(j.price !== null ? { price: j.price } : {}), ...(j.notes ? { notes: j.notes } : {}),
      ...(pass ? { passId: pass.id, passNumber: pass.number } : {}),
      visitIds: i.visits.filter((v) => v.jobId === j.id).map((v) => v.id),
    }
  })

  return {
    organizationId: i.organizationId, syncedAt: iso(i.syncedAt), clients, visits, ...(soldJobs ? { jobs: soldJobs } : {}), quotes, invoices, passes,
    monthTotals: monthTotals(i), attention: attention(i, passes, visitRows(i, appVisits, visits)), settings: { ...i.settings, trucks: i.trucks, areas: i.areas },
    settingsChanges: i.settingsChanges, messages, blocks: i.blocks,
  }
}

/** Revenue and completed visits by Mountain month: paid Jobber invoices and completed Jobber visits from the mirror, charged pass visits and completed app visits from the app. */
export function monthTotals(i: Pick<ShapeInput, "visits" | "mirror">): MonthTotal[] {
  const by = new Map<string, MonthTotal>()
  const bucket = (day: string) => {
    const key = day.slice(0, 7)
    let t = by.get(key)
    if (!t) by.set(key, (t = { year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)), revenue: 0, visits: 0 }))
    return t
  }
  for (const v of i.mirror.invoices) if (v.status === "paid" && v.issuedAt) bucket(mountainDay(v.issuedAt)).revenue += v.total ?? 0
  for (const v of i.mirror.visits) if (v.completedAt) bucket(mountainDay(v.completedAt)).visits += 1
  for (const v of i.visits) {
    if (v.chargedAt) bucket(mountainDay(new Date(v.chargedAt))).revenue += v.amount
    if (v.completedOn) bucket(v.completedOn).visits += 1
  }
  return [...by.values()].sort((a, b) => a.year - b.year || a.month - b.month)
}

const FOURTEEN_DAYS = 14 * DAY_MS

const KIND_WORDS: Record<string, string> = { "turn-on": "spring turn-on", inspection: "inspection", blowout: "fall blowout", repair: "repair", install: "installation" }
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const shortDay = (day: string) => `${SHORT_MONTHS[Number(day.slice(5, 7)) - 1]} ${Number(day.slice(8, 10))}`
const possessive = (name: string) => `${name}'s`

/**
 * The rows Home works out from the visits themselves, one per visit: a visit whose day has passed and nobody marked done
 * (the last two weeks; the key is the visit), and a one-off visit the office took that still has no day. A pass's own
 * visits without a day are placed by the schedule run, which leaves its own row when it cannot.
 */
function visitRows(i: ShapeInput, app: Visit[], all: Visit[]): Attention[] {
  const out: Attention[] = []
  const earliest = new Date(Date.parse(`${i.today}T12:00:00Z`) - NOT_CLOSED_LOOKBACK_DAYS * DAY_MS).toISOString().slice(0, 10)
  for (const v of all) {
    const job = visitJob(v, i.today, ZONE)
    if (job.notClosed && job.day && job.day >= earliest)
      out.push({ kind: "not-closed", key: v.id, visitId: v.id, message: `${possessive(v.clientName)} ${KIND_WORDS[v.kind] ?? "visit"} on ${shortDay(job.day)} is not marked done`, since: instantOf(job.day, v.startTime ?? null) })
  }
  const appIds = new Set(app.map((v) => v.id))
  // Done and not paid: a one-off visit with a price whose money has not come. A pass visit is charged to its card on its own, and a failed charge has its own row.
  for (const v of all)
    if (appIds.has(v.id) && !v.isPass && (v.price ?? 0) > 0 && v.status === "completed" && !v.chargedAt && !v.billSent)
      out.push({ kind: "unpaid", key: v.id, visitId: v.id, message: `${possessive(v.clientName)} ${KIND_WORDS[v.kind] ?? "visit"} is done and not paid`, since: instantOf(v.completedOn ?? i.today, "12:00") })
  for (const v of all)
    if (appIds.has(v.id) && !v.isPass && v.status === "unscheduled")
      out.push({ kind: "unplaced", key: v.id, visitId: v.id, message: `${possessive(v.clientName)} ${KIND_WORDS[v.kind] ?? "visit"} needs a day`, since: i.now.toISOString().replace(".000Z", "Z") })
  return out
}

/** What Home asks Hannah to look at: failed charges, queue items with an error, cards that expire before the blowout, cancelled passes. Jobs not closed are counted by Home itself from `src/lib/admin/jobs.ts`. */
export function attention(i: ShapeInput, passes: Pass[], visitRows: Attention[] = []): Attention[] {
  const out: Attention[] = [...visitRows]
  for (const p of passes)
    if (p.status === "pending" && p.createdAt && i.now.getTime() - Date.parse(p.createdAt) > 60 * 60_000)
      out.push({ kind: "pending-pass", key: p.id, passId: p.id, message: `${p.firstName} started ${p.number} and has not paid`, since: p.createdAt })
  for (const p of passes) {
    if (p.status !== "cancelled" && p.cardFailedAt) out.push({ kind: "charge-failed", key: `${p.id}@${p.cardFailedAt}`, passId: p.id, message: `The card on ${p.number} didn't go through; ${p.firstName} has the update link`, since: p.cardFailedAt })
  }
  for (const a of i.alerts ?? []) out.push({ key: a.key, kind: a.kind === "new-pass" || a.kind === "pass-cancelled" || a.kind === "scheduled" || a.kind === "unplaced" ? a.kind : "jobs-failed", ...(a.passId ? { passId: a.passId } : {}), ...(a.kind === "unplaced" && a.key ? { visitId: a.key } : {}), message: a.message, since: iso(a.createdAt) })
  for (const q of i.queueProblems) out.push({ kind: "jobs-failed", key: `${q.kind}@${iso(q.updatedAt)}`, message: `A ${q.kind} task ${q.status === "failed" ? "gave up" : "is retrying"}: ${q.lastError ?? "no error recorded"}`, since: iso(q.updatedAt) })
  for (const p of passes) {
    if (p.status === "active" && p.cardExpires && p.cardExpires < `${p.season}-10` && !p.cardFailedAt)
      out.push({ kind: "card-expiring", key: p.id, passId: p.id, message: `The card on ${p.number} expires before the October blowout`, since: iso(i.now) })
  }
  const ap = new Map(i.passes.map((p) => [p.id, p]))
  for (const p of passes) {
    const cancelledAt = ap.get(p.id)?.cancelledAt
    // The `pass-cancel` task's own alert says it already; the computed row is the fallback until the queue has run.
    if ((i.alerts ?? []).some((a) => a.kind === "pass-cancelled" && a.passId === p.id)) continue
    if (p.status === "cancelled" && cancelledAt && i.now.getTime() - Date.parse(cancelledAt) < FOURTEEN_DAYS)
      out.push({ kind: "pass-cancelled", key: p.id, passId: p.id, message: `${p.firstName} cancelled ${p.number}`, since: cancelledAt })
  }
  const gone = new Set((i.dismissed ?? []).map((d) => `${d.kind}:${d.key}`))
  return out.filter((a) => !(a.key && gone.has(`${a.kind}:${a.key}`))).sort((a, b) => b.since.localeCompare(a.since))
}
