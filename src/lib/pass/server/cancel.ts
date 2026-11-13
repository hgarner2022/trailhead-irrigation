import "server-only"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { baseData } from "@/lib/messaging/data"
import { queueMessage } from "@/lib/messaging/queue"

/** The Home line for a cancelled pass: "Season Pass TH-2027-0004 cancelled: Andrea, Erie". */
export const cancelledMessage = (number: string, firstName: string, town: string) => `Season Pass ${number} cancelled: ${firstName}, ${town}`

async function loadPass(db: Database, passId: string) {
  const [row] = await db
    .select({ pass: s.seasonPass, customer: s.customer, town: s.property.town })
    .from(s.seasonPass)
    .innerJoin(s.customer, eq(s.customer.id, s.seasonPass.customerId))
    .innerJoin(s.property, eq(s.property.id, s.seasonPass.propertyId))
    .where(eq(s.seasonPass.id, passId))
  if (!row) throw new Error(`Pass ${passId} not found`)
  return row
}

/**
 * The `pass-cancel` task. There is no Jobber API connection, so it cancels no Jobber jobs: it raises the Home alert (one per
 * pass, a repeat adds nothing) and the Claude routine (`docs/jobber-routine.md`) reads cancelled passes and cancels their
 * Jobber requests and jobs. Returns whether this call raised the alert.
 */
export async function cancelPassTask(db: Database, passId: string): Promise<boolean> {
  const { pass, customer, town } = await loadPass(db, passId)
  if (pass.status !== "cancelled") return false
  const added = await db
    .insert(s.adminAlert)
    .values({ organizationId: pass.organizationId, kind: "pass-cancelled", key: passId, passId, message: cancelledMessage(pass.number, customer.firstName, town) })
    .onConflictDoNothing()
    .returning({ id: s.adminAlert.id })
  return added.length > 0
}

/** The `cancelled` email row: nothing further is charged, with the pass page link. A customer with no email gets none. */
export async function queueCancelledEmail(db: Database, passId: string, origin: string): Promise<boolean> {
  const { pass, customer } = await loadPass(db, passId)
  if (!customer.email) return false
  return queueMessage(db, { organizationId: pass.organizationId, customerId: customer.id, kind: "cancelled", key: passId, data: { ...baseData(origin, customer), passNumber: pass.number } })
}
