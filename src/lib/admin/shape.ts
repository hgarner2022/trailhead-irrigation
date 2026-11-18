/**
 * Database rows (as the API returns them) to the screen-facing `AdminData`.
 * Pure: `live.ts` fetches, this shapes, and the tests run it on a seeded
 * database. Calendar days are Mountain time; instants are ISO strings.
 */
import { lastVisitAt } from "./last-visit"
import { zonedToUtc } from "./calendar"
import type { YardWire } from "./yard"
import { fullName } from "./format"
import { causeOf, groupAttention, type QueueAttention } from "./attention-groups"
import { jobTotal, visitPrice } from "@/lib/jobs/lines"
import { taxRuleOf, type TaxRule } from "@/lib/jobs/tax"
import { stageOf } from "@/lib/jobs/stage"
import { invoiceOpen, invoiceStatus } from "@/lib/money/invoice"
import { allocateJobPayments, jobMoney as moneyOfJob, jobOwed } from "@/lib/money/words"
import { NOT_CLOSED_LOOKBACK_DAYS, visitJob, visitPaid, visitPaidTotal } from "./jobs"
import { newestNote, storiesOf, type StoryEvent } from "./story"
import type {
  AdminInvoice, AdminPayment, SoldJob, AdminData, Attention, BusyBlock, Client, Consent, Invoice, Message, MessageKind, MonthTotal, Pass, PassVisit, Quote, SettingsChange,
  Person, ServiceItem, AreaGroup, OrganizationSettings, Property, Town, Visit, VisitKind, VisitStatus, Yard,
} from "./types"

const ZONE = "America/Denver"
const DEFAULT_START = "08:00"
const DAY_MS = 86_400_000

export interface ApiVisit {
  id: string; jobId?: string; notes?: string | null; passId: string | null; customerId: string; firstName: string; town: Town; kind: string; status: string
  window: string | null; amount: number; preference: string | null; awaitingPick: boolean; personId: string | null; personName?: string | null; scheduledOn: string | null
  notDoneReason?: string | null; paidBy?: string | null; paymentStatus?: string; startTime: string | null; durationMinutes?: number | null; stopOrder: number | null; completedOn: string | null
  /** the visit's own payment rows as `visits.list` sends them; `ShapeInput.paymentRows` (the whole organization's) wins when given */
  payments?: { id: string; jobId: string | null; visitId: string | null; amount: number; method: string; status: string; paidOn: string | null; refundsPaymentId: string | null; createdAt?: string }[]
  exception: { kind: "moved-in-jobber"; at: string; note: string } | null; lat: number | null; lng: number | null
  lineItems?: { id: string; visitId: string | null; quantity: number; unitPrice: number; taxable: boolean; cancelledAt: string | null }[]
  /** the yard the visit is at; the gate code, access note and contact phone are there only for the write scope */
  property?: YardWire
}
export interface ApiPass {
  id: string; number: string; season: number; customerId: string; firstName: string; town: Town; zones: number; status: string
  turnOnPreference: Pass["turnOnPreference"]; blowoutPreference: Pass["blowoutPreference"]; needsCustomerHome: boolean
  accessNote?: string | null; cardLast4: string | null; cardExpires: string | null; cardFailedAt: string | null; cancelledAt: string | null; createdAt?: string
}
export interface ApiCustomer { id: string; firstName: string; lastName?: string | null; email?: string | null; phone?: string | null; address?: string | null; town: Town | null; hasPass: boolean; card?: { brand: string | null; last4: string | null; expires: string | null; failedAt: string | null } | null }
export interface ApiMessage { id: string; customerId: string; visitId: string | null; channel: "email" | "sms"; kind: string; subject: string | null; body: string; status: Message["status"]; sentAt: string | null; createdAt: string }
/** A `property` row as live.ts reads it; the street line, gate code, access note and phone are already null for a caller without the write scope. */
export interface PropertyRow extends YardWire { id: string; customerId: string; address: string | null; town: Town }
export interface ConsentRow { customerId: string; termsAcceptedAt: Date | null; termsVersion: string | null; marketingOptIn: boolean; marketingChannels: ("email" | "sms")[]; source: string; recordedAt: Date }
export interface MirrorClient { id: string; firstName: string | null; lastName?: string | null; email?: string | null; phone?: string | null; town: Town | null; jobberUrl: string | null }
export interface MirrorVisit { id: string; clientId: string | null; kind: string | null; town: Town | null; startAt: Date | null; completedAt: Date | null; jobberUrl: string | null }
export interface MirrorJob { id: string; clientId: string | null; jobberUrl: string | null }
export interface MirrorQuote { id: string; clientName: string | null; town: Town | null; total: number | null; sentAt: Date | null; status: Quote["status"] | null; jobberUrl: string | null }
export interface MirrorInvoice { id: string; clientName: string | null; total: number | null; issuedAt: Date | null; dueAt: Date | null; status: Invoice["status"] | null; jobberUrl: string | null }
/** A `job` row as live.ts reads it. `kind` is the derived kind (`loadJobKinds`); the stage, price and notes are worked out here from the lines, the visits and the events. */
export interface JobRow { id: string; customerId: string; kind: SoldJob["kind"]; legacyPassId?: string | null; source: SoldJob["source"]; passNumber?: string | null; soldOn: string | null; quoteSentOn: string | null; quoteAcceptedOn: string | null; cancelledAt: Date | null; createdAt?: Date }
export interface LineRow { id: string; jobId: string; visitId: string | null; name: string; description: string | null; quantity: number; unitPrice: number; taxable: boolean; cancelledAt: Date | null }
/** A payment row (`charge`) as live.ts reads it: refunds are negative; `attempt` numbers a visit's tries. */
export interface PaymentRow { id: string; jobId: string | null; visitId: string | null; amount: number; method: string; status: string; paidOn: string | null; refundsPaymentId: string | null; reference?: string | null; attempt: number; createdAt: Date }
/** An invoice (`invoice`) as live.ts reads it: its frozen lines only as far as the visits they name, and the pay link for a caller that may write. */
export interface InvoiceRow {
  id: string; jobId: string; number: string; amount: number; tax: number; total: number; sentOn: string; dueOn: string
  paidOn: string | null; cancelledAt: Date | null; lines: { visitId?: string | null }[]; payUrl?: string
}
export interface QueueProblem { id?: string; kind: string; lastError: string | null; updatedAt: Date; status: string }

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
  /** everyone active, owners first, as the People tab lists them */
  people: Person[]
  areas: AreaGroup[]
  settings: Omit<OrganizationSettings, "people" | "areas">
  settingsChanges: SettingsChange[]
  mirror: { clients: MirrorClient[]; visits: MirrorVisit[]; jobsWithoutVisit: MirrorJob[]; quotes: MirrorQuote[]; invoices: MirrorInvoice[] }
  queueProblems: QueueProblem[]
  /** the visits whose newest charge attempt did not go through */
  failedChargeVisitIds?: string[]
  /** every payment row of the organization: the money words, the month totals and the owed rows are read from these */
  paymentRows?: PaymentRow[]
  /** unresolved free-form alerts (a new Season Pass); absent in the fixtures */
  alerts?: AlertRow[]
  /** the (kind, key) of rows Home must not show again: dismissed by the office */
  dismissed?: { kind: string; key: string }[]
  /** the job rows; absent in the fixtures */
  jobRows?: JobRow[]
  /** every line on those jobs, oldest first */
  lineRows?: LineRow[]
  /** every property of the organization; absent in the fixtures, where the screens build one from the pass */
  propertyRows?: PropertyRow[]
  /** every invoice of the organization; absent in the fixtures. The open ones (sent, overdue) make a job's money read Invoice sent */
  invoiceRows?: InvoiceRow[]
  /** the organization's newest events (as a caller may read them): grouped into the story of each customer, job and visit; absent in the fixtures, where no panel shows the block */
  events?: StoryEvent[]
  /** the caller has no write scope (a tech): their stories drop the messages about money and show no email */
  techView?: boolean
  blocks: BusyBlock[]
  /** every service, inactive ones included; absent in the fixtures */
  services?: ServiceItem[]
}

/** What the visit is worth with its sales tax: its own line when the API sent one, else the amount (which already reads the line and the tax). */
const lineAmountOf = (v: Pick<ApiVisit, "id" | "amount" | "lineItems">, rule: TaxRule) => {
  const own = (v.lineItems ?? []).filter((l) => l.visitId === v.id)
  return own.length ? visitPrice(own.map((l) => ({ ...l, cancelledAt: l.cancelledAt ? new Date(l.cancelledAt) : null })), rule) : v.amount
}

/** What a visit costs from the job's line rows, with its sales tax: its own live lines when it has any, else its `amount`. */
const visitPriceOf = (v: Pick<ApiVisit, "id" | "amount">, lines: readonly Pick<LineRow, "visitId" | "quantity" | "unitPrice" | "taxable" | "cancelledAt">[], rule: TaxRule) => {
  const own = lines.filter((l) => l.visitId === v.id)
  return own.length ? visitPrice(own, rule) : v.amount
}

/** The last not-done's reason. How it was paid is read from the payment rows, never carried on the visit. */
const reasonOf = (v: Pick<ApiVisit, "notDoneReason">) => (v.notDoneReason ? { notDoneReason: v.notDoneReason } : {})

const paymentOf = (r: Pick<PaymentRow, "id" | "jobId" | "visitId" | "amount" | "method" | "status" | "paidOn" | "refundsPaymentId"> & { reference?: string | null }): AdminPayment => ({
  id: r.id, jobId: r.jobId, visitId: r.visitId, amount: r.amount, method: r.method, status: r.status, paidOn: r.paidOn, refundsPaymentId: r.refundsPaymentId,
  ...(r.reference ? { reference: r.reference } : {}),
})

/** The yard as the screens hold it: a fact nobody set is left out. */
export const yardOf = (y: YardWire): Yard => ({
  ...(y.zones ? { zones: y.zones } : {}), ...(y.controller ? { controller: y.controller } : {}), ...(y.backflowLocation ? { backflowLocation: y.backflowLocation } : {}),
  ...(y.gateCode ? { gateCode: y.gateCode } : {}), mustBeHome: y.mustBeHome, ...(y.accessNote ? { accessNote: y.accessNote } : {}),
  ...(y.contactName ? { contactName: y.contactName } : {}), ...(y.contactPhone ? { contactPhone: y.contactPhone } : {}), ...(y.notes ? { notes: y.notes } : {}),
})

const toKind = (k: string): VisitKind => (k === "turn-on" || k === "inspection" || k === "blowout" || k === "repair" || k === "install" ? k : "other")
/** The visits whose newest charge attempt failed: a retry that went through clears the earlier failure. */
export function failedChargeVisits(rows: { visitId: string | null; attempt: number; status: string }[]): string[] {
  const newest = new Map<string, { attempt: number; status: string }>()
  for (const r of rows) if (r.visitId && r.attempt > (newest.get(r.visitId)?.attempt ?? 0)) newest.set(r.visitId, r)
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
  // The one sales tax rule every total in this shaping carries (Settings › Billing); off while nothing is collected.
  const rule = taxRuleOf(i.settings.billing)
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
  // The payment rows every money word is read from: the organization's own rows when live.ts loaded them, else what each visit carried; oldest first.
  const rows: PaymentRow[] = i.paymentRows ?? i.visits.flatMap((v) => (v.payments ?? []).map((p, n) => ({ ...p, attempt: n + 1, createdAt: new Date(p.createdAt ?? 0) })))
  const ordered = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
  // The visits the paid invoices of each job name, in the order the invoices were paid: what a payment on the job as a whole credits first.
  const paidBillVisits = (jobId: string) =>
    (i.invoiceRows ?? []).filter((r) => r.jobId === jobId && r.paidOn && !r.cancelledAt).sort((a, b) => (a.paidOn ?? "").localeCompare(b.paidOn ?? "")).flatMap((r) => r.lines.map((l) => l.visitId).filter((id): id is string => Boolean(id)))
  // A payment on the job as a whole (an invoice paid on the pay page) is credited to the job's done visits, so the visit-level words and sums read it
  // (`allocateJobPayments`); the job's own money counts the original rows, so nothing is counted twice.
  const credit = new Map<string, AdminPayment[]>()
  for (const jobId of new Set(ordered.filter((r) => r.jobId && !r.visitId && r.status === "succeeded").map((r) => r.jobId!))) {
    const mine = i.visits.filter((v) => v.jobId === jobId)
    const lines = (i.lineRows ?? []).filter((l) => l.jobId === jobId)
    const ids = new Set(mine.map((v) => v.id))
    const rowsOfJob = ordered.filter((r) => r.jobId === jobId || (r.visitId !== null && ids.has(r.visitId))).map(paymentOf)
    const visitsOfJob = mine.map((v) => ({ id: v.id, done: v.status === "completed", cancelled: v.status === "cancelled" || v.status === "skipped", price: i.lineRows ? visitPriceOf(v, lines, rule) : lineAmountOf(v, rule), doneOn: v.completedOn }))
    for (const [visitId, slices] of allocateJobPayments(rowsOfJob, visitsOfJob, paidBillVisits(jobId))) credit.set(visitId, slices)
  }
  const paymentsOfVisit = (id: string) => [...ordered.filter((r) => r.visitId === id).map(paymentOf), ...(credit.get(id) ?? [])]
  // The open invoice of each job (a job has at most one): its money reads Invoice sent, on the visits its lines were invoiced after (every visit of the job when its lines name none).
  // An invoice is carried only while its job still owes money: one left open after the money arrived another way (a check, Venmo or cash) is no invoice at all, so Home, Remind and the money lines never dun a customer who has paid.
  const jobOwes = (jobId: string) => {
    if (!i.lineRows) return true
    const ids = new Set(i.visits.filter((v) => v.jobId === jobId).map((v) => v.id))
    return jobOwed(i.lineRows.filter((l) => l.jobId === jobId), ordered.filter((r) => r.jobId === jobId || (r.visitId !== null && ids.has(r.visitId))), rule) > 0
  }
  const billOf = new Map<string, AdminInvoice>()
  for (const r of i.invoiceRows ?? []) {
    if (!invoiceOpen(r) || !jobOwes(r.jobId)) continue
    billOf.set(r.jobId, {
      id: r.id, jobId: r.jobId, number: r.number, amount: r.amount, tax: r.tax, total: r.total, sentOn: r.sentOn, dueOn: r.dueOn,
      status: invoiceStatus(r, i.today) === "overdue" ? "overdue" : "sent", visitIds: [...new Set(r.lines.map((l) => l.visitId).filter((id): id is string => Boolean(id)))],
      ...(r.payUrl ? { payUrl: r.payUrl } : {}),
    })
  }
  const billFor = (jobId: string | undefined, visitId: string): AdminInvoice | undefined => {
    const bill = jobId ? billOf.get(jobId) : undefined
    return bill && (bill.visitIds.length === 0 || bill.visitIds.includes(visitId)) ? bill : undefined
  }
  const stories = storiesOf(i.events, i.messages, { tech: i.techView })
  // A pending pass is an unpaid attempt: its visits are never a job anywhere on the Schedule or in the counts.
  const pending = new Set(i.passes.filter((p) => p.status === "pending").map((p) => p.id))

  // Visits the app owns (pass and booked), then the mirror's: the calendar feed's visits, and open jobs with no visit.
  const appVisits: Visit[] = i.visits.filter((v) => !(v.passId && pending.has(v.passId))).map((v) => {
    const point = v.lat !== null && v.lng !== null ? { lat: v.lat, lng: v.lng } : {}
    return {
      id: v.id, clientId: v.customerId, clientName: fullName(v.firstName, lastNameOf(v.customerId)), town: v.town, kind: toKind(v.kind), status: toStatus(v.status),
      ...(v.scheduledOn ? { startAt: instantOf(v.scheduledOn, v.startTime), scheduledOn: v.scheduledOn } : {}),
      ...(v.startTime ? { startTime: v.startTime } : {}), ...(v.completedOn ? { completedOn: v.completedOn } : {}), payments: paymentsOfVisit(v.id),
      ...(failed.has(v.id) ? { chargeFailed: true } : {}), ...(v.status === "skipped" ? { skipped: true } : {}), ...(v.passId ? { passId: v.passId } : {}),
      isPass: v.passId !== null, jobberUrl: "",
      ...(v.jobId ? { jobId: v.jobId } : {}), ...(billFor(v.jobId, v.id) ? { invoice: billFor(v.jobId, v.id) } : {}), ...reasonOf(v), price: lineAmountOf(v, rule), ...(v.durationMinutes ? { minutes: v.durationMinutes } : {}), ...(v.notes ? { notes: v.notes } : {}),
      ...(stories ? { timeline: stories.ofVisit(v.id) } : {}),
      // the person assigned
      ...(v.personName ? { personName: v.personName } : {}),
      ...(v.personId ? { personId: v.personId } : {}),
      ...(v.awaitingPick ? { awaitingPick: true } : {}),
      ...(v.property ? { property: yardOf(v.property) } : {}),
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
  const lastVisit = lastVisitAt(visits, i.today)
  const appIds = new Set(i.customers.map((c) => c.id))
  const history = new Map<string, ConsentRow[]>()
  for (const c of i.consents) history.set(c.customerId, [...(history.get(c.customerId) ?? []), c])
  const propertiesOf = new Map<string, Property[]>()
  for (const p of i.propertyRows ?? []) propertiesOf.set(p.customerId, [...(propertiesOf.get(p.customerId) ?? []), { id: p.id, town: p.town, ...(p.address ? { address: p.address } : {}), ...yardOf(p) }])
  const present = <T extends string | null | undefined>(k: string, v: T) => (v ? { [k]: v } : {})
  const clients: Client[] = [
    ...i.customers.map((c): Client => {
      const consent = newestConsent.get(c.id)
      const jobberId = i.jobberClientOf.get(c.id)
      const records = (history.get(c.id) ?? []).sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
      return {
        id: c.id, firstName: c.firstName, town: (c.town ?? "Erie") as Town, jobberUrl: (jobberId && mirrorClient.get(jobberId)?.jobberUrl) || "", hasPass: c.hasPass, app: true,
        ...present("lastName", c.lastName), ...present("email", c.email), ...present("phone", c.phone), ...present("address", c.address),
        ...(c.card?.last4 ? { card: { last4: c.card.last4, ...present("brand", c.card.brand), ...present("expires", c.card.expires), ...present("failedAt", c.card.failedAt) } } : {}),
        ...(i.propertyRows ? { properties: propertiesOf.get(c.id) ?? [] } : {}),
        ...(stories ? { timeline: stories.ofCustomer(c.id) } : {}),
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
        ...(v.personName ? { personName: v.personName } : {}),
        ...(v.completedOn ? { completedAt: instantOf(v.completedOn, "12:00") } : {}),
        payments: paymentsOfVisit(v.id),
        ...(billFor(v.jobId, v.id) ? { invoice: billFor(v.jobId, v.id) } : {}),
        ...reasonOf(v),
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
    const lines = (i.lineRows ?? []).filter((l) => l.jobId === j.id)
    const mine = i.visits.filter((v) => v.jobId === j.id)
    const mineIds = new Set(mine.map((v) => v.id))
    // The job's own money: rows on the job, and rows on its visits that carry no job id.
    const payments = ordered.filter((r) => r.jobId === j.id || (r.visitId !== null && mineIds.has(r.visitId))).map(paymentOf)
    const bill = billOf.get(j.id)
    const money = moneyOfJob(lines, payments, mine.map((v) => ({ id: v.id, cancelled: v.status === "cancelled" || v.status === "skipped", price: visitPriceOf(v, lines, rule), done: v.status === "completed", doneOn: v.completedOn })), rule, bill ? {} : undefined, paidBillVisits(j.id))
    // The stage is read from the facts (`stageOf`); the job has no typed status, price or notes: the price is the lines' total, the notes the newest note event.
    const status = stageOf({ kind: j.kind, cancelledAt: j.cancelledAt, soldOn: j.soldOn, quoteSentOn: j.quoteSentOn, quoteAcceptedOn: j.quoteAcceptedOn, lines, visits: mine })
    const total = jobTotal(lines, rule)
    const note = newestNote(i.events, "job", j.id)
    return {
      id: j.id, customerId: j.customerId, kind: j.kind, status, source: j.source, ...(bill ? { invoice: bill } : {}), ...(stories ? { timeline: stories.ofJob(j.id) } : {}),
      ...(i.lineRows ? { lines: lines.map((l) => ({ id: l.id, name: l.name, quantity: l.quantity, unitPrice: l.unitPrice, taxable: l.taxable, ...(l.description ? { description: l.description } : {}), ...(l.cancelledAt ? { cancelledAt: iso(l.cancelledAt) } : {}), ...(l.visitId ? { visitId: l.visitId } : {}) })), total, payments, money } : {}),
      ...(total > 0 ? { price: total } : {}), ...(note ? { notes: note } : {}), ...(j.soldOn ? { soldOn: j.soldOn } : {}),
      ...(j.quoteSentOn ? { quoteSentOn: j.quoteSentOn } : {}), ...(j.quoteAcceptedOn ? { quoteAcceptedOn: j.quoteAcceptedOn } : {}),
      ...(pass ? { passId: pass.id, passNumber: j.passNumber ?? pass.number } : {}), ...(j.legacyPassId ? { legacyPassId: j.legacyPassId } : {}),
      visitIds: i.visits.filter((v) => v.jobId === j.id).map((v) => v.id),
    }
  })

  return {
    organizationId: i.organizationId, syncedAt: iso(i.syncedAt), clients, visits, ...(soldJobs ? { jobs: soldJobs } : {}), quotes, invoices, passes,
    monthTotals: monthTotals({ ...i, paymentRows: rows }), attention: attention(i, passes, visitRows(i, appVisits, visits, soldJobs ?? [])), settings: { ...i.settings, people: i.people, areas: i.areas }, billing: rule,
    settingsChanges: i.settingsChanges, messages, blocks: i.blocks, ...(i.services ? { services: i.services } : {}),
  }
}

/** Revenue and completed visits by Mountain month: paid Jobber invoices and completed Jobber visits from the mirror; from the app, the succeeded payment rows by the day the money arrived (`paid_on`, refunds counting against) and the completed visits. */
export function monthTotals(i: Pick<ShapeInput, "visits" | "mirror" | "paymentRows">): MonthTotal[] {
  const by = new Map<string, MonthTotal>()
  const bucket = (day: string) => {
    const key = day.slice(0, 7)
    let t = by.get(key)
    if (!t) by.set(key, (t = { year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)), revenue: 0, visits: 0 }))
    return t
  }
  for (const v of i.mirror.invoices) if (v.status === "paid" && v.issuedAt) bucket(mountainDay(v.issuedAt)).revenue += v.total ?? 0
  for (const v of i.mirror.visits) if (v.completedAt) bucket(mountainDay(v.completedAt)).visits += 1
  for (const p of i.paymentRows ?? []) if (p.status === "succeeded") bucket(p.paidOn ?? mountainDay(p.createdAt)).revenue += p.amount
  for (const v of i.visits) if (v.completedOn) bucket(v.completedOn).visits += 1
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
function visitRows(i: ShapeInput, app: Visit[], all: Visit[], jobs: SoldJob[] = []): Attention[] {
  const out: Attention[] = []
  const earliest = new Date(Date.parse(`${i.today}T12:00:00Z`) - NOT_CLOSED_LOOKBACK_DAYS * DAY_MS).toISOString().slice(0, 10)
  for (const v of all) {
    const job = visitJob(v, i.today, ZONE)
    if (job.notClosed && job.day && job.day >= earliest)
      out.push({ kind: "not-closed", key: v.id, visitId: v.id, message: `${possessive(v.clientName)} ${KIND_WORDS[v.kind] ?? "visit"} on ${shortDay(job.day)} is not marked done`, since: instantOf(job.day, v.startTime ?? null) })
  }
  const appIds = new Set(app.map((v) => v.id))
  const cardOf = new Map(i.customers.filter((c) => c.card?.last4).map((c) => [c.id, c.card!]))
  const jobOfVisit = (v: Visit) => jobs.find((j) => j.visitIds.includes(v.id))
  const unpaidOf = (v: Visit) => Math.max(0, (v.price ?? 0) - visitPaidTotal(v))
  // Done and owed, one row per JOB: booked work whose visits are all done (or canceled) with money still to come, read from the lines and the payment rows
  // (`jobMoney`). A pass is charged to its card on its own, and a failed charge has its own row. The row opens the job's latest done visit that is itself owed (not paid up), else its latest done visit.
  // A job with an open invoice has no owed row: it reads Invoice sent, and its invoice has its own row once it is overdue (below).
  // A customer with a card on file has no "Done, unpaid" row: the card is charged by a press, and the next morning a visit nobody pressed Charge for gets its own row (below).
  // A Season Pass is paid visit by visit, so its done unpaid visits each have a row of their own (the key is the visit); other work has one row per job.
  for (const v of all) {
    const j = jobOfVisit(v)
    if (!j || j.kind !== "pass" || !appIds.has(v.id) || v.status !== "completed" || cardOf.has(v.clientId) || j.invoice || visitPaid(v) || unpaidOf(v) <= 0) continue
    out.push({ kind: "owed", key: v.id, jobId: j.id, visitId: v.id, message: `${possessive(v.clientName)} ${KIND_WORDS[v.kind] ?? "visit"} is done, $${unpaidOf(v)} unpaid`, since: instantOf(v.completedOn ?? i.today, "12:00") })
  }
  for (const v of all) {
    const j = jobOfVisit(v)
    if (!appIds.has(v.id) || v.status !== "completed" || !cardOf.has(v.clientId) || v.chargeFailed || j?.invoice || j?.status === "cancelled" || visitPaid(v) || unpaidOf(v) <= 0 || (v.completedOn ?? i.today) >= i.today) continue
    out.push({ kind: "charge-not-pressed", key: v.id, ...(j ? { jobId: j.id } : {}), visitId: v.id, amount: unpaidOf(v), message: `Charge not pressed for ${possessive(v.clientName.split(" ")[0] ?? v.clientName)} ${KIND_WORDS[v.kind] ?? "visit"}, $${unpaidOf(v)} unpaid`, since: instantOf(v.completedOn!, "12:00") })
  }
  for (const j of jobs) {
    if (j.kind === "pass" || !j.money || j.money.owed <= 0 || j.invoice || cardOf.has(j.customerId)) continue
    const mine = all.filter((v) => j.visitIds.includes(v.id) && appIds.has(v.id) && v.status !== "cancelled")
    const done = mine.filter((v) => v.status === "completed")
    if (!done.length || done.length !== mine.length) continue
    const latest = (list: Visit[]) => list.reduce((a, b) => ((b.completedOn ?? "") >= (a.completedOn ?? "") ? b : a))
    const unpaid = done.filter((v) => !visitPaid(v))
    const last = latest(unpaid.length ? unpaid : done)
    out.push({ kind: "owed", key: j.id, jobId: j.id, visitId: last.id, message: `${possessive(last.clientName)} ${KIND_WORDS[last.kind] ?? "visit"} is done, $${j.money.owed} unpaid`, since: instantOf(last.completedOn ?? i.today, "12:00") })
  }
  // An overdue invoice, one row per invoice: open (not paid, not canceled; `SoldJob.invoice` is only ever an open one) with its due day before today. Remind sends the reminder.
  // The key carries the due day, so a dismissed row is gone for that due day only.
  const names = new Map(i.customers.map((c) => [c.id, fullName(c.firstName, c.lastName ?? undefined)]))
  for (const j of jobs) {
    const bill = j.money && j.money.owed <= 0 ? undefined : j.invoice
    if (!bill || bill.dueOn >= i.today) continue
    out.push({ kind: "overdue", key: `invoice-${bill.id}@${bill.dueOn}`, invoiceId: bill.id, jobId: j.id, customerId: j.customerId, message: `${possessive(names.get(j.customerId) ?? "A customer")} bill of $${bill.total} was due ${shortDay(bill.dueOn)}`, since: instantOf(bill.dueOn, "12:00") })
  }
  for (const v of all)
    if (appIds.has(v.id) && !v.isPass && v.status === "unscheduled")
      out.push({ kind: "unplaced", key: v.id, visitId: v.id, message: `${possessive(v.clientName)} ${KIND_WORDS[v.kind] ?? "visit"} is unscheduled`, since: i.now.toISOString().replace(".000Z", "Z") })
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
  // A card that failed for a customer with no Season Pass (a one-off job): the pass rows above cover a pass holder, and the customer has the card link by email.
  for (const c of i.customers) {
    if (!c.hasPass && c.card?.failedAt) out.push({ kind: "charge-failed", key: `${c.id}@${c.card.failedAt}`, customerId: c.id, message: `The card for ${fullName(c.firstName, c.lastName ?? undefined)} didn't go through; ${c.firstName} has the update link`, since: c.card.failedAt })
  }
  for (const a of i.alerts ?? []) {
    // A no-card row goes away once the visit is paid (the money was recorded) or its pass is gone.
    if (a.kind === "no-card" && (() => { const v = passes.flatMap((p) => p.visits).find((x) => x.id === a.key); return !v || visitPaid(v) })()) continue
    out.push({ key: a.key, kind: a.kind === "new-pass" || a.kind === "pass-cancelled" || a.kind === "scheduled" || a.kind === "unplaced" || a.kind === "no-card" ? a.kind : "jobs-failed", ...(a.passId ? { passId: a.passId } : {}), ...((a.kind === "unplaced" || a.kind === "no-card") && a.key ? { visitId: a.key } : {}), message: a.message, since: iso(a.createdAt) })
  }
  for (const q of i.queueProblems) {
    const row: QueueAttention = { kind: "jobs-failed", key: `${q.kind}@${iso(q.updatedAt)}`, message: `A ${q.kind} task ${q.status === "failed" ? "gave up" : "is retrying"}: ${q.lastError ?? "no error recorded"}`, since: iso(q.updatedAt), queueKind: q.kind, ...(q.id ? { queueIds: [q.id] } : {}), cause: causeOf(q.lastError) }
    out.push(row)
  }
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
  const shown = out.filter((a) => !(a.key && gone.has(`${a.kind}:${a.key}`))).sort((a, b) => b.since.localeCompare(a.since))
  // One row per kind and cause for queue failures; the working `cause` stays out of what the screens get.
  return groupAttention(shown).map((a) => {
    const { cause: _cause, ...rest } = a as Attention & { cause?: unknown }
    return rest
  })
}
