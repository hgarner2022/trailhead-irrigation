import "server-only"
import { and, eq, or } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { Id, idInput } from "../shared"
import { Capacity, createPerson, deactivatePerson, listPeople, updatePerson, Weekday, type PersonRow } from "../people/handlers"

// Alias of people.*, kept for one season: a truck is a person with a truck label, read and written in the
// person table. A row keeps the truck id visits still carry (`legacyTruckId`) where it has one, so a caller
// holding "truck-1" keeps working; a person made here answers under their own id.

export const TruckOut = z.object({ id: Id, name: z.string(), jobberUserId: z.string().nullable(), hasCalendarFeed: z.boolean().describe("Whether the truck reads a Jobber calendar feed for busy time. The URL itself is private and never returned."), workingDays: z.array(Weekday), capacityByKind: Capacity.describe("Visits of each kind that fit in the truck's day."), active: z.boolean() })
const fields = { name: z.string().min(1).max(60), jobberUserId: z.string().max(80).optional(), workingDays: z.array(Weekday).min(1), capacityByKind: Capacity, calendarFeedUrl: z.string().url().max(500).nullable().optional().describe("The truck's Jobber calendar subscription (iCal) URL; null clears it.") }
const out = (p: PersonRow) => ({ id: p.legacyTruckId ?? p.id, name: p.name, jobberUserId: p.jobberUserId, hasCalendarFeed: Boolean(p.calendarFeedUrl), workingDays: p.workingDays, capacityByKind: p.capacityByKind, active: p.active })
type Ctx = { db: import("@/db/types").Database; organizationId: string }

/** The person behind a truck id: the old truck id or the person's own. */
async function personIdOf(ctx: Ctx, id: string) {
  const [row] = await ctx.db.select({ id: s.person.id }).from(s.person).where(and(eq(s.person.organizationId, ctx.organizationId), or(eq(s.person.legacyTruckId, id), eq(s.person.id, id))))
  if (!row) throw notFound("Truck")
  return row.id
}

export const trucksList = defineHandler({
  name: "trucks.list", method: "GET", path: "/trucks", scope: "read", summary: "Alias of people.list, kept for one season: the people with a truck, by name, with working days and capacity by visit kind.",
  input: z.object({}), output: z.object({ data: z.array(TruckOut) }),
  async run(ctx) {
    return { data: (await listPeople(ctx)).filter((p) => p.truck !== null).sort((a, b) => a.name.localeCompare(b.name)).map(out) }
  },
})

export const trucksCreate = defineHandler({
  name: "trucks.create", method: "POST", path: "/trucks", scope: "admin", status: 201, summary: "Alias of people.create, kept for one season: adds a tech with the truck named after them.",
  input: z.object(fields), output: TruckOut,
  async run(ctx, input) {
    return out(await createPerson(ctx, { ...input, truck: input.name, role: "tech" }))
  },
})

export const trucksUpdate = defineHandler({
  name: "trucks.update", method: "PATCH", path: "/trucks/{id}", scope: "admin", summary: "Alias of people.update, kept for one season: changes the person's name, Jobber user, working days or capacity.",
  input: z.object(fields).partial().extend({ id: idInput.shape.id }), output: TruckOut,
  async run(ctx, { id, ...changes }) {
    return out(await updatePerson(ctx, await personIdOf(ctx, id), changes))
  },
})

export const trucksDeactivate = defineHandler({
  name: "trucks.deactivate", method: "DELETE", path: "/trucks/{id}", scope: "admin", summary: "Alias of people.deactivate, kept for one season: takes the person out of service. Their history stays; the scheduler stops using them.",
  input: idInput, output: TruckOut,
  async run(ctx, input) {
    return out(await deactivatePerson(ctx, await personIdOf(ctx, input.id)))
  },
})
