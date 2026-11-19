import "server-only"
import type { Ctx } from "@/api/core/context"
import { visitLinkCtx } from "@/app/(account)/account/account-data"
import { ctxFromAccount, ctxFromSession } from "@/lib/admin/api-ctx"

/**
 * Who might be asking, best first, for a photo of one visit. A text's link (`token`) is the visit's own customer held to that visit, nothing
 * else. Otherwise the signed-in person, as themselves (an admin or a tech at `/admin`) and, when they are also a customer, as that customer
 * (`/account`): the same cookie serves both screens, so the route tries each and the first that the photo rules admit wins. Never reads an
 * identity from the request body or query.
 */
export async function photoContexts(visitId: string, token?: string | null): Promise<Ctx[]> {
  if (token) {
    const link = await visitLinkCtx(visitId, token)
    return link ? [link] : []
  }
  const out: Ctx[] = []
  try {
    out.push(await ctxFromSession())
  } catch {
    return out
  }
  try {
    out.push(await ctxFromAccount())
  } catch {
    // not a customer as well
  }
  return out
}
