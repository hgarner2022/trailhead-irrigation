import "server-only"
import { z } from "zod"
import { defineHandler } from "../../core/handler"
import { Id, idInput } from "../shared"
import { Capacity, createPerson, deactivatePerson, listPeople, resolvePersonId, updatePerson, Weekday, type PersonRow } from "../people/handlers"

// Alias of people.*, kept for one season: a truck is a person with a truck label, read and written in the
// person table. Every row answers under the person's id, the same id `VisitOut.personId` carries; a caller
// still holding the old truck id ("truck-1") is understood on the way in.

export const TruckOut = z.object({ id: Id.describe("The person's id, as visits carry it."), name: z.string(), jobberUserId: z.string().nullable(), hasCalendarFeed: z.boolean().describe("Whether the truck reads a Jobber calendar feed for busy time. The URL itself is private and never returned."), workingDays: z.array(Weekday), capacityByKind: Capacity.describe("Visits of each kind that fit in the truck's day."), active: z.boolean() })
const fields = { name: z.string().min(1).max(60), jobberUserId: z.string().max(80).optional(), workingDays: z.array(Weekday).min(1), capacityByKind: Capacity, calendarFeedUrl: z.string().url().max(500).nullable().optional().describe("The truck's Jobber calendar subscription (iCal) URL; null clears it.") }
const out = (p: PersonRow) => ({ id: p.id, name: p.name, jobberUserId: p.jobberUserId, hasCalendarFeed: Boolean(p.calendarFeedUrl), workingDays: p.workingDays, capacityByKind: p.capacityByKind, active: p.active })

/** The person behind a truck id: the person's own id, or the old truck id for one season. */
const personIdOf = resolvePersonId

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
