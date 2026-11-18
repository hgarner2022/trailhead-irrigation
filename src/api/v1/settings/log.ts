import "server-only"
import * as s from "@/db/schema"
import type { Ctx } from "../../core/context"
import { byPrincipal } from "../shared"

/** One changed field in words, for the change log: what it is, what it was and what it is now. */
export interface Leaf {
  field: string
  from: string
  to: string
}

/** The one writer of the settings change log: a row per leaf, by the caller's email, stamped with the call's own time. settings.update and people.* both write through it. */
export async function logSettingsChanges(ctx: Pick<Ctx, "db" | "organizationId" | "principal" | "now">, leaves: Leaf[]): Promise<void> {
  if (leaves.length === 0) return
  await ctx.db.insert(s.settingsChange).values(leaves.map((l) => ({ organizationId: ctx.organizationId, byEmail: byPrincipal(ctx as Ctx), field: l.field, fromValue: l.from, toValue: l.to, at: ctx.now })))
}
