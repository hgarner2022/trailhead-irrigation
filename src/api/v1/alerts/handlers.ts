import "server-only"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { defineHandler } from "../../core/handler"
import { OK, okOutput } from "../shared"

export const alertsDismiss = defineHandler({
  name: "alerts.dismiss",
  method: "POST",
  path: "/alerts/dismiss",
  scope: "write",
  summary: "Take a row off Home's Needs action. Stored alerts are resolved; a row Home works out itself (a failed charge, a visit not closed) is recorded as dismissed by its kind and key, so it stays gone until its key changes. Safe to call twice. `undo: true` brings the row back (a stored alert is reopened, a dismissal record is removed).",
  input: z.object({ kind: z.string().min(1).max(60), key: z.string().min(1).max(200), undo: z.boolean().optional().describe("Bring the row back: the Undo of a dismissal.") }),
  output: okOutput,
  async run(ctx, input) {
    if (input.undo) {
      const where = and(eq(s.adminAlert.organizationId, ctx.organizationId), eq(s.adminAlert.kind, input.kind), eq(s.adminAlert.key, input.key))
      await ctx.db.delete(s.adminAlert).where(and(where, eq(s.adminAlert.message, "Dismissed")))
      await ctx.db.update(s.adminAlert).set({ resolvedAt: null }).where(where)
      return OK
    }
    await ctx.db
      .insert(s.adminAlert)
      .values({ organizationId: ctx.organizationId, kind: input.kind, key: input.key, message: "Dismissed", resolvedAt: ctx.now })
      .onConflictDoUpdate({ target: [s.adminAlert.organizationId, s.adminAlert.kind, s.adminAlert.key], set: { resolvedAt: ctx.now } })
    return OK
  },
})
