import "server-only"
import { and, eq, inArray, or } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"

/**
 * Puts queue rows that are retrying or gave up back at the front of the line with a fresh count, for one organization.
 * Home's Retry on a failed-task row calls this with the row's ids (a grouped row carries all of them); the cron drain
 * picks them up. Returns how many rows it moved.
 */
export async function retryQueueTasks(db: Database, organizationId: string, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0
  const moved = await db
    .update(s.queueItem)
    .set({ status: "pending", attempts: 0, runAfter: new Date(), lastError: null, claimedAt: null })
    .where(and(eq(s.queueItem.organizationId, organizationId), inArray(s.queueItem.id, ids), or(eq(s.queueItem.status, "pending"), eq(s.queueItem.status, "failed"))))
    .returning({ id: s.queueItem.id })
  return moved.length
}
