import "server-only"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { readAppUrl } from "@/lib/env"
import { kindName, longDay, queueEmail, queueText } from "@/lib/pass/server/messages"

/**
 * The "your date" message for a visit: a text, or an email when the customer has no mobile number. `date-set` the first
 * time a day is given, `date-moved` after. One row per visit and day, so a repeat of the same event adds nothing. A visit
 * whose customer has neither a phone nor an email gets none. Returns whether a row was queued.
 */
export async function queueDateMessage(db: Database, visit: { id: string; organizationId: string; customerId: string; kind: string }, kind: "date-set" | "date-moved", day: string): Promise<boolean> {
  const [customer] = await db.select().from(s.customer).where(eq(s.customer.id, visit.customerId))
  if (!customer) return false
  const link = `${readAppUrl()}/account/pass`
  const what = kindName(visit.kind)
  const text = kind === "date-set" ? `Trailhead: your ${what} is ${longDay(day)}. Change your day or anything else: ${link}` : `Trailhead: your ${what} moved to ${longDay(day)}. Change your day or anything else: ${link}`
  const base = { organizationId: visit.organizationId, customerId: customer.id, visitId: visit.id, kind, key: `${visit.id}-${day}`, body: text } as const
  if (customer.phone) return queueText(db, { ...base, to: customer.phone })
  if (customer.email) return queueEmail(db, { ...base, to: customer.email, subject: kind === "date-set" ? `Your ${what} is ${longDay(day)}` : `Your ${what} moved to ${longDay(day)}` })
  return false
}
