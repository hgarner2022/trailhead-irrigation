import "server-only"
import { desc, eq, and } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { ApiError } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { afterTimeCursor, cursorPage, page, pageInput, timeCursor } from "../../core/pagination"
import { byPrincipal, Day, Id, Iso, Town } from "../shared"

const Window = z.object({ kind: z.enum(["turn-on", "inspection", "blowout"]), opensOn: Day, closesOn: Day, leadWeeks: z.number().int().min(0).max(12) })
const Template = z.object({ key: z.string().min(1).max(60), channel: z.enum(["email", "sms"]), subject: z.string().max(200).optional(), body: z.string().min(1).max(2000), enabled: z.boolean() })
const percent = z.number().int().min(0).max(100)

/** What each section accepts; `settings.update` validates `value` against the section's schema. */
export const SECTIONS = {
  windows: z.array(Window).min(1).max(3),
  bufferPercentEarly: percent,
  bufferPercentLate: percent,
  fallTownOrder: z.array(Town).min(1).max(6),
  springTownOrder: z.array(Town).min(1).max(6),
  messages: z.array(Template).max(40),
} as const
export type Section = keyof typeof SECTIONS

export const SettingsOut = z.object({
  windows: z.array(Window),
  bufferPercentEarly: percent.describe("Percent of a truck-day held back for repairs and weather in a season's first two weeks."),
  bufferPercentLate: percent,
  fallTownOrder: z.array(Town),
  springTownOrder: z.array(Town),
  messages: z.array(Template),
  termsVersion: z.string(),
})

async function load(ctx: { db: import("@/db/types").Database; organizationId: string }) {
  const [org] = await ctx.db.select().from(s.organization).where(eq(s.organization.id, ctx.organizationId))
  if (!org) throw new ApiError("not_found", "Organization not found")
  return org
}
const settingsOut = (org: typeof s.organization.$inferSelect) => ({ ...org.settings, termsVersion: org.termsVersion })

/** A value as words for the change log. */
function describe(section: Section, value: unknown): string {
  const text = (() => {
    switch (section) {
      case "windows":
        return (value as z.infer<typeof Window>[]).map((w) => `${w.kind} ${w.opensOn} to ${w.closesOn}, ${w.leadWeeks} weeks ahead`).join("; ")
      case "bufferPercentEarly":
      case "bufferPercentLate":
        return `${value} percent`
      case "fallTownOrder":
      case "springTownOrder":
        return (value as string[]).join(", ")
      case "messages":
        return (value as z.infer<typeof Template>[]).map((t) => `${t.key} ${t.enabled ? "on" : "off"}`).join(", ")
    }
  })()
  return text.length > 400 ? `${text.slice(0, 397)}...` : text
}

export const settingsGet = defineHandler({
  name: "settings.get", method: "GET", path: "/settings", scope: "read",
  summary: "The scheduling windows, buffers, town orders and message templates. Trucks and areas have their own resources.",
  input: z.object({}), output: SettingsOut,
  async run(ctx) {
    return settingsOut(await load(ctx))
  },
})

export const settingsUpdate = defineHandler({
  name: "settings.update", method: "PATCH", path: "/settings", scope: "admin",
  summary: "Change one section of the settings. The change is written to the change log with who made it.",
  input: z.object({ section: z.enum(Object.keys(SECTIONS) as [Section, ...Section[]]), value: z.unknown().describe("The new value; its shape depends on the section (see settings.get).") }),
  output: SettingsOut,
  async run(ctx, input) {
    const parsed = SECTIONS[input.section].safeParse(input.value)
    if (!parsed.success)
      throw new ApiError("invalid", `The value does not fit ${input.section}`, parsed.error.issues.map((i) => ({ path: ["value", ...i.path].join("."), message: i.message })))
    const org = await load(ctx)
    const before = org.settings[input.section]
    if (JSON.stringify(before) === JSON.stringify(parsed.data)) return settingsOut(org)
    const settings = { ...org.settings, [input.section]: parsed.data }
    await ctx.db.update(s.organization).set({ settings }).where(eq(s.organization.id, org.id))
    await ctx.db.insert(s.settingsChange).values({
      organizationId: org.id,
      byEmail: byPrincipal(ctx),
      field: input.section,
      fromValue: describe(input.section, before),
      toValue: describe(input.section, parsed.data),
      at: ctx.now,
    })
    return settingsOut({ ...org, settings })
  },
})

const ChangeOut = z.object({ id: Id, at: Iso, who: z.string(), field: z.string(), from: z.string(), to: z.string() })

export const settingsChangesList = defineHandler({
  name: "settings.changes.list", method: "GET", path: "/settings/changes", scope: "read",
  summary: "The settings change log, newest first: who changed which field, from what to what.",
  input: z.object(pageInput), output: page(ChangeOut),
  async run(ctx, input) {
    const rows = await ctx.db
      .select()
      .from(s.settingsChange)
      .where(and(eq(s.settingsChange.organizationId, ctx.organizationId), afterTimeCursor(s.settingsChange.createdAt, s.settingsChange.id, input.cursor)))
      .orderBy(desc(s.settingsChange.createdAt), desc(s.settingsChange.id))
      .limit(input.limit + 1)
    const result = cursorPage(rows, input.limit, timeCursor)
    return { data: result.data.map((r) => ({ id: r.id, at: r.at.toISOString(), who: r.byEmail, field: r.field, from: r.fromValue, to: r.toValue })), next_cursor: result.next_cursor }
  },
})
