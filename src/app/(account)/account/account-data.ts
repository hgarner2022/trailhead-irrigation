import "server-only"
import { callApi } from "@/api/core/call"
import type { Ctx } from "@/api/core/context"
import { jobsList } from "@/api/v1/portal/jobs"
import { customersMe } from "@/api/v1/portal/me"
import type { PortalCustomerType, PortalJobType } from "@/api/v1/portal/schemas"
import { today } from "@/api/v1/shared"
import { visitsAreaDays } from "@/api/v1/visits/handlers"
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
