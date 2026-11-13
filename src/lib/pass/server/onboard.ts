import "server-only"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"

/** The Home line for a pass that just turned active: "New Season Pass: Andrea, Erie, 8 zones". */
export const newPassMessage = (firstName: string, town: string, zones: number) => `New Season Pass: ${firstName}, ${town}, ${zones} zones`

/**
 * The `pass-onboard` task. There is no Jobber API connection, so it creates no Jobber client or jobs. It raises the Home alert
 * (one per pass, a repeat adds nothing) and leaves the visits as the "to schedule" rows they already are: the scheduler (Phase 10)
 * places them, and the Claude routine (`docs/jobber-routine.md`) reads new active passes from `/api/v1/passes` and creates the
 * Jobber client and requests. Returns whether this call raised the alert.
 */
export async function onboardPass(db: Database, passId: string): Promise<boolean> {
  const [row] = await db
    .select({ pass: s.seasonPass, firstName: s.customer.firstName, town: s.property.town })
    .from(s.seasonPass)
    .innerJoin(s.customer, eq(s.customer.id, s.seasonPass.customerId))
    .innerJoin(s.property, eq(s.property.id, s.seasonPass.propertyId))
    .where(eq(s.seasonPass.id, passId))
  if (!row) throw new Error(`Pass ${passId} not found`)
  // A pass cancelled between the purchase and this task needs no welcome.
  if (row.pass.status !== "active") return false
  const added = await db
    .insert(s.adminAlert)
    .values({ organizationId: row.pass.organizationId, kind: "new-pass", key: passId, passId, message: newPassMessage(row.firstName, row.town, row.pass.zones) })
    .onConflictDoNothing()
    .returning({ id: s.adminAlert.id })
  return added.length > 0
}
