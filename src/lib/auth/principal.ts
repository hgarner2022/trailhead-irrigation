import "server-only"
import type { Database } from "@/db/types"
import * as s from "@/db/schema"
import { checkApiKey, KEY_PREFIX } from "./api-key"
import type { PersonPrincipal, Principal, Scope } from "./types"

/** What a person's role may do: an owner or manager everything, a tech `read`. Customers have no scopes; they act on their own records. */
const ROLE_SCOPES: Record<string, readonly Scope[]> = {
  owner: ["read", "write", "admin"],
  admin: ["read", "write", "admin"],
  manager: ["read", "write", "admin"],
  tech: ["read"],
}

export function hasScope(principal: Principal | null | undefined, scope: Scope): boolean {
  if (!principal) return false
  if (principal.kind === "api-key") return principal.scopes.includes(scope)
  if (principal.type !== "admin" || !principal.role) return false
  return ROLE_SCOPES[principal.role]?.includes(scope) ?? false
}

async function sessionPrincipal(): Promise<PersonPrincipal | null> {
  const { auth } = await import("@/auth")
  return (await auth())?.principal ?? null
}

/**
 * Who is calling: a key from `Authorization: Bearer th_live_...`, else a person
 * from the session cookie, else null. A bearer header that is not a live key is
 * a refusal, never a fall-through to the cookie.
 */
export async function principalFromRequest(
  db: Database,
  request: Request,
  getSession: () => Promise<PersonPrincipal | null> = sessionPrincipal,
): Promise<Principal | null> {
  const header = request.headers.get("authorization")
  if (header) {
    const [scheme, token] = header.split(/\s+/)
    if (scheme?.toLowerCase() !== "bearer" || !token?.startsWith(KEY_PREFIX)) return null
    return checkApiKey(db, token)
  }
  return getSession()
}

export interface ApiCallRecord {
  method: string
  path: string
  status: number
  durationMs?: number
  idempotencyKey?: string
}

/** Every call, in process or over HTTPS, leaves a row saying who made it. */
export async function logApiCall(db: Database, principal: Principal, call: ApiCallRecord): Promise<void> {
  await db.insert(s.apiCall).values({
    organizationId: principal.organizationId,
    principalKind: principal.kind,
    principalId: principal.id,
    method: call.method,
    path: call.path,
    status: call.status,
    durationMs: call.durationMs,
    idempotencyKey: call.idempotencyKey,
  })
}
