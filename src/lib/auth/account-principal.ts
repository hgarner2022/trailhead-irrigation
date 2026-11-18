import "server-only"
import { and, asc, eq, sql } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import type { PersonPrincipal } from "./types"

/**
 * The principal the customer's account (`/account`) acts as. A customer is themselves. An admin whose signed-in email is also a customer's
 * on file (the owner's own address, say) sees the customer portal as that customer and the admin at `/admin` as an admin: the same
 * person, the same email, two doors (docs/plans/2026-11-18-customer-portal-architecture.md section 2). The email is the one the
 * sign-in link proved, matched case-insensitively inside the admin's own organization; no match leaves the admin an admin.
 */
export async function accountPrincipal(db: Database, principal: PersonPrincipal): Promise<PersonPrincipal> {
  if (principal.type === "customer") return principal
  const [match] = await db
    .select({ id: s.customer.id })
    .from(s.customer)
    .where(and(eq(s.customer.organizationId, principal.organizationId), sql`lower(${s.customer.email}) = ${principal.email.trim().toLowerCase()}`))
    .orderBy(asc(s.customer.createdAt), asc(s.customer.id))
    .limit(1)
  if (!match) return principal
  const { role: _role, ...rest } = principal
  return { ...rest, type: "customer", customerId: match.id, email: principal.email.trim().toLowerCase() }
}
