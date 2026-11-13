import type { Database } from "@/db/types"
import type { Principal } from "@/lib/auth/types"

/** What every handler receives: the database, the organization it may touch, who is calling, and when. */
export interface Ctx {
  db: Database
  organizationId: string
  principal: Principal
  now: Date
  requestId: string
  /** the `Idempotency-Key` of the request; honoured by `callApi` on writes */
  idempotencyKey?: string
  /** the address the request came from, for the anonymous checkout's rate limit */
  clientIp?: string
}

export function makeCtx(db: Database, principal: Principal, extra: Partial<Pick<Ctx, "now" | "requestId" | "idempotencyKey" | "clientIp">> = {}): Ctx {
  return {
    db,
    organizationId: principal.organizationId,
    principal,
    now: extra.now ?? new Date(),
    requestId: extra.requestId ?? crypto.randomUUID(),
    idempotencyKey: extra.idempotencyKey,
    clientIp: extra.clientIp,
  }
}

export const SYSTEM_ID = "system"

/** The principal for queue handlers and crons: every scope, logged as `system`, never rate-limited. */
export const systemPrincipal = (organizationId: string): Principal => ({
  kind: "api-key",
  id: SYSTEM_ID,
  organizationId,
  scopes: ["read", "write", "admin"],
})
