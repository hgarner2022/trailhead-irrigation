import "server-only"
import { asc } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { makeCtx, systemPrincipal, type Ctx } from "@/api/core/context"
import { ApiError } from "@/api/core/errors"
import type { PersonPrincipal } from "@/lib/auth/types"

export interface CtxDeps {
  database?: () => Database
  getSession?: () => Promise<PersonPrincipal | null>
  now?: () => Date
  /** the address the anonymous request came from, for the checkout's rate limit */
  clientIp?: string
}

async function db(deps: CtxDeps): Promise<Database> {
  return deps.database ? deps.database() : (await import("@/db")).db()
}

async function session(): Promise<PersonPrincipal | null> {
  const { auth } = await import("@/auth")
  return (await auth())?.principal ?? null
}

/**
 * The context for a server component or a server action: the signed-in
 * person's principal and organization. Pages and actions then call
 * `callApi(ctx, handler, input)`, the same function the HTTPS route runs, so
 * there is no self-HTTP hop and nothing a screen can do that the API cannot.
 */
export async function ctxFromSession(deps: CtxDeps = {}): Promise<Ctx> {
  const principal = await (deps.getSession ?? session)()
  if (!principal) throw new ApiError("unauthorized", "Sign in to continue")
  return makeCtx(await db(deps), principal, { now: deps.now?.() })
}

/** The context for queue handlers and crons: a system principal with every scope, logged as `system`. */
export async function ctxForJob(organizationId: string, deps: CtxDeps = {}): Promise<Ctx> {
  return makeCtx(await db(deps), systemPrincipal(organizationId), { now: deps.now?.() })
}

/**
 * The context for the anonymous checkout: the `public` principal with the `checkout` scope, in Trailhead's organization (the
 * oldest, and today the only one). `passId` is the pass being bought, which is the only one `passes.activate` will accept.
 */
export async function ctxForCheckout(passId?: string, deps: CtxDeps = {}): Promise<Ctx> {
  const database = await db(deps)
  const [org] = await database.select({ id: s.organization.id }).from(s.organization).orderBy(asc(s.organization.createdAt)).limit(1)
  if (!org) throw new ApiError("unprocessable", "No organization is set up")
  return makeCtx(database, { kind: "public", id: "checkout", organizationId: org.id, scopes: ["checkout"], ...(passId ? { passId } : {}) }, { now: deps.now?.(), clientIp: deps.clientIp })
}
