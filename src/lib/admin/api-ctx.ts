import "server-only"
import type { Database } from "@/db/types"
import { makeCtx, systemPrincipal, type Ctx } from "@/api/core/context"
import { ApiError } from "@/api/core/errors"
import type { PersonPrincipal } from "@/lib/auth/types"

export interface CtxDeps {
  database?: () => Database
  getSession?: () => Promise<PersonPrincipal | null>
  now?: () => Date
}

async function database(deps: CtxDeps): Promise<Database> {
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
  return makeCtx(await database(deps), principal, { now: deps.now?.() })
}

/** The context for queue handlers and crons: a system principal with every scope, logged as `system`. */
export async function ctxForJob(organizationId: string, deps: CtxDeps = {}): Promise<Ctx> {
  return makeCtx(await database(deps), systemPrincipal(organizationId), { now: deps.now?.() })
}
