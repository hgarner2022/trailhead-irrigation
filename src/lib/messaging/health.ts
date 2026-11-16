import "server-only"
import { eq, sql } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"

export type TwilioHealth = s.TwilioHealthRow["state"]

/** What the last text attempt said about Twilio, or null before any text was tried. Kept in `organization.settings.integrations.twilio`: no table of its own. */
export async function readTwilioHealth(db: Database, organizationId: string): Promise<s.TwilioHealthRow | null> {
  const [org] = await db.select({ settings: s.organization.settings }).from(s.organization).where(eq(s.organization.id, organizationId))
  return org?.settings.integrations?.twilio ?? null
}

/** Stores the state from a text attempt. Writes only when the state changes, so a healthy day is not a write per text. */
export async function recordTwilioHealth(db: Database, organizationId: string, state: TwilioHealth, now: Date): Promise<void> {
  if ((await readTwilioHealth(db, organizationId))?.state === state) return
  const value = JSON.stringify({ state, at: now.toISOString() } satisfies s.TwilioHealthRow)
  await db
    .update(s.organization)
    .set({ settings: sql`${s.organization.settings} || jsonb_build_object('integrations', coalesce(${s.organization.settings}->'integrations', '{}'::jsonb) || jsonb_build_object('twilio', ${value}::jsonb))` })
    .where(eq(s.organization.id, organizationId))
}
