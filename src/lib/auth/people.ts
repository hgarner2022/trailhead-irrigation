import "server-only"
import { and, asc, eq, isNotNull, sql } from "drizzle-orm"
import type { Database } from "@/db/types"
import * as s from "@/db/schema"
import { classify, type Classification } from "./allow"

export interface PersonMatch {
  organizationId: string
  classification: Classification
}

/**
 * The organization and classification of an email, from the people who work
 * here (`person`, active and with an email) first and the customers on file
 * second. Null for a stranger. A tech with an email signs in with role tech;
 * the guard treats them as read-only.
 */
export async function findPerson(db: Database, email: string): Promise<PersonMatch | null> {
  const lower = email.trim().toLowerCase()
  const admins = await db
    .select({ email: s.person.email, role: s.person.role, organizationId: s.person.organizationId })
    .from(s.person)
    .where(and(isNotNull(s.person.email), eq(s.person.active, true), sql`lower(${s.person.email}) = ${lower}`))
    // One row per email per organization by the unique index; should that ever slip, the owner wins and the answer never changes between calls.
    .orderBy(sql`case when ${s.person.role} = 'owner' then 0 else 1 end`, asc(s.person.id))
    .limit(1)
  const customers = await db
    .select({ email: s.customer.email, id: s.customer.id, organizationId: s.customer.organizationId })
    .from(s.customer)
    .where(sql`lower(${s.customer.email}) = ${lower}`)
    .limit(1)
  const classification = classify(
    lower,
    admins.flatMap((a) => (a.email ? [{ email: a.email, role: a.role }] : [])),
    customers.flatMap((c) => (c.email ? [{ email: c.email, customerId: c.id }] : [])),
  )
  if (!classification) return null
  const organizationId = classification.kind === "admin" ? admins[0]!.organizationId : customers[0]!.organizationId
  return { organizationId, classification }
}
