import "server-only"
import { and, asc, eq, ne, or, sql } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { initialsOf } from "@/lib/admin/people"
import { cleanEmail } from "@/lib/format/contact"
import { ApiError, notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { Day, Id, idInput } from "../shared"
import { logSettingsChanges } from "../settings/log"
import { personLeaves } from "./log"

// A person who works here: the owner, a manager or a tech. The truck is a label on them, and an email
// lets them sign in. trucks.* (../trucks/handlers.ts) reads and writes these same rows through the
// functions exported here, as an alias kept for one season.

export const Weekday = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])
export const Capacity = z.object({ "turn-on": z.number().int().min(0).max(40), inspection: z.number().int().min(0).max(40), blowout: z.number().int().min(0).max(40), repair: z.number().int().min(0).max(40), other: z.number().int().min(0).max(40) })
export const Role = z.enum(s.personRoleEnum.enumValues)
const WEEKDAYS_DEFAULT: z.infer<typeof Weekday>[] = ["mon", "tue", "wed", "thu", "fri"]
const CAPACITY_DEFAULT: z.infer<typeof Capacity> = { "turn-on": 8, inspection: 8, blowout: 10, repair: 4, other: 2 }
const Email = z.string().trim().max(254).refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), "Use an email address").transform(cleanEmail)

export const PersonOut = z.object({
  id: Id, name: z.string(), initials: z.string(), email: z.string().nullable(), phone: z.string().nullable(), role: Role,
  truck: z.string().nullable().describe("The truck they usually drive, as a label: \"Truck 1\"."),
  jobberUserId: z.string().nullable(),
  hasCalendarFeed: z.boolean().describe("Whether the person reads a Jobber calendar feed for busy time. The URL itself is private and never returned."),
  workingDays: z.array(Weekday), capacityByKind: Capacity.describe("Visits of each kind that fit in the person's day."),
  seasonStart: Day.nullable(), seasonEnd: Day.nullable(), active: z.boolean(),
  canSignIn: z.boolean().describe("True when the person has an email and is active."),
})
export type PersonOut = z.infer<typeof PersonOut>

// The fields a person has. `fields` (create) fills the defaults in; `changes` (update) is every field
// optional with none of the defaults, since zod 4's `.partial()` keeps a `.default()` and would reset
// the role, days and capacity on every update. Optional text fields take null on update to clear them.
const Name = z.string().trim().min(1).max(80)
const Initials = z.string().trim().min(1).max(3).describe("Derived from the name when not given.")
const Phone = z.string().trim().min(1).max(40)
const Truck = z.string().trim().min(1).max(40).describe("The truck they usually drive, as a label: \"Truck 1\".")
const JobberUserId = z.string().max(80)
const CalendarFeedUrl = z.string().url().max(500).nullable().describe("The person's Jobber calendar subscription (iCal) URL; null clears it.")
const WorkingDays = z.array(Weekday).min(1)
const fields = {
  name: Name, initials: Initials.optional(),
  email: Email.optional().describe("Lets the person sign in; unique in the organization, ignoring case."),
  phone: Phone.optional(), role: Role.default("tech"), truck: Truck.optional(), jobberUserId: JobberUserId.optional(), calendarFeedUrl: CalendarFeedUrl.optional(),
  workingDays: WorkingDays.default(WEEKDAYS_DEFAULT), capacityByKind: Capacity.default(CAPACITY_DEFAULT),
  seasonStart: Day.optional(), seasonEnd: Day.optional(),
}
const changes = {
  name: Name.optional(), initials: Initials.optional(),
  email: Email.nullable().optional(), phone: Phone.nullable().optional(), role: Role.optional(), truck: Truck.nullable().optional(), jobberUserId: JobberUserId.nullable().optional(), calendarFeedUrl: CalendarFeedUrl.optional(),
  workingDays: WorkingDays.optional(), capacityByKind: Capacity.optional(),
  seasonStart: Day.nullable().optional(), seasonEnd: Day.nullable().optional(),
}

export type PersonRow = typeof s.person.$inferSelect
type Ctx = { db: import("@/db/types").Database; organizationId: string }

export const personOut = (r: PersonRow): PersonOut => ({
  id: r.id, name: r.name, initials: r.initials, email: r.email, phone: r.phone, role: r.role, truck: r.truck, jobberUserId: r.jobberUserId,
  hasCalendarFeed: Boolean(r.calendarFeedUrl), workingDays: r.workingDays, capacityByKind: r.capacityByKind,
  seasonStart: r.seasonStart, seasonEnd: r.seasonEnd, active: r.active, canSignIn: r.email !== null && r.active,
})

export { initialsOf }

/** The words every surface uses for the rule, the screen included (settings-save.ts, settings-people.ts). */
export const LAST_OWNER = "Keep at least one owner."

const inOrg = (ctx: Ctx) => eq(s.person.organizationId, ctx.organizationId)

/** The person with this id in the organization, or not found. */
export async function loadPerson(ctx: Ctx, id: string): Promise<PersonRow> {
  const [row] = await ctx.db.select().from(s.person).where(and(eq(s.person.id, id), inOrg(ctx)))
  if (!row) throw notFound("Person")
  return row
}

/** On the schedule: in service and with a truck to drive. Visits are assigned to these people and to no one else. */
export const isRoutePerson = (p: Pick<PersonRow, "active" | "truck">): boolean => p.active && p.truck !== null

/** The people a visit can be assigned to, owners first then by name; the first is the default assignee for a new visit. */
export async function routePeople(ctx: Ctx): Promise<PersonRow[]> {
  return (await listPeople(ctx, { active: true })).filter(isRoutePerson)
}

/** The person behind an id: their own, or for one season the id of the truck they were made from ("truck-1"). The one lookup every legacy-id site goes through. */
export async function personByAnyId(ctx: Ctx, idOrLegacyId: string): Promise<PersonRow | undefined> {
  // step 6: drop the legacy truck id clause
  const [row] = await ctx.db.select().from(s.person).where(and(inOrg(ctx), or(eq(s.person.id, idOrLegacyId), eq(s.person.legacyTruckId, idOrLegacyId))))
  return row
}

/** `personByAnyId`'s id, or not found. */
export async function resolvePersonId(ctx: Ctx, id: string): Promise<string> {
  const row = await personByAnyId(ctx, id)
  if (!row) throw notFound("Person")
  return row.id
}

/** Owners first, then by name; `active` narrows to the people in or out of service. */
export async function listPeople(ctx: Ctx, filter: { active?: boolean } = {}): Promise<PersonRow[]> {
  return ctx.db
    .select()
    .from(s.person)
    .where(and(inOrg(ctx), filter.active === undefined ? undefined : eq(s.person.active, filter.active)))
    .orderBy(sql`case when ${s.person.role} = 'owner' then 0 else 1 end`, asc(s.person.name))
}

/** Refuses an email another person in the organization already has, in any case. */
async function assertEmailFree(ctx: Ctx, email: string, exceptId?: string) {
  const [taken] = await ctx.db
    .select({ name: s.person.name })
    .from(s.person)
    .where(and(inOrg(ctx), sql`lower(${s.person.email}) = ${email}`, exceptId ? ne(s.person.id, exceptId) : undefined))
  if (taken) throw new ApiError("conflict", `That email already belongs to ${taken.name}`)
}

export async function createPerson(ctx: Ctx, input: z.infer<z.ZodObject<typeof fields>>): Promise<PersonRow> {
  if (input.email) await assertEmailFree(ctx, input.email)
  const [row] = await ctx.db.insert(s.person).values({ organizationId: ctx.organizationId, ...input, initials: input.initials ?? initialsOf(input.name) }).returning()
  return row!
}

/** Refuses when `person` is an active owner and no other active owner exists: they can neither leave nor stop being one. */
async function assertAnotherOwner(ctx: Ctx, person: PersonRow) {
  if (person.role !== "owner" || !person.active) return
  const [other] = await ctx.db.select({ id: s.person.id }).from(s.person).where(and(inOrg(ctx), eq(s.person.role, "owner"), eq(s.person.active, true), ne(s.person.id, person.id)))
  if (!other) throw new ApiError("unprocessable", LAST_OWNER)
}

export async function updatePerson(ctx: Ctx, id: string, input: z.infer<z.ZodObject<typeof changes>>): Promise<PersonRow> {
  const person = await loadPerson(ctx, id)
  if (input.role !== undefined && input.role !== "owner") await assertAnotherOwner(ctx, person)
  if (input.email) await assertEmailFree(ctx, input.email, id)
  const defined = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined))
  if (Object.keys(defined).length) await ctx.db.update(s.person).set(defined).where(eq(s.person.id, id))
  return loadPerson(ctx, id)
}

/** Takes the person out of service; their history stays. The last active owner stays in. */
export async function deactivatePerson(ctx: Ctx, id: string): Promise<PersonRow> {
  const person = await loadPerson(ctx, id)
  await assertAnotherOwner(ctx, person)
  await ctx.db.update(s.person).set({ active: false }).where(eq(s.person.id, id))
  return loadPerson(ctx, id)
}

export const peopleList = defineHandler({
  name: "people.list", method: "GET", path: "/people", scope: "read", summary: "List the people who work here, owners first: role, truck, working days and capacity by visit kind.",
  input: z.object({ active: z.enum(["true", "false"]).optional() }), output: z.object({ data: z.array(PersonOut) }),
  async run(ctx, input) {
    return { data: (await listPeople(ctx, { active: input.active === undefined ? undefined : input.active === "true" })).map(personOut) }
  },
})

export const peopleCreate = defineHandler({
  name: "people.create", method: "POST", path: "/people", scope: "admin", status: 201, summary: "Add a person. An email lets them sign in; a truck label puts them on the schedule under it.",
  input: z.object(fields), output: PersonOut,
  async run(ctx, input) {
    const row = await createPerson(ctx, input)
    await logSettingsChanges(ctx, [{ field: row.name, from: "Not on the team", to: "Added" }])
    return personOut(row)
  },
})

export const peopleUpdate = defineHandler({
  name: "people.update", method: "PATCH", path: "/people/{id}", scope: "admin", summary: "Change a person's name, contact, role, truck, Jobber user, working days, capacity or season.",
  input: z.object(changes).extend({ id: idInput.shape.id }), output: PersonOut,
  async run(ctx, { id, ...input }) {
    const before = await loadPerson(ctx, id)
    const after = await updatePerson(ctx, id, input)
    await logSettingsChanges(ctx, personLeaves(before, after))
    return personOut(after)
  },
})

export const peopleDeactivate = defineHandler({
  name: "people.deactivate", method: "DELETE", path: "/people/{id}", scope: "admin", summary: "Take a person out of service. Their history stays; the scheduler stops using them and they can no longer sign in.",
  input: idInput, output: PersonOut,
  async run(ctx, input) {
    const row = await deactivatePerson(ctx, input.id)
    await logSettingsChanges(ctx, [{ field: row.name, from: "On the team", to: "Removed" }])
    return personOut(row)
  },
})
