import "server-only"
import { and, asc, eq } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { Id, idInput } from "../shared"

const Weekday = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])
const Capacity = z.object({ "turn-on": z.number().int().min(0).max(40), inspection: z.number().int().min(0).max(40), blowout: z.number().int().min(0).max(40), repair: z.number().int().min(0).max(40), other: z.number().int().min(0).max(40) })
export const TruckOut = z.object({ id: Id, name: z.string(), jobberUserId: z.string().nullable(), workingDays: z.array(Weekday), capacityByKind: Capacity.describe("Visits of each kind that fit in the truck's day."), active: z.boolean() })
const fields = { name: z.string().min(1).max(60), jobberUserId: z.string().max(80).optional(), workingDays: z.array(Weekday).min(1), capacityByKind: Capacity }
const out = (r: typeof s.truck.$inferSelect) => ({ id: r.id, name: r.name, jobberUserId: r.jobberUserId, workingDays: r.workingDays, capacityByKind: r.capacityByKind, active: r.active })

async function load(ctx: { db: import("@/db/types").Database; organizationId: string }, id: string) {
  const [row] = await ctx.db.select().from(s.truck).where(and(eq(s.truck.id, id), eq(s.truck.organizationId, ctx.organizationId)))
  if (!row) throw notFound("Truck")
  return row
}

export const trucksList = defineHandler({
  name: "trucks.list", method: "GET", path: "/trucks", scope: "read", summary: "List trucks: working days and capacity by visit kind.",
  input: z.object({}), output: z.object({ data: z.array(TruckOut) }),
  async run(ctx) {
    return { data: (await ctx.db.select().from(s.truck).where(eq(s.truck.organizationId, ctx.organizationId)).orderBy(asc(s.truck.name))).map(out) }
  },
})

export const trucksCreate = defineHandler({
  name: "trucks.create", method: "POST", path: "/trucks", scope: "admin", status: 201, summary: "Add a truck.",
  input: z.object(fields), output: TruckOut,
  async run(ctx, input) {
    const [row] = await ctx.db.insert(s.truck).values({ organizationId: ctx.organizationId, ...input }).returning()
    return out(row!)
  },
})

export const trucksUpdate = defineHandler({
  name: "trucks.update", method: "PATCH", path: "/trucks/{id}", scope: "admin", summary: "Change a truck's name, Jobber user, working days or capacity.",
  input: z.object(fields).partial().extend({ id: idInput.shape.id }), output: TruckOut,
  async run(ctx, { id, ...changes }) {
    await load(ctx, id)
    const defined = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined))
    if (Object.keys(defined).length) await ctx.db.update(s.truck).set(defined).where(eq(s.truck.id, id))
    return out(await load(ctx, id))
  },
})

export const trucksDeactivate = defineHandler({
  name: "trucks.deactivate", method: "DELETE", path: "/trucks/{id}", scope: "admin", summary: "Take a truck out of service. Its history stays; the scheduler stops using it.",
  input: idInput, output: TruckOut,
  async run(ctx, input) {
    await load(ctx, input.id)
    await ctx.db.update(s.truck).set({ active: false }).where(eq(s.truck.id, input.id))
    return out(await load(ctx, input.id))
  },
})
