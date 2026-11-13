import "server-only"
import { sql } from "drizzle-orm"
import type { Database } from "@/db/types"
import * as s from "@/db/schema"
import { classify, type Classification } from "./allow"

export interface PersonMatch {
  organizationId: string
  classification: Classification
}

/**
 * The organization and classification of an email, from the admin allow-list
 * (`admin_user`) first and the customers on file second. Null for a stranger.
 */
export async function findPerson(db: Database, email: string): Promise<PersonMatch | null> {
  const lower = email.trim().toLowerCase()
  const admins = await db
    .select({ email: s.adminUser.email, role: s.adminUser.role, organizationId: s.adminUser.organizationId })
    .from(s.adminUser)
    .where(sql`lower(${s.adminUser.email}) = ${lower}`)
  const customers = await db
    .select({ email: s.customer.email, id: s.customer.id, organizationId: s.customer.organizationId })
    .from(s.customer)
    .where(sql`lower(${s.customer.email}) = ${lower}`)
    .limit(1)
  const classification = classify(
    lower,
    admins.map((a) => ({ email: a.email, role: a.role })),
    customers.flatMap((c) => (c.email ? [{ email: c.email, customerId: c.id }] : [])),
  )
  if (!classification) return null
  const organizationId = classification.kind === "admin" ? admins[0]!.organizationId : customers[0]!.organizationId
  return { organizationId, classification }
}
