import "server-only"
import { and, eq, gt, sql } from "drizzle-orm"
import type { z } from "zod"
import * as s from "@/db/schema"
import { hasScope, logApiCall } from "@/lib/auth/principal"
import type { Ctx } from "./context"
import { SYSTEM_ID } from "./context"
import { ApiError } from "./errors"
import type { Handler } from "./handler"
import { hashRequest, withIdempotency } from "./idempotency"

export const RATE_LIMIT_PER_MINUTE = 120

const WRITES = new Set(["POST", "PATCH", "DELETE"])

function allowed(ctx: Ctx, handler: Handler): boolean {
  if (ctx.principal.kind === "public") return Boolean(handler.checkout)
  if (hasScope(ctx.principal, handler.scope)) return true
  const p = ctx.principal
  return Boolean(handler.customerSelf && p.kind === "person" && p.type === "customer" && p.customerId)
}

async function checkRate(ctx: Ctx) {
  const p = ctx.principal
  if (p.kind !== "api-key" || p.id === SYSTEM_ID) return
  const since = new Date(Date.now() - 60_000)
  const [row] = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.apiCall)
    .where(and(eq(s.apiCall.principalId, p.id), gt(s.apiCall.at, since)))
  if ((row?.n ?? 0) >= RATE_LIMIT_PER_MINUTE) throw new ApiError("rate_limited", `More than ${RATE_LIMIT_PER_MINUTE} requests a minute`)
}

/**
 * The one way a handler runs, in process or over HTTPS: scope, input schema,
 * rate limit, idempotency on writes, the handler, the output schema (so a
 * handler can never leak a field the schema does not name), and one `api_call`
 * row saying who made the call.
 */
export async function callApi<I extends z.ZodObject, O extends z.ZodType>(
  ctx: Ctx,
  handler: Handler<I, O>,
  input: unknown,
): Promise<z.infer<O>> {
  const started = Date.now()
  let status = 200
  try {
    if (!allowed(ctx, handler)) throw new ApiError("forbidden", `This call needs the ${handler.scope} scope`)
    const parsed = handler.input.safeParse(input ?? {})
    if (!parsed.success)
      throw new ApiError(
        "invalid",
        "The input did not match the schema",
        parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      )
    const visitor = ctx.principal
    if (visitor.kind === "public" && handler.checkout === "own-pass" && (!visitor.passId || (parsed.data as { id?: string }).id !== visitor.passId))
      throw new ApiError("forbidden", "This call is only for the pass being bought")
    await checkRate(ctx)
    const run = async () => handler.output.parse(await handler.run(ctx, parsed.data)) as z.infer<O>
    if (ctx.idempotencyKey && WRITES.has(handler.method))
      return await withIdempotency(ctx.db, ctx.organizationId, ctx.principal.id, ctx.idempotencyKey, hashRequest(handler.name, parsed.data), run, handler.returnsSecret)
    return await run()
  } catch (error) {
    status = error instanceof ApiError ? error.status : 500
    throw error
  } finally {
    await logApiCall(ctx.db, ctx.principal, {
      method: handler.method,
      path: handler.path,
      status,
      durationMs: Date.now() - started,
      idempotencyKey: ctx.idempotencyKey,
    })
  }
}
