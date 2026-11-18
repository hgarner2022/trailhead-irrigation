import "server-only"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { loadPassRecord } from "./record"

/** The Home line for a pass that just turned active: "New Season Pass: Andrea, Erie, 8 zones". */
export const newPassMessage = (firstName: string, town: string, zones: number) => `New Season Pass: ${firstName}, ${town}, ${zones} zones`

/**
 * The `pass-onboard` task. There is no Jobber API connection, so it creates no Jobber client or jobs. It raises the Home alert
 * (one per pass, a repeat adds nothing) and leaves the visits as the "to schedule" rows they already are: the scheduler (Phase 10)
 * places them, and the Claude routine (`docs/jobber-routine.md`) reads new active passes from `/api/v1/passes` and creates the
 * Jobber client and requests. The id may be a job id or the old pass id of a task queued before the move; the alert is keyed by
 * the job id either way. Returns whether this call raised the alert.
 */
export async function onboardPass(db: Database, passId: string, organizationId?: string): Promise<boolean> {
  const pass = await loadPassRecord(db, passId, organizationId)
  if (!pass) throw new Error(`Pass ${passId} not found`)
  const [who] = await db
    .select({ firstName: s.customer.firstName, town: s.property.town })
    .from(s.customer)
    .innerJoin(s.property, eq(s.property.id, pass.propertyId))
    .where(eq(s.customer.id, pass.customerId))
  // A pass canceled between the purchase and this task needs no welcome, and a pass not sold yet has nothing to announce.
  if (!who || !pass.soldOn || pass.cancelledAt) return false
  const added = await db
    .insert(s.adminAlert)
    .values({ organizationId: pass.organizationId, kind: "new-pass", key: pass.jobId, jobId: pass.jobId, message: newPassMessage(who.firstName, who.town, pass.zones) })
    .onConflictDoNothing()
    .returning({ id: s.adminAlert.id })
  return added.length > 0
}
