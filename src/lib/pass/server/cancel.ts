import "server-only"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { baseData } from "@/lib/messaging/data"
import { queueMessage } from "@/lib/messaging/queue"
import { loadPassRecord } from "./record"

/** The Home line for a cancelled pass: "Season Pass TH-2027-0004 cancelled: Andrea, Erie". */
export const cancelledMessage = (number: string, firstName: string, town: string) => `Season Pass ${number} cancelled: ${firstName}, ${town}`

async function loadPass(db: Database, passId: string, organizationId?: string) {
  const pass = await loadPassRecord(db, passId, organizationId)
  if (!pass) throw new Error(`Pass ${passId} not found`)
  const [row] = await db
    .select({ customer: s.customer, town: s.property.town })
    .from(s.customer)
    .innerJoin(s.property, eq(s.property.id, pass.propertyId))
    .where(eq(s.customer.id, pass.customerId))
  if (!row) throw new Error(`Pass ${passId} not found`)
  return { pass, ...row }
}

/**
 * The `pass-cancel` task. There is no Jobber API connection, so it cancels no Jobber jobs: it raises the Home alert (one per
 * pass, a repeat adds nothing) and the Claude routine (`docs/jobber-routine.md`) reads cancelled passes and cancels their
 * Jobber requests and jobs. The id may be a job id or the old pass id of a task queued before the move; the alert is keyed by the
 * job id either way. Returns whether this call raised the alert.
 */
export async function cancelPassTask(db: Database, passId: string, organizationId?: string): Promise<boolean> {
  const { pass, customer, town } = await loadPass(db, passId, organizationId)
  if (!pass.cancelledAt) return false
  const added = await db
    .insert(s.adminAlert)
    .values({ organizationId: pass.organizationId, kind: "pass-cancelled", key: pass.jobId, jobId: pass.jobId, message: cancelledMessage(pass.number, customer.firstName, town) })
    .onConflictDoNothing()
    .returning({ id: s.adminAlert.id })
  return added.length > 0
}

/** The `cancelled` email row: nothing further is charged, with the pass page link. A customer with no email gets none. The message is once per pass (its key is the job id, which the old pass id resolves to). */
export async function queueCancelledEmail(db: Database, passId: string, origin: string, organizationId?: string): Promise<boolean> {
  const { pass, customer } = await loadPass(db, passId, organizationId)
  if (!customer.email) return false
  return queueMessage(db, { organizationId: pass.organizationId, customerId: customer.id, kind: "cancelled", key: pass.jobId, data: { ...baseData(origin, customer), passNumber: pass.number } })
}
