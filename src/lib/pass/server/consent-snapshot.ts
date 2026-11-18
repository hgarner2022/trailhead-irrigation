import "server-only"
import { and, desc, eq, sql } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import type { PurchaseConsent } from "./purchase"

/** The `pass_change` kind that holds the boxes the customer ticked when the card form opened (an alias; the event of it is a `consent` with `stage` `chosen`). */
export const CONSENT_SNAPSHOT = "consent-snapshot"

/**
 * The newest consent snapshot recorded for a pass, or undefined: the newest `consent` event of the pass's job with `stage` `chosen`.
 * The checkout records it when the card form mounts, so an activation that arrives first from Stripe's webhook (the tab was closed
 * after the card was saved) still records what was ticked. (The consent written at the purchase has no stage and is not read here.)
 */
export async function consentSnapshot(db: Database, passId: string): Promise<PurchaseConsent | undefined> {
  const [pass] = await db.select({ jobId: s.seasonPass.jobId, organizationId: s.seasonPass.organizationId }).from(s.seasonPass).where(eq(s.seasonPass.id, passId))
  if (!pass) return undefined
  const [row] = await db
    .select({ detail: s.event.detail })
    .from(s.event)
    .where(and(eq(s.event.organizationId, pass.organizationId), eq(s.event.jobId, pass.jobId), eq(s.event.kind, "consent"), sql`${s.event.detail}->>'stage' = 'chosen'`))
    .orderBy(desc(s.event.at), desc(s.event.id))
    .limit(1)
  const d = row?.detail as Partial<PurchaseConsent> | undefined
  if (!d || !Array.isArray(d.marketingChannels)) return undefined
  const marketingChannels = d.marketingChannels.filter((c): c is "email" | "sms" => c === "email" || c === "sms")
  return { marketingOptIn: Boolean(d.marketingOptIn) && marketingChannels.length > 0, marketingChannels }
}
