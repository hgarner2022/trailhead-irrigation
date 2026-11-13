import "server-only"
import { and, eq, isNotNull, or, sql } from "drizzle-orm"
import { callApi } from "@/api/core/call"
import type { Ctx } from "@/api/core/context"
import type { Handler } from "@/api/core/handler"
import { areasList } from "@/api/v1/areas/handlers"
import { customersList } from "@/api/v1/customers/handlers"
import { messagesList } from "@/api/v1/messages/handlers"
import { passesList } from "@/api/v1/passes/handlers"
import { settingsChangesList, settingsGet } from "@/api/v1/settings/handlers"
import { trucksList } from "@/api/v1/trucks/handlers"
import { visitsList } from "@/api/v1/visits/handlers"
import { today as todayOf } from "@/api/v1/shared"
import * as s from "@/db/schema"
import { loadBlocks } from "@/lib/jobber-feed"
import { ctxFromSession } from "./api-ctx"
import { shapeAdminData, type ApiCustomer, type ApiMessage, type ApiPass, type ApiVisit } from "./shape"
import type { AdminData, Town, Truck } from "./types"

const PAGE = 100
const MAX_PAGES = 100

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

/**
 * `AdminData` from the database, composed from the API's own list handlers
 * through `callApi` (so the caller's scopes apply and every read is logged)
 * plus direct reads of the Jobber mirror and the append-only consent table,
 * which have no handler. Needs a principal with the read scope.
 */
export async function getLiveAdminData(ctx: Ctx): Promise<AdminData> {
  const org = ctx.organizationId
  const [customers, visits, passes, messages, trucks, areas, settings, changes] = await Promise.all([
    all<ApiCustomer>(ctx, customersList as never),
    all<ApiVisit>(ctx, visitsList as never),
    all<ApiPass>(ctx, passesList as never),
    all<ApiMessage>(ctx, messagesList as never),
    callApi(ctx, trucksList, {}),
    callApi(ctx, areasList, {}),
    callApi(ctx, settingsGet, {}),
    all<{ id: string; at: string; who: string; field: string; from: string; to: string }>(ctx, settingsChangesList as never),
  ])
  const { termsVersion: _terms, ...rest } = settings
  void _terms

  const db = ctx.db
  const [consents, links, mClients, mVisits, mJobs, mQuotes, mInvoices, problems, blocks, synced] = await Promise.all([
    db.select({ customerId: s.consent.customerId, termsAcceptedAt: s.consent.termsAcceptedAt, termsVersion: s.consent.termsVersion, marketingOptIn: s.consent.marketingOptIn, marketingChannels: s.consent.marketingChannels, source: s.consent.source, recordedAt: s.consent.recordedAt }).from(s.consent).where(eq(s.consent.organizationId, org)),
    db.select({ id: s.customer.id, jobberClientId: s.customer.jobberClientId }).from(s.customer).where(and(eq(s.customer.organizationId, org), isNotNull(s.customer.jobberClientId))),
    db.select({ id: s.jobberClient.id, firstName: s.jobberClient.firstName, town: s.jobberClient.town, jobberUrl: s.jobberClient.jobberUrl }).from(s.jobberClient).where(eq(s.jobberClient.organizationId, org)),
    db.select({ id: s.jobberVisit.id, clientId: s.jobberVisit.clientId, kind: s.jobberVisit.kind, town: s.jobberVisit.town, startAt: s.jobberVisit.startAt, completedAt: s.jobberVisit.completedAt, jobberUrl: s.jobberVisit.jobberUrl }).from(s.jobberVisit).where(and(eq(s.jobberVisit.organizationId, org), eq(s.jobberVisit.isBlock, false))),
    db.select({ id: s.jobberJob.id, clientId: s.jobberJob.clientId, jobberUrl: s.jobberJob.jobberUrl }).from(s.jobberJob).where(and(eq(s.jobberJob.organizationId, org), eq(s.jobberJob.hasVisit, false), eq(s.jobberJob.status, "open"))),
    db.select().from(s.jobberQuote).where(eq(s.jobberQuote.organizationId, org)),
    db.select().from(s.jobberInvoice).where(eq(s.jobberInvoice.organizationId, org)),
    db.select({ kind: s.queueItem.kind, lastError: s.queueItem.lastError, updatedAt: s.queueItem.updatedAt, status: s.queueItem.status }).from(s.queueItem).where(and(eq(s.queueItem.organizationId, org), isNotNull(s.queueItem.lastError), or(eq(s.queueItem.status, "pending"), eq(s.queueItem.status, "failed")))),
    loadBlocks(db, org, new Date(ctx.now.getTime() - 7 * 86_400_000)),
    db.select({ at: sql<Date | null>`max(${s.jobberClient.syncedAt})` }).from(s.jobberClient).where(eq(s.jobberClient.organizationId, org)),
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
    trucks: trucks.data.map((t): Truck => ({ id: t.id, name: t.name, ...(t.jobberUserId ? { jobberUserId: t.jobberUserId } : {}), workingDays: t.workingDays, capacityByKind: t.capacityByKind })),
    areas: areas.data.map((a) => ({ id: a.id, name: a.name, towns: a.towns as Town[] })),
    settings: rest as never,
    settingsChanges: changes,
    mirror: { clients: mClients, visits: mVisits, jobsWithoutVisit: mJobs, quotes: mQuotes, invoices: mInvoices },
    queueProblems: problems,
    blocks,
  })
}

/** The live branch of `getAdminData`: the signed-in person's own context. */
export async function loadLiveAdminData(): Promise<AdminData> {
  return getLiveAdminData(await ctxFromSession())
}
