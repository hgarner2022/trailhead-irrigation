import "server-only"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"

/** The statuses Twilio's status callback sends (`MessageStatus`). */
export const DELIVERY_STATUSES = ["queued", "sending", "sent", "delivered", "undelivered", "failed"] as const

// Twilio sends reports as the message moves and not always in order: a later step is never overwritten by an earlier one.
const RANK: Record<string, number> = { queued: 0, sending: 1, sent: 2, delivered: 3, undelivered: 3, failed: 3 }

export interface DeliveryReport {
  sid: string
  status: string
  errorCode?: string | null
}

/**
 * Stores one Twilio status report on the text's `message_log` row (the row whose `provider_id` is the sid). An unknown sid or
 * status adds nothing, a repeat changes nothing, and an earlier step never replaces a later one. The error code is kept only
 * on an `undelivered` or `failed` report. Returns whether a row was found.
 */
export async function recordDeliveryReport(db: Database, report: DeliveryReport): Promise<boolean> {
  if (!report.sid || !(DELIVERY_STATUSES as readonly string[]).includes(report.status)) return false
  const [row] = await db.select().from(s.messageLog).where(and(eq(s.messageLog.providerId, report.sid), eq(s.messageLog.channel, "sms")))
  if (!row) return false
  if ((RANK[row.deliveryStatus ?? ""] ?? -1) > RANK[report.status]!) return true
  const failed = report.status === "undelivered" || report.status === "failed"
  await db.update(s.messageLog).set({ deliveryStatus: report.status, deliveryError: failed ? report.errorCode?.trim() || null : null, updatedAt: new Date() }).where(eq(s.messageLog.id, row.id))
  return true
}
