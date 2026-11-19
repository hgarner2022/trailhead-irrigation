import "server-only"
import { and, desc, eq, gt, isNotNull, isNull, notInArray, or } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { recordDeliveryReport } from "./delivery-report"
import { fetchTextStatus, readTwilioEnv, type TextStatusFetcher } from "./twilio"

export interface RefreshedText {
  id: string
  status: string
  errorCode: string | null
}

/** A text older than this with no final report is left alone: Twilio stops reporting, and the cron would ask about it forever. */
const LOOK_BACK_MS = 3 * 24 * 3_600_000

/**
 * Asks Twilio what became of the newest texts that have a Twilio id and no final delivery report (none yet, or only queued, sending
 * or sent), one GET each, and stores the answer through the same writer the status webhook uses. This is the pull for texts sent before
 * delivery reports were asked for, and the backstop for a report that never came. A text Twilio cannot answer for is skipped; the rest
 * go on. Nothing happens while Twilio is not configured.
 */
export async function refreshDelivery(
  db: Database,
  opts: { organizationId: string; limit?: number; now?: Date; fetchStatus?: TextStatusFetcher },
): Promise<RefreshedText[]> {
  if (!opts.fetchStatus && !readTwilioEnv()) return []
  const fetchStatus = opts.fetchStatus ?? fetchTextStatus
  const since = new Date((opts.now ?? new Date()).getTime() - LOOK_BACK_MS)
  const rows = await db
    .select({ id: s.messageLog.id, sid: s.messageLog.providerId })
    .from(s.messageLog)
    .where(
      and(
        eq(s.messageLog.organizationId, opts.organizationId),
        eq(s.messageLog.channel, "sms"),
        eq(s.messageLog.direction, "out"),
        isNotNull(s.messageLog.providerId),
        gt(s.messageLog.createdAt, since),
        or(isNull(s.messageLog.deliveryStatus), notInArray(s.messageLog.deliveryStatus, ["delivered", "undelivered", "failed"])),
      ),
    )
    .orderBy(desc(s.messageLog.createdAt), desc(s.messageLog.id))
    .limit(opts.limit ?? 50)
  const out: RefreshedText[] = []
  for (const row of rows) {
    try {
      const answer = await fetchStatus(row.sid!)
      await recordDeliveryReport(db, { sid: row.sid!, status: answer.status, errorCode: answer.errorCode })
      out.push({ id: row.id, status: answer.status, errorCode: answer.errorCode })
    } catch {
      // One text Twilio would not answer for (a purged record, a blip) never stops the others; a constant line only, no customer data.
      console.error("delivery refresh: one text could not be checked")
    }
  }
  return out
}

/** `refreshDelivery` for every organization: what the cron runs once a pass. Returns how many texts were checked. */
export async function refreshDeliveryAll(db: Database, opts: { limit?: number; now?: Date; fetchStatus?: TextStatusFetcher } = {}): Promise<number> {
  let checked = 0
  for (const org of await db.select({ id: s.organization.id }).from(s.organization)) checked += (await refreshDelivery(db, { ...opts, organizationId: org.id })).length
  return checked
}
