import "server-only"
import { and, desc, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import type { PurchaseConsent } from "./purchase"

/** The `pass_change` kind that holds the boxes the customer ticked when the card form opened. */
export const CONSENT_SNAPSHOT = "consent-snapshot"

/**
 * The newest consent snapshot recorded for a pass, or undefined. The checkout records it when the card form mounts, so an
 * activation that arrives first from Stripe's webhook (the tab was closed after the card was saved) still records what was ticked.
 */
export async function consentSnapshot(db: Database, passId: string): Promise<PurchaseConsent | undefined> {
  const [row] = await db
    .select({ detail: s.passChange.detail })
    .from(s.passChange)
    .where(and(eq(s.passChange.passId, passId), eq(s.passChange.kind, CONSENT_SNAPSHOT)))
    .orderBy(desc(s.passChange.at))
    .limit(1)
  const d = row?.detail as Partial<PurchaseConsent> | undefined
  if (!d || !Array.isArray(d.marketingChannels)) return undefined
  const marketingChannels = d.marketingChannels.filter((c): c is "email" | "sms" => c === "email" || c === "sms")
  return { marketingOptIn: Boolean(d.marketingOptIn) && marketingChannels.length > 0, marketingChannels }
}
