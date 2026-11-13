import type { AdminRole } from "./allow"

/** A signed-in person: an admin (with a role) or a customer (with their customer row). */
export interface PersonPrincipal {
  kind: "person"
  /** the auth_user id */
  id: string
  email: string
  organizationId: string
  type: "admin" | "customer"
  role?: AdminRole
  customerId?: string
}

/** A bearer key, with exactly the scopes it was given. */
export interface ApiKeyPrincipal {
  kind: "api-key"
  id: string
  organizationId: string
  scopes: string[]
}

/**
 * The anonymous checkout visitor: no sign-in, the `checkout` scope only. It may call just the handlers marked
 * `checkout` (passes.create, passes.activate for its own pass, schedule.slots, bookings.create) and nothing else.
 */
export interface PublicPrincipal {
  kind: "public"
  id: "checkout"
  organizationId: string
  scopes: ["checkout"]
  /** the pass this visitor is buying; `passes.activate` is allowed only for it */
  passId?: string
  /** the pass this visitor may renew: set only by server code that checked the signed link or the signed-in customer, never from a request */
  renewPassId?: string
}

export type Principal = PersonPrincipal | ApiKeyPrincipal | PublicPrincipal

export type Scope = "read" | "write" | "admin"
