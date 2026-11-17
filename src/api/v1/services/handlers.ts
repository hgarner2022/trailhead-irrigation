import "server-only"
import { and, asc, eq } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { ApiError, notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { Id, idInput, VisitKind } from "../shared"

export const ServiceOut = z.object({
  id: Id, key: z.string(), name: z.string(), description: z.string().nullable().describe("What the visit includes, with no price in it."),
  kind: VisitKind, bookable: z.boolean(), taxable: z.boolean(), active: z.boolean().describe("False once deactivated: kept for its old jobs, offered nowhere."),
  minZones: z.number().int().nullable(), maxZones: z.number().int().nullable(), includedZones: z.number().int().nullable(),
  price: z.number().int().nullable().describe("Whole dollars; null when the service is quoted."),
  extraZonePrice: z.number().int().nullable(), slotMinutes: z.number().int(), quoteOnly: z.boolean(),
})
// No `.default()` here: zod 4 keeps a default through `.partial()`, so a default on a shared field would reset it on every PATCH that left it out. The create input adds the defaults.
const fields = {
  key: z.string().regex(/^[a-z0-9-]+$/).min(2).max(40), name: z.string().min(1).max(120), kind: VisitKind,
  description: z.string().trim().min(1).max(1000).nullable().optional().refine((v) => v == null || !v.includes("$"), "Prices live on the service, not in its description"),
  bookable: z.boolean(), taxable: z.boolean(), active: z.boolean(),
  minZones: z.number().int().min(1).max(16).optional(), maxZones: z.number().int().min(1).max(16).optional(), includedZones: z.number().int().min(1).max(16).optional(),
  price: z.number().int().min(0).max(100_000).optional(), extraZonePrice: z.number().int().min(0).max(1000).optional(),
  slotMinutes: z.number().int().min(15).max(480).multipleOf(15), quoteOnly: z.boolean(),
}
const createInput = z.object({ ...fields, bookable: fields.bookable.default(true), taxable: fields.taxable.default(false), active: fields.active.default(true), quoteOnly: fields.quoteOnly.default(false) })
const out = (r: typeof s.service.$inferSelect) => ({
  id: r.id, key: r.key, name: r.name, description: r.description, kind: r.kind, bookable: r.bookable, taxable: r.taxable, active: r.active,
  minZones: r.minZones, maxZones: r.maxZones, includedZones: r.includedZones, price: r.price, extraZonePrice: r.extraZonePrice, slotMinutes: r.slotMinutes, quoteOnly: r.quoteOnly,
})
type Ctx = { db: import("@/db/types").Database; organizationId: string }

async function load(ctx: Ctx, id: string) {
  const [row] = await ctx.db.select().from(s.service).where(and(eq(s.service.id, id), eq(s.service.organizationId, ctx.organizationId)))
  if (!row) throw notFound("Service")
  return row
}

export const servicesList = defineHandler({
  name: "services.list", method: "GET", path: "/services", scope: "read", summary: "List the services: what each includes, prices, zone bands and slot lengths.",
  input: z.object({
    bookable: z.enum(["true", "false"]).optional(),
    active: z.enum(["true", "false"]).optional().describe("Left out, every service is listed, deactivated ones included; true lists only the active ones."),
  }),
  output: z.object({ data: z.array(ServiceOut) }),
  async run(ctx, input) {
    const rows = await ctx.db
      .select()
      .from(s.service)
      .where(
        and(
          eq(s.service.organizationId, ctx.organizationId),
          input.bookable ? eq(s.service.bookable, input.bookable === "true") : undefined,
          input.active ? eq(s.service.active, input.active === "true") : undefined,
        ),
      )
      .orderBy(asc(s.service.key))
    return { data: rows.map(out) }
  },
})

export const servicesCreate = defineHandler({
  name: "services.create", method: "POST", path: "/services", scope: "admin", status: 201, summary: "Add a service.",
  input: createInput, output: ServiceOut,
  async run(ctx, input) {
    const [taken] = await ctx.db.select({ id: s.service.id }).from(s.service).where(and(eq(s.service.organizationId, ctx.organizationId), eq(s.service.key, input.key)))
    if (taken) throw new ApiError("conflict", `A service with the key ${input.key} already exists`)
    const [row] = await ctx.db.insert(s.service).values({ organizationId: ctx.organizationId, ...input }).returning()
    return out(row!)
  },
})

export const servicesUpdate = defineHandler({
  name: "services.update", method: "PATCH", path: "/services/{id}", scope: "admin", summary: "Change a service's name, what it includes, price, zone band, slot length, taxable or active. The key does not change; fields left out keep their values.",
  input: z.object(fields).omit({ key: true }).partial().extend({ id: idInput.shape.id }), output: ServiceOut,
  async run(ctx, { id, ...changes }) {
    await load(ctx, id)
    // Only a field left out is dropped; null reaches the UPDATE and clears the description.
    const defined: Record<string, unknown> = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined))
    // Deactivating also closes online booking, as services.deactivate does; reactivating leaves bookable as it is.
    if (defined.active === false) defined.bookable = false
    if (Object.keys(defined).length) await ctx.db.update(s.service).set(defined).where(eq(s.service.id, id))
    return out(await load(ctx, id))
  },
})

export const servicesDeactivate = defineHandler({
  name: "services.deactivate", method: "DELETE", path: "/services/{id}", scope: "admin", summary: "Stop offering a service: inactive and not bookable. Existing visits keep it.",
  input: idInput, output: ServiceOut,
  async run(ctx, input) {
    await load(ctx, input.id)
    await ctx.db.update(s.service).set({ active: false, bookable: false }).where(eq(s.service.id, input.id))
    return out(await load(ctx, input.id))
  },
})
