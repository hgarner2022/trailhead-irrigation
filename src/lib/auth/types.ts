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

export type Principal = PersonPrincipal | ApiKeyPrincipal

export type Scope = "read" | "write" | "admin"
