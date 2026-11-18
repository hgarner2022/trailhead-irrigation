import "server-only"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { NO_TAX, taxRuleOf, type TaxRule } from "@/lib/jobs/tax"

/** The organization's sales tax rule (`settings.billing`), read once per request; an organization that never saved Billing collects nothing. */
export async function loadTaxRule(db: Database, organizationId: string): Promise<TaxRule> {
  const [org] = await db.select({ settings: s.organization.settings }).from(s.organization).where(eq(s.organization.id, organizationId))
  return org ? taxRuleOf(org.settings.billing) : NO_TAX
}
