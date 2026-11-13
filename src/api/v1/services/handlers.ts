import "server-only"
import { and, asc, eq } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { ApiError, notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { Id, idInput, VisitKind } from "../shared"

export const ServiceOut = z.object({
  id: Id, key: z.string(), name: z.string(), kind: VisitKind, bookable: z.boolean(),
  minZones: z.number().int().nullable(), maxZones: z.number().int().nullable(), includedZones: z.number().int().nullable(),
  price: z.number().int().nullable().describe("Whole dollars; null when the service is quoted."),
  extraZonePrice: z.number().int().nullable(), slotMinutes: z.number().int(), quoteOnly: z.boolean(),
})
const fields = {
  key: z.string().regex(/^[a-z0-9-]+$/).min(2).max(40), name: z.string().min(1).max(120), kind: VisitKind, bookable: z.boolean().default(true),
  minZones: z.number().int().min(1).max(16).optional(), maxZones: z.number().int().min(1).max(16).optional(), includedZones: z.number().int().min(1).max(16).optional(),
  price: z.number().int().min(0).max(100_000).optional(), extraZonePrice: z.number().int().min(0).max(1000).optional(),
  slotMinutes: z.number().int().min(15).max(480).multipleOf(15), quoteOnly: z.boolean().default(false),
}
const out = (r: typeof s.service.$inferSelect) => ({ id: r.id, key: r.key, name: r.name, kind: r.kind, bookable: r.bookable, minZones: r.minZones, maxZones: r.maxZones, includedZones: r.includedZones, price: r.price, extraZonePrice: r.extraZonePrice, slotMinutes: r.slotMinutes, quoteOnly: r.quoteOnly })
type Ctx = { db: import("@/db/types").Database; organizationId: string }

async function load(ctx: Ctx, id: string) {
  const [row] = await ctx.db.select().from(s.service).where(and(eq(s.service.id, id), eq(s.service.organizationId, ctx.organizationId)))
  if (!row) throw notFound("Service")
  return row
}

export const servicesList = defineHandler({
  name: "services.list", method: "GET", path: "/services", scope: "read", summary: "List the services: prices, zone bands and slot lengths.",
  input: z.object({ bookable: z.enum(["true", "false"]).optional() }), output: z.object({ data: z.array(ServiceOut) }),
  async run(ctx, input) {
    const rows = await ctx.db.select().from(s.service).where(and(eq(s.service.organizationId, ctx.organizationId), input.bookable ? eq(s.service.bookable, input.bookable === "true") : undefined)).orderBy(asc(s.service.key))
    return { data: rows.map(out) }
  },
})

export const servicesCreate = defineHandler({
  name: "services.create", method: "POST", path: "/services", scope: "admin", status: 201, summary: "Add a service.",
  input: z.object(fields), output: ServiceOut,
  async run(ctx, input) {
    const [taken] = await ctx.db.select({ id: s.service.id }).from(s.service).where(and(eq(s.service.organizationId, ctx.organizationId), eq(s.service.key, input.key)))
    if (taken) throw new ApiError("conflict", `A service with the key ${input.key} already exists`)
    const [row] = await ctx.db.insert(s.service).values({ organizationId: ctx.organizationId, ...input }).returning()
    return out(row!)
  },
})

export const servicesUpdate = defineHandler({
  name: "services.update", method: "PATCH", path: "/services/{id}", scope: "admin", summary: "Change a service's name, price, zone band or slot length. The key does not change.",
  input: z.object(fields).omit({ key: true }).partial().extend({ id: idInput.shape.id }), output: ServiceOut,
  async run(ctx, { id, ...changes }) {
    await load(ctx, id)
    const defined = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined))
    if (Object.keys(defined).length) await ctx.db.update(s.service).set(defined).where(eq(s.service.id, id))
    return out(await load(ctx, id))
  },
})

export const servicesDeactivate = defineHandler({
  name: "services.deactivate", method: "DELETE", path: "/services/{id}", scope: "admin", summary: "Stop offering a service for booking. Existing visits keep it.",
  input: idInput, output: ServiceOut,
  async run(ctx, input) {
    await load(ctx, input.id)
    await ctx.db.update(s.service).set({ bookable: false }).where(eq(s.service.id, input.id))
    return out(await load(ctx, input.id))
  },
})
