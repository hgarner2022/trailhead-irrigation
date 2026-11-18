import "server-only"
import { callApi } from "@/api/core/call"
import type { Ctx } from "@/api/core/context"
import { jobsList } from "@/api/v1/portal/jobs"
import { customersMe } from "@/api/v1/portal/me"
import type { PortalCustomerType, PortalJobType } from "@/api/v1/portal/schemas"
import { today } from "@/api/v1/shared"
import { visitsAreaDays } from "@/api/v1/visits/handlers"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import { makeCtx } from "@/api/core/context"
import { verifyVisitLink } from "@/lib/messaging/tokens"
import { requireCustomer } from "@/lib/auth/guard"
import { ctxFromAccount } from "@/lib/admin/api-ctx"
import { loadPassPage, type PassPageData } from "@/lib/pass/server/pass-page"

/** The signed-in customer's context, or null for someone who is signed in but is not a customer (an admin reads no one's account here). */
export async function customerCtx(): Promise<Ctx | null> {
  const principal = await requireCustomer()
  return principal.type === "customer" ? await ctxFromAccount() : null
}

export interface AccountData {
  ctx: Ctx
  customer: PortalCustomerType
  jobs: PortalJobType[]
  today: string
}

/** The customer and their jobs, read through the API with their own principal. */
export async function loadAccount(ctx: Ctx): Promise<AccountData> {
  const [customer, jobs] = await Promise.all([callApi(ctx, customersMe, {}), callApi(ctx, jobsList, {})])
  return { ctx, customer, jobs: jobs.data, today: today(ctx) }
}

/**
 * The days `visits.areaDays` offers for each visit given, by visit id, up to five each (Reschedule's list). A visit with nothing open (or one the 24-hour rule
 * refuses) has an empty list, so the sheet says there are no open days and offers Text Ryan.
 */
export async function loadDays(ctx: Ctx, visitIds: readonly string[], count = 5): Promise<Record<string, string[]>> {
  const entries = await Promise.all(
    visitIds.map(async (id) => {
      try {
        return [id, (await callApi(ctx, visitsAreaDays, { id, count })).days] as const
      } catch {
        return [id, []] as const
      }
    }),
  )
  return Object.fromEntries(entries)
}

/** The newest pass the customer holds, for the card and season line; null for a customer who never held one. */
export async function loadNewestPass(ctx: Ctx): Promise<PassPageData | null> {
  return loadPassPage(ctx, { pickDays: false })
}

/**
 * The context of someone who came in by the signed link in a text about one visit (`/account/visits/<id>?t=`), or null when the link is wrong, expired
 * or for another visit or customer. It is the visit's customer, held to that one visit: `callApi` lets it call only the handlers marked `visitLink`, and only
 * for this visit (`principal.onlyVisitId`). It never reads from a request what it may open; the token is checked against the visit's own customer.
 */
export async function visitLinkCtx(visitId: string, token: string | null | undefined): Promise<Ctx | null> {
  if (!token) return null
  const { db } = await import("@/db")
  const database = db()
  const [row] = await database
    .select({ customerId: s.visit.customerId, organizationId: s.visit.organizationId, email: s.customer.email })
    .from(s.visit)
    .innerJoin(s.customer, eq(s.customer.id, s.visit.customerId))
    .where(eq(s.visit.id, visitId))
  if (!row || !verifyVisitLink(visitId, row.customerId, token)) return null
  return makeCtx(database, { kind: "person", id: `visit-link:${visitId}`, email: row.email ?? "", organizationId: row.organizationId, type: "customer", customerId: row.customerId, onlyVisitId: visitId })
}
