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
  confirmed: z.boolean().describe("False while these are the plan's defaults: nobody has saved the settings once."),
})

async function load(ctx: { db: import("@/db/types").Database; organizationId: string }) {
  const [org] = await ctx.db.select().from(s.organization).where(eq(s.organization.id, ctx.organizationId))
  if (!org) throw new ApiError("not_found", "Organization not found")
  return org
}
/** Saved once: the change log has a row for this organization. */
async function isConfirmed(ctx: { db: import("@/db/types").Database; organizationId: string }) {
  const [saved] = await ctx.db.select({ id: s.settingsChange.id }).from(s.settingsChange).where(eq(s.settingsChange.organizationId, ctx.organizationId)).limit(1)
  return Boolean(saved)
}
const settingsOut = (org: typeof s.organization.$inferSelect, confirmed: boolean) => ({ ...org.settings, termsVersion: org.termsVersion, confirmed })

interface Leaf { field: string; from: string; to: string }
const clip = (text: string) => (text.length > 400 ? `${text.slice(0, 397)}...` : text)
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** The changed leaves of one section, each as words for the change log: one row per leaf, never one per section. */
export function changedLeaves(section: Section, before: unknown, after: unknown): Leaf[] {
  if (same(before, after)) return []
  if (section === "windows") {
    const was = new Map((before as z.infer<typeof Window>[]).map((w) => [w.kind, w]))
    const now = new Map((after as z.infer<typeof Window>[]).map((w) => [w.kind, w]))
    const leaves: Leaf[] = []
    for (const kind of new Set([...was.keys(), ...now.keys()])) {
      const a = was.get(kind)
      const b = now.get(kind)
      if (!a || !b) { leaves.push({ field: `windows.${kind}`, from: a ? "on" : "off", to: b ? "on" : "off" }); continue }
      if (a.opensOn !== b.opensOn) leaves.push({ field: `windows.${kind}.opensOn`, from: a.opensOn, to: b.opensOn })
      if (a.closesOn !== b.closesOn) leaves.push({ field: `windows.${kind}.closesOn`, from: a.closesOn, to: b.closesOn })
      if (a.leadWeeks !== b.leadWeeks) leaves.push({ field: `windows.${kind}.leadWeeks`, from: `${a.leadWeeks} weeks ahead`, to: `${b.leadWeeks} weeks ahead` })
    }
    return leaves
  }
  if (section === "messages") {
    const was = new Map((before as z.infer<typeof Template>[]).map((m) => [m.key, m]))
    const now = new Map((after as z.infer<typeof Template>[]).map((m) => [m.key, m]))
    const leaves: Leaf[] = []
    for (const key of new Set([...was.keys(), ...now.keys()])) {
      const a = was.get(key)
      const b = now.get(key)
      if (!a || !b) { leaves.push({ field: `messages.${key}`, from: a ? "on file" : "none", to: b ? "on file" : "none" }); continue }
      for (const prop of ["channel", "subject", "body", "enabled"] as const)
        if (a[prop] !== b[prop]) leaves.push({ field: `messages.${key}.${prop}`, from: clip(prop === "enabled" ? (a[prop] ? "on" : "off") : String(a[prop] ?? "")), to: clip(prop === "enabled" ? (b[prop] ? "on" : "off") : String(b[prop] ?? "")) })
    }
    return leaves
  }
  const words = (value: unknown) => (Array.isArray(value) ? (value as string[]).join(", ") : `${value} percent`)
  return [{ field: section, from: clip(words(before)), to: clip(words(after)) }]
}

export const settingsGet = defineHandler({
  name: "settings.get", method: "GET", path: "/settings", scope: "read",
  summary: "The scheduling windows, buffers, town orders and message templates. Trucks and areas have their own resources.",
  input: z.object({}), output: SettingsOut,
  async run(ctx) {
    return settingsOut(await load(ctx), await isConfirmed(ctx))
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
    const leaves = changedLeaves(input.section, before, parsed.data)
    if (leaves.length === 0) return settingsOut(org, await isConfirmed(ctx))
    const settings = { ...org.settings, [input.section]: parsed.data }
    await ctx.db.update(s.organization).set({ settings }).where(eq(s.organization.id, org.id))
    await ctx.db.insert(s.settingsChange).values(leaves.map((l) => ({ organizationId: org.id, byEmail: byPrincipal(ctx), field: l.field, fromValue: l.from, toValue: l.to, at: ctx.now })))
    return settingsOut({ ...org, settings }, true)
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
