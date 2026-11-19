import "server-only"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { MESSAGE_KIND_WORDS } from "@/lib/events/timeline"
import { isUndelivered, reasonWords } from "./delivery"

/** The statuses Twilio's status callback sends (`MessageStatus`). */
export const DELIVERY_STATUSES = ["queued", "sending", "sent", "delivered", "undelivered", "failed"] as const

// Twilio sends reports as the message moves and not always in order: a later step is never overwritten by an earlier one.
const RANK: Record<string, number> = { queued: 0, sending: 1, sent: 2, delivered: 3, undelivered: 3, failed: 3 }

export interface DeliveryReport {
  sid: string
  status: string
  errorCode?: string | null
}

/** The kind of Home row a text that did not arrive raises. */
export const TEXT_UNDELIVERED = "text-undelivered"

/** The Home line: "Text not delivered: Hannah, date set. Filtered by the carrier." */
export const undeliveredMessage = (firstName: string, kind: string, errorCode: string | null | undefined): string =>
  `Text not delivered: ${firstName}, ${MESSAGE_KIND_WORDS[kind] ?? kind.replace(/-/g, " ")}. ${reasonWords(errorCode)}.`

/**
 * Stores one Twilio status report on the text's `message_log` row (the row whose `provider_id` is the sid). An unknown sid or
 * status adds nothing, a repeat changes nothing, and an earlier step never replaces a later one. The error code is kept only
 * on an `undelivered` or `failed` report, which also raises one Home row for the message (`admin_alert` kind `text-undelivered`, key
 * `<visit id or "-">:<customer id>:<message id>`, so a repeat adds nothing and a dismissed row stays gone). Returns whether a row was found.
 */
export async function recordDeliveryReport(db: Database, report: DeliveryReport): Promise<boolean> {
  if (!report.sid || !(DELIVERY_STATUSES as readonly string[]).includes(report.status)) return false
  const [row] = await db.select().from(s.messageLog).where(and(eq(s.messageLog.providerId, report.sid), eq(s.messageLog.channel, "sms")))
  if (!row) return false
  if ((RANK[row.deliveryStatus ?? ""] ?? -1) > RANK[report.status]!) return true
  const failed = isUndelivered(report.status)
  const code = failed ? report.errorCode?.trim() || null : null
  await db.update(s.messageLog).set({ deliveryStatus: report.status, deliveryError: code, updatedAt: new Date() }).where(eq(s.messageLog.id, row.id))
  if (failed) {
    const [customer] = await db.select({ first: s.customer.firstName }).from(s.customer).where(eq(s.customer.id, row.customerId))
    await db
      .insert(s.adminAlert)
      .values({ organizationId: row.organizationId, kind: TEXT_UNDELIVERED, key: `${row.visitId ?? "-"}:${row.customerId}:${row.id}`, message: undeliveredMessage(customer?.first ?? "A customer", row.kind, code) })
      .onConflictDoNothing()
  }
  return true
}
