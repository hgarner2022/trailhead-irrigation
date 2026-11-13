import "server-only"
import { count, desc, eq } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { Id, Iso } from "../shared"

export const organizationGet = defineHandler({
  name: "organization.get", method: "GET", path: "/organization", scope: "read",
  summary: "The organization: its name, terms version, a settings summary and whether the Jobber mirror is connected and when it last synced.",
  input: z.object({}),
  output: z.object({
    id: Id, name: z.string(), termsVersion: z.string(),
    settings: z.object({ trucks: z.number().int(), areas: z.number().int(), windows: z.array(z.object({ kind: z.string(), opensOn: z.string(), closesOn: z.string() })), bufferPercentEarly: z.number(), bufferPercentLate: z.number() }),
    jobber: z.object({ connected: z.boolean().describe("A Jobber token is stored for the read-only mirror."), lastSyncAt: Iso.nullable(), lastSyncStatus: z.enum(["running", "ok", "failed"]).nullable() }),
  }),
  async run(ctx) {
    const [org] = await ctx.db.select().from(s.organization).where(eq(s.organization.id, ctx.organizationId))
    if (!org) throw notFound("Organization")
    const [trucks] = await ctx.db.select({ n: count() }).from(s.truck).where(eq(s.truck.organizationId, org.id))
    const [areas] = await ctx.db.select({ n: count() }).from(s.area).where(eq(s.area.organizationId, org.id))
    const [token] = await ctx.db.select({ id: s.jobberToken.id }).from(s.jobberToken).where(eq(s.jobberToken.organizationId, org.id)).limit(1)
    const [sync] = await ctx.db.select().from(s.syncRun).where(eq(s.syncRun.organizationId, org.id)).orderBy(desc(s.syncRun.startedAt)).limit(1)
    return {
      id: org.id,
      name: org.name,
      termsVersion: org.termsVersion,
      settings: {
        trucks: trucks?.n ?? 0,
        areas: areas?.n ?? 0,
        windows: org.settings.windows.map((w) => ({ kind: w.kind, opensOn: w.opensOn, closesOn: w.closesOn })),
        bufferPercentEarly: org.settings.bufferPercentEarly,
        bufferPercentLate: org.settings.bufferPercentLate,
      },
      jobber: { connected: Boolean(token), lastSyncAt: sync?.finishedAt?.toISOString() ?? sync?.startedAt.toISOString() ?? null, lastSyncStatus: sync?.status ?? null },
    }
  },
})
