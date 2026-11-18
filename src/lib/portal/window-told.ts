import "server-only"
import { and, eq, inArray } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"

/** The `message_log` key of a visit's day-before message, the one `dayBeforeMessages` writes. */
export const dayBeforeKey = (visitId: string, day: string) => `${visitId}-${day}`

/**
 * Which of these visits have had their window told: the `day-before` message row for the visit on its present day exists
 * (docs/plans/2026-11-18-customer-portal-architecture.md section 4). A day is a promise and a window is a message, so a customer
 * (and every text, email and card that states a time) sees a window only from this fact, never from `visit.start_time` alone.
 * A visit that moved has a row for its old day, which is not this day's, so it reads as not told until a new row exists.
 */
export async function windowTold(db: Database, organizationId: string, visits: readonly { id: string; scheduledOn: string | null }[]): Promise<Set<string>> {
  const dated = visits.filter((v) => v.scheduledOn)
  if (!dated.length) return new Set()
  const rows = await db
    .select({ visitId: s.messageLog.visitId, key: s.messageLog.key })
    .from(s.messageLog)
    .where(and(eq(s.messageLog.organizationId, organizationId), eq(s.messageLog.kind, "day-before"), inArray(s.messageLog.visitId, dated.map((v) => v.id))))
  const keys = new Set(rows.map((r) => r.key))
  return new Set(dated.filter((v) => keys.has(dayBeforeKey(v.id, v.scheduledOn!))).map((v) => v.id))
}
