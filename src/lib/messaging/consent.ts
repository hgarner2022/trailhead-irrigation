import "server-only"
import { and, desc, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"

/** Sent to a customer because something happened to their pass or visit; go by email always and by text when there is a phone and no STOP. */
export const TRANSACTIONAL_KINDS = ["purchase-confirmation", "booking-confirmation", "date-set", "date-moved", "day-before", "date-confirm", "receipt", "card-failed", "card-expiring", "cancelled", "sign-in"] as const
/** Marketing, needing the matching opt-in; so is any kind not listed above. */
export const MARKETING_KINDS = ["renewal", "pre-sell"] as const

export type MessageChannel = "email" | "sms"

export interface Consent {
  marketingOptIn: boolean
  marketingChannels: MessageChannel[]
  /** the newest reply row is a STOP: no text of any kind until a START */
  smsStopped: boolean
}

/** A customer with no consent row yet (an admin-made record): transactional messages only. */
export const NO_CONSENT: Consent = { marketingOptIn: false, marketingChannels: [], smsStopped: false }

/**
 * The current consent: the newest row says what marketing the customer chose, and the newest `reply` row (STOP or START)
 * says whether texts are stopped, so a new purchase never switches a STOP back on.
 */
export async function currentConsent(db: Database, customerId: string): Promise<Consent> {
  const [newest] = await db.select().from(s.consent).where(eq(s.consent.customerId, customerId)).orderBy(desc(s.consent.recordedAt), desc(s.consent.id)).limit(1)
  if (!newest) return NO_CONSENT
  const [reply] = await db.select().from(s.consent).where(and(eq(s.consent.customerId, customerId), eq(s.consent.source, "reply"))).orderBy(desc(s.consent.recordedAt), desc(s.consent.id)).limit(1)
  return { marketingOptIn: newest.marketingOptIn, marketingChannels: newest.marketingChannels, smsStopped: reply?.note === "STOP" }
}

export function mayMessage(consent: Consent, kind: string, channel: MessageChannel, hasPhone: boolean): boolean {
  if ((TRANSACTIONAL_KINDS as readonly string[]).includes(kind)) {
    if (channel === "email") return true
    return hasPhone && !consent.smsStopped
  }
  if (channel === "sms" && (!hasPhone || consent.smsStopped)) return false
  return consent.marketingOptIn && consent.marketingChannels.includes(channel)
}
