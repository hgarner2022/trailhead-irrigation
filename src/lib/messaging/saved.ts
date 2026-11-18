import "server-only"
import { and, eq, inArray } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { overridesOf, type Overrides } from "@/emails/editable"

/** What the office saved in Settings › Messages, read in today's placeholders and kept only where it passes the rules. Empty until something is saved, so the shipped words apply. */
export async function savedTemplates(db: Database, organizationId: string): Promise<Overrides> {
  const [org] = await db.select({ settings: s.organization.settings }).from(s.organization).where(eq(s.organization.id, organizationId))
  return overridesOf(org?.settings.messages)
}

/**
 * Whether this is the first text this number gets: no earlier text to it that was queued, sent or delivered. A text that was
 * skipped or failed never reached the phone, so it does not count. The first text carries "Reply STOP to opt out." and
 * later ones do not (CTIA asks for the opt-out on the first message; Hannah chose first only, Nov 18 2026).
 */
export async function isFirstText(db: Database, organizationId: string, phone: string): Promise<boolean> {
  const [earlier] = await db
    .select({ id: s.messageLog.id })
    .from(s.messageLog)
    .where(and(eq(s.messageLog.organizationId, organizationId), eq(s.messageLog.channel, "sms"), eq(s.messageLog.to, phone), inArray(s.messageLog.status, ["queued", "sent", "delivered"])))
    .limit(1)
  return !earlier
}
