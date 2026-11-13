import "server-only"
import type { Database } from "@/db/types"
import { principalFromRequest } from "@/lib/auth/principal"
import type { PersonPrincipal } from "@/lib/auth/types"
import { callApi } from "./call"
import { makeCtx } from "./context"
import { ApiError } from "./errors"
import type { AnyHandler } from "./handler"

export interface RouteDeps {
  database?: () => Database
  getSession?: () => Promise<PersonPrincipal | null>
}

type RouteContext = { params?: Promise<Record<string, string | string[]>> }

async function defaultDatabase(): Promise<Database> {
  const { db } = await import("@/db")
  return db()
}

const json = (body: unknown, status: number, requestId: string) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "x-request-id": requestId } })

async function readInput(request: Request, route: RouteContext, method: string) {
  const query = Object.fromEntries(new URL(request.url).searchParams)
  let body: Record<string, unknown> = {}
  if (method !== "GET" && method !== "DELETE") {
    const text = await request.text()
    if (text) {
      try {
        const parsed: unknown = JSON.parse(text)
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("not an object")
        body = parsed as Record<string, unknown>
      } catch {
        throw new ApiError("invalid", "The request body must be a JSON object")
      }
    }
  }
  const params = (await route.params) ?? {}
  return { ...query, ...body, ...params }
}

/** Builds a Next route function from a handler: principal, input merge, idempotency header, error shape, request id. */
export function route(handler: AnyHandler, deps: RouteDeps = {}) {
  return async (request: Request, routeContext: RouteContext = {}): Promise<Response> => {
    const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID()
    try {
      const db = deps.database ? deps.database() : await defaultDatabase()
      const principal = await principalFromRequest(db, request, deps.getSession)
      if (!principal) throw new ApiError("unauthorized", "Send a valid API key as `Authorization: Bearer th_live_...` or sign in")
      const input = await readInput(request, routeContext, handler.method)
      const ctx = makeCtx(db, principal, { requestId, idempotencyKey: request.headers.get("idempotency-key") ?? undefined })
      const output = await callApi(ctx, handler, input)
      return json(output, handler.status ?? 200, requestId)
    } catch (error) {
      if (error instanceof ApiError)
        return json({ error: { code: error.code, message: error.message, ...(error.issues ? { issues: error.issues } : {}) } }, error.status, requestId)
      console.error("api error", requestId, error)
      return json({ error: { code: "internal", message: "Something went wrong" } }, 500, requestId)
    }
  }
}
