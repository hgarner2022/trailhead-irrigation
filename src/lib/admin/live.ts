import "server-only"
import { and, asc, eq, isNotNull, isNull, or, sql } from "drizzle-orm"
import { callApi } from "@/api/core/call"
import type { Ctx } from "@/api/core/context"
import type { Handler } from "@/api/core/handler"
import { areasList } from "@/api/v1/areas/handlers"
import { customersList, gateYard } from "@/api/v1/customers/handlers"
import { payLinkOf } from "@/api/v1/invoices/queries"
import { loadEvents } from "@/api/v1/events/queries"
import { messagesList } from "@/api/v1/messages/handlers"
import { passesList } from "@/api/v1/passes/handlers"
import { settingsChangesList, settingsGet } from "@/api/v1/settings/handlers"
import { servicesList } from "@/api/v1/services/handlers"
import { peopleList, type PersonOut } from "@/api/v1/people/handlers"
import { visitsList } from "@/api/v1/visits/handlers"
import { today as todayOf } from "@/api/v1/shared"
import * as s from "@/db/schema"
import { loadBlocks } from "@/lib/jobber-feed"
import { ctxFromSession } from "./api-ctx"
import { canSeeContact } from "@/api/v1/shared"
import { failedChargeVisits, shapeAdminData, type ApiCustomer, type ApiMessage, type ApiPass, type ApiVisit } from "./shape"
import type { AdminData, Person, ServiceItem, Town } from "./types"

const PAGE = 100

/** The API's person as the screens hold it: a null field is left out. */
const personFromApi = (p: PersonOut): Person => ({
  id: p.id, name: p.name, initials: p.initials, role: p.role, workingDays: p.workingDays, capacityByKind: p.capacityByKind,
  ...(p.email ? { email: p.email } : {}), ...(p.phone ? { phone: p.phone } : {}), ...(p.truck ? { truck: p.truck } : {}), ...(p.jobberUserId ? { jobberUserId: p.jobberUserId } : {}),
  ...(p.seasonStart ? { seasonStart: p.seasonStart } : {}), ...(p.seasonEnd ? { seasonEnd: p.seasonEnd } : {}),
})
const MAX_PAGES = 100
/** How many of the organization's newest events the panels' stories are built from (decision 8 of the step 5 plan). */
const EVENT_LOAD = 5000

/** Every page of a paginated list handler, called in process with the caller's own principal. */
async function all<T>(ctx: Ctx, handler: Handler<never, never>, input: Record<string, unknown> = {}): Promise<T[]> {
  const rows: T[] = []
  let cursor: string | undefined
  for (let n = 0; n < MAX_PAGES; n++) {
    const out = (await callApi(ctx, handler as never, { ...input, limit: PAGE, ...(cursor ? { cursor } : {}) })) as { data: T[]; next_cursor: string | null }
    rows.push(...out.data)
    if (!out.next_cursor) break
    cursor = out.next_cursor
  }
  return rows
}

const serviceItem = (r: { id: string; taxable: boolean; active: boolean; bookable: boolean; key: string; name: string; description: string | null; kind: string; minZones: number | null; maxZones: number | null; includedZones: number | null; price: number | null; extraZonePrice: number | null; slotMinutes: number; quoteOnly: boolean }): ServiceItem => ({
  id: r.id, taxable: r.taxable, active: r.active, bookable: r.bookable, key: r.key, name: r.name, description: r.description, kind: r.kind, slotMinutes: r.slotMinutes, quoteOnly: r.quoteOnly,
  ...(r.minZones !== null ? { minZones: r.minZones } : {}), ...(r.maxZones !== null ? { maxZones: r.maxZones } : {}), ...(r.includedZones !== null ? { includedZones: r.includedZones } : {}),
  ...(r.price !== null ? { price: r.price } : {}), ...(r.extraZonePrice !== null ? { extraZonePrice: r.extraZonePrice } : {}),
})

/**
 * `AdminData` from the database, composed from the API's own list handlers
 * through `callApi` (so the caller's scopes apply and every read is logged)
 * plus direct reads of the Jobber mirror and the append-only consent table,
 * which have no handler. Needs a principal with the read scope.
 */
export async function getLiveAdminData(ctx: Ctx): Promise<AdminData> {
  const org = ctx.organizationId
  const [customers, visits, passes, messages, people, areas, settings, changes, serviceRows] = await Promise.all([
    all<ApiCustomer>(ctx, customersList as never),
    all<ApiVisit>(ctx, visitsList as never),
    all<ApiPass>(ctx, passesList as never),
    all<ApiMessage>(ctx, messagesList as never),
    callApi(ctx, peopleList, { active: "true" }),
    callApi(ctx, areasList, {}),
    callApi(ctx, settingsGet, {}),
    all<{ id: string; at: string; who: string; field: string; from: string; to: string }>(ctx, settingsChangesList as never),
    callApi(ctx, servicesList, {}),
  ])
  const { termsVersion: _terms, ...rest } = settings
  void _terms

  const db = ctx.db
  const contact = canSeeContact(ctx)
  const [consents, links, mClients, mVisits, mJobs, mQuotes, mInvoices, problems, blocks, synced, alerts, charges, dismissed, jobRows, lineRows, propertyRows, billRows, events] = await Promise.all([
    db.select({ customerId: s.consent.customerId, termsAcceptedAt: s.consent.termsAcceptedAt, termsVersion: s.consent.termsVersion, marketingOptIn: s.consent.marketingOptIn, marketingChannels: s.consent.marketingChannels, source: s.consent.source, recordedAt: s.consent.recordedAt }).from(s.consent).where(eq(s.consent.organizationId, org)),
    db.select({ id: s.customer.id, jobberClientId: s.customer.jobberClientId }).from(s.customer).where(and(eq(s.customer.organizationId, org), isNotNull(s.customer.jobberClientId))),
    db.select({ id: s.jobberClient.id, firstName: s.jobberClient.firstName, lastName: s.jobberClient.lastName, email: s.jobberClient.email, phone: s.jobberClient.phone, town: s.jobberClient.town, jobberUrl: s.jobberClient.jobberUrl }).from(s.jobberClient).where(eq(s.jobberClient.organizationId, org)),
    db.select({ id: s.jobberVisit.id, clientId: s.jobberVisit.clientId, kind: s.jobberVisit.kind, town: s.jobberVisit.town, startAt: s.jobberVisit.startAt, completedAt: s.jobberVisit.completedAt, jobberUrl: s.jobberVisit.jobberUrl }).from(s.jobberVisit).where(and(eq(s.jobberVisit.organizationId, org), eq(s.jobberVisit.isBlock, false))),
    db.select({ id: s.jobberJob.id, clientId: s.jobberJob.clientId, jobberUrl: s.jobberJob.jobberUrl }).from(s.jobberJob).where(and(eq(s.jobberJob.organizationId, org), eq(s.jobberJob.hasVisit, false), eq(s.jobberJob.status, "open"))),
    db.select().from(s.jobberQuote).where(eq(s.jobberQuote.organizationId, org)),
    db.select().from(s.jobberInvoice).where(eq(s.jobberInvoice.organizationId, org)),
    db.select({ id: s.queueItem.id, kind: s.queueItem.kind, lastError: s.queueItem.lastError, updatedAt: s.queueItem.updatedAt, status: s.queueItem.status }).from(s.queueItem).where(and(eq(s.queueItem.organizationId, org), isNotNull(s.queueItem.lastError), or(eq(s.queueItem.status, "pending"), eq(s.queueItem.status, "failed")))),
    loadBlocks(db, org, new Date(ctx.now.getTime() - 7 * 86_400_000)),
    db.select({ at: sql<Date | null>`max(${s.jobberClient.syncedAt})` }).from(s.jobberClient).where(eq(s.jobberClient.organizationId, org)),
    db.select({ kind: s.adminAlert.kind, key: s.adminAlert.key, passId: s.adminAlert.passId, message: s.adminAlert.message, createdAt: s.adminAlert.createdAt }).from(s.adminAlert).where(and(eq(s.adminAlert.organizationId, org), isNull(s.adminAlert.resolvedAt))),
    // every payment row of the organization, oldest first: the money words, the month totals and the owed rows are read from these
    db.select({ id: s.charge.id, jobId: s.charge.jobId, visitId: s.charge.visitId, amount: s.charge.amount, method: s.charge.method, status: s.charge.status, paidOn: s.charge.paidOn, refundsPaymentId: s.charge.refundsPaymentId, attempt: s.charge.attempt, createdAt: s.charge.createdAt })
      .from(s.charge).where(eq(s.charge.organizationId, org)).orderBy(asc(s.charge.createdAt), asc(s.charge.id)),
    db.select({ kind: s.adminAlert.kind, key: s.adminAlert.key }).from(s.adminAlert).where(and(eq(s.adminAlert.organizationId, org), isNotNull(s.adminAlert.resolvedAt))),
    db.select({ id: s.job.id, customerId: s.job.customerId, kind: s.job.kind, status: s.job.status, price: s.job.price, source: s.job.source, passNumber: s.job.passNumber, notes: s.job.notes }).from(s.job).where(eq(s.job.organizationId, org)),
    db.select({ id: s.lineItem.id, jobId: s.lineItem.jobId, visitId: s.lineItem.visitId, name: s.lineItem.name, description: s.lineItem.description, quantity: s.lineItem.quantity, unitPrice: s.lineItem.unitPrice, taxable: s.lineItem.taxable, cancelledAt: s.lineItem.cancelledAt }).from(s.lineItem).where(eq(s.lineItem.organizationId, org)).orderBy(asc(s.lineItem.createdAt), asc(s.lineItem.id)),
    db.select().from(s.property).where(eq(s.property.organizationId, org)).orderBy(asc(s.property.createdAt), asc(s.property.id)),
    // the organization's own bills (not the Jobber mirror's): the open ones make a job's money read Bill sent
    db.select().from(s.invoice).where(eq(s.invoice.organizationId, org)).orderBy(asc(s.invoice.sentOn), asc(s.invoice.id)),
    // the organization's newest events, loaded once like the messages and grouped by customer, job and visit; a caller without the write scope gets only the kinds `techEvent` allows
    loadEvents(ctx, {}, { limit: EVENT_LOAD }),
  ])

  return shapeAdminData({
    organizationId: org,
    now: ctx.now,
    today: todayOf(ctx),
    syncedAt: synced[0]?.at ? new Date(synced[0].at) : ctx.now,
    customers,
    jobberClientOf: new Map(links.map((l) => [l.id, l.jobberClientId!])),
    consents,
    visits,
    passes,
    messages,
    people: people.data.map(personFromApi),
    areas: areas.data.map((a) => ({ id: a.id, name: a.name, towns: a.towns as Town[] })),
    settings: rest as never,
    settingsChanges: changes,
    failedChargeVisitIds: failedChargeVisits(charges),
    paymentRows: charges,
    mirror: { clients: contact ? mClients : mClients.map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName, town: c.town, jobberUrl: c.jobberUrl })), visits: mVisits, jobsWithoutVisit: mJobs, quotes: mQuotes, invoices: mInvoices },
    queueProblems: problems,
    alerts,
    dismissed,
    jobRows,
    lineRows,
    // the pay link is a bearer link: only for the write scope, like the gate code (a tech's screens never carry it)
    invoiceRows: billRows.map((r) => ({ id: r.id, jobId: r.jobId, number: r.number, amount: r.amount, tax: r.tax, total: r.total, sentOn: r.sentOn, dueOn: r.dueOn, paidOn: r.paidOn, cancelledAt: r.cancelledAt, lines: r.lines, ...(contact && payLinkOf(r.id) ? { payUrl: payLinkOf(r.id) } : {}) })),
    // the same gate as `properties`: the street line, gate code, access note and on-site phone only with the write scope
    propertyRows: propertyRows.map((p) => ({
      id: p.id, customerId: p.customerId, town: p.town as Town, zones: p.zones, controller: p.controller, backflowLocation: p.backflowLocation, mustBeHome: p.mustBeHome, contactName: p.contactName, notes: p.notes,
      address: contact ? p.address : null, gateCode: null, accessNote: null, contactPhone: null, ...gateYard(ctx, p),
    })),
    events: events.data,
    blocks,
    services: serviceRows.data.map(serviceItem),
  })
}

/** The live branch of `getAdminData`: the signed-in person's own context. */
export async function loadLiveAdminData(): Promise<AdminData> {
  return getLiveAdminData(await ctxFromSession())
}
