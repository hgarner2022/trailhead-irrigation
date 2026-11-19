import "server-only"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { readOptionalEnv } from "@/lib/env"
import { TEXTS_PAUSED_ROW } from "./paused-words"

/** The Home row's kind and its one key: the switch is organization wide, so there is one row at a time. */
export const TEXTS_PAUSED_KIND = "texts-paused"
export const TEXTS_PAUSED_KEY = "paused"
export { TEXTS_PAUSED_ROW }
/** The reason a text kept as not sent carries when it was paused and the customer has no email to take its place. */
export const PAUSED_NO_EMAIL = "texts paused, no email"

/**
 * True while `TEXTS_PAUSED` is "on", "1" or "true" (any case). Carriers block every text from the number until the business is
 * registered (Twilio error 30034), so while it is on every text kind goes by email and nothing is handed to Twilio. Read at the
 * moment of use, never at module scope.
 */
export function textsPaused(): boolean {
  const value = readOptionalEnv("TEXTS_PAUSED")?.toLowerCase()
  return value === "on" || value === "1" || value === "true"
}

/**
 * Keeps Home's Needs action row in step with the switch: raised once while it is on (a row the office dismissed stays dismissed),
 * removed when it is off so a later pause raises it again. Returns what it did.
 */
export async function syncTextsPausedAlert(db: Database, now: Date): Promise<"raised" | "cleared" | "none"> {
  const orgs = await db.select({ id: s.organization.id }).from(s.organization)
  const paused = textsPaused()
  let did: "raised" | "cleared" | "none" = "none"
  for (const org of orgs) {
    if (paused) {
      const added = await db
        .insert(s.adminAlert)
        .values({ organizationId: org.id, kind: TEXTS_PAUSED_KIND, key: TEXTS_PAUSED_KEY, message: TEXTS_PAUSED_ROW, createdAt: now, updatedAt: now })
        .onConflictDoNothing()
        .returning({ id: s.adminAlert.id })
      if (added[0]) did = "raised"
    } else {
      const gone = await db.delete(s.adminAlert).where(and(eq(s.adminAlert.organizationId, org.id), eq(s.adminAlert.kind, TEXTS_PAUSED_KIND))).returning({ id: s.adminAlert.id })
      if (gone[0]) did = "cleared"
    }
  }
  return did
}
