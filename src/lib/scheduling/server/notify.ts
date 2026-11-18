import "server-only"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { readAppUrl } from "@/lib/env"
import { baseData, loadVisitFacts } from "@/lib/messaging/data"
import { queueMessage } from "@/lib/messaging/queue"

/**
 * The "your date" message for a visit: a text, or an email when the customer has no mobile number. `date-set` the first
 * time a day is given, `date-moved` after. One row per visit and day, so a repeat of the same event adds nothing. A visit
 * whose customer has neither a phone nor an email gets none. Returns whether a row was queued.
 */
/** What Ryan's own move adds (`visits.move`): his line, the YES ask for a property that must be home, a time he chose (it carries the window and who is coming), and a key of its own so every move he makes is texted. */
export interface DateMessageOptions {
  key?: string
  note?: string
  asked?: boolean
  told?: boolean
}

export async function queueDateMessage(db: Database, visit: { id: string; organizationId: string; customerId: string; kind: string }, kind: "date-set" | "date-moved", day: string, opts: DateMessageOptions = {}): Promise<boolean> {
  const [customer] = await db.select().from(s.customer).where(eq(s.customer.id, visit.customerId))
  if (!customer) return false
  const origin = readAppUrl()
  const facts = await loadVisitFacts(db, visit.id, origin, day, opts.told ? { told: true } : undefined)
  if (!facts) return false
  const visitFacts = { ...facts, ...(opts.note ? { note: opts.note } : {}), ...(opts.asked ? { asked: true } : {}) }
  return queueMessage(db, { organizationId: visit.organizationId, customerId: customer.id, visitId: visit.id, kind, key: opts.key ?? `${visit.id}-${day}`, data: { ...baseData(origin, customer), visit: visitFacts } })
}
