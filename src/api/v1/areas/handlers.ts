import "server-only"
import { and, asc, eq, ne } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { ApiError, notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { Id, idInput, okOutput, OK, Town } from "../shared"

export const AreaOut = z.object({ id: Id, name: z.string(), towns: z.array(Town), springOrder: z.number().int(), fallOrder: z.number().int() })
const fields = { name: z.string().min(1).max(80), towns: z.array(Town).min(1).max(6), springOrder: z.number().int().min(0).max(20).default(0), fallOrder: z.number().int().min(0).max(20).default(0) }
const out = (r: typeof s.area.$inferSelect) => ({ id: r.id, name: r.name, towns: r.towns, springOrder: r.springOrder, fallOrder: r.fallOrder })
type Ctx = { db: import("@/db/types").Database; organizationId: string }

async function load(ctx: Ctx, id: string) {
  const [row] = await ctx.db.select().from(s.area).where(and(eq(s.area.id, id), eq(s.area.organizationId, ctx.organizationId)))
  if (!row) throw notFound("Area")
  return row
}

/** A town belongs to one area group: two groups claiming it would put two trucks in one town. */
async function assertTownsFree(ctx: Ctx, towns: readonly string[], exceptId?: string) {
  const others = await ctx.db.select().from(s.area).where(and(eq(s.area.organizationId, ctx.organizationId), exceptId ? ne(s.area.id, exceptId) : undefined))
  const taken = towns.find((t) => others.some((a) => a.towns.includes(t as never)))
  if (taken) throw new ApiError("conflict", `${taken} already belongs to another area group`)
}

export const areasList = defineHandler({
  name: "areas.list", method: "GET", path: "/areas", scope: "read", summary: "List the area groups: the towns a truck works on one day.",
  input: z.object({}), output: z.object({ data: z.array(AreaOut) }),
  async run(ctx) {
    return { data: (await ctx.db.select().from(s.area).where(eq(s.area.organizationId, ctx.organizationId)).orderBy(asc(s.area.name))).map(out) }
  },
})

export const areasCreate = defineHandler({
  name: "areas.create", method: "POST", path: "/areas", scope: "admin", status: 201, summary: "Add an area group.",
  input: z.object(fields), output: AreaOut,
  async run(ctx, input) {
    await assertTownsFree(ctx, input.towns)
    const [row] = await ctx.db.insert(s.area).values({ organizationId: ctx.organizationId, ...input }).returning()
    return out(row!)
  },
})

export const areasUpdate = defineHandler({
  name: "areas.update", method: "PATCH", path: "/areas/{id}", scope: "admin", summary: "Change an area group's name, towns or season order.",
  input: z.object(fields).partial().extend({ id: idInput.shape.id }), output: AreaOut,
  async run(ctx, { id, ...changes }) {
    await load(ctx, id)
    if (changes.towns) await assertTownsFree(ctx, changes.towns, id)
    const defined = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined))
    if (Object.keys(defined).length) await ctx.db.update(s.area).set(defined).where(eq(s.area.id, id))
    return out(await load(ctx, id))
  },
})

export const areasDelete = defineHandler({
  name: "areas.delete", method: "DELETE", path: "/areas/{id}", scope: "admin", summary: "Remove an area group. Areas hold no history, so this deletes the row.",
  input: idInput, output: okOutput,
  async run(ctx, input) {
    await load(ctx, input.id)
    await ctx.db.delete(s.area).where(eq(s.area.id, input.id))
    return OK
  },
})
