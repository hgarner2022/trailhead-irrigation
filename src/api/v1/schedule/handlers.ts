import "server-only"
import { and, asc, eq, gte, lte, notInArray } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { ApiError, notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { addDays, byPrincipal, capacityKind, Day, Id, Town, today, VisitKind, weekdayOf } from "../shared"
import { blockedMinutes, capacityAfterBlocks } from "@/lib/admin/calendar"
import { runSchedule } from "@/lib/scheduling/server/run"
import { loadBlocks } from "@/lib/jobber-feed"
import { openSlots, spreadDays } from "@/lib/pass/server/area-days"
import { windowText } from "@/emails/format"
import { inBookableWindow, windowWords } from "@/lib/services-window"
import { listPeople, resolvePersonId, Role, routePeople } from "../people/handlers"
import { PersonIdAlias } from "../visits/handlers"
import { visitOut, visitsQuery, withJobCredit } from "../visits/queries"
import { VisitOut } from "../visits/schemas"

export const scheduleRun = defineHandler({
  name: "schedule.run",
  method: "POST",
  path: "/schedule/run",
  scope: "admin",
  summary: "Schedule: place every pass visit of the window that is due within its lead time onto a person's day in one step. Each placed visit is scheduled, its stops ordered and its customer texted the date (emailed with no mobile number); a visit waiting for its customer's pick is left alone. Home gets a line for the run and a row for each visit that could not be placed. Running it again places nothing new.",
  input: z.object({ window: z.enum(["turn-on", "inspection", "blowout"]), season: z.number().int().optional() }),
  output: z.object({ placed: z.number().int(), unplaced: z.number().int() }),
  async run(ctx, input) {
    const out = await runSchedule(ctx.db, { organizationId: ctx.organizationId, window: input.window, season: input.season, today: today(ctx), now: ctx.now, by: byPrincipal(ctx) })
    return { placed: out.placed, unplaced: out.unplaced }
  },
})

const WeekPerson = z.object({ id: Id, name: z.string(), role: Role, truck: z.string().nullable(), workingDays: z.array(z.string()), active: z.boolean() })

export const scheduleWeek = defineHandler({
  name: "schedule.week",
  method: "GET",
  path: "/schedule/week",
  scope: "read",
  summary: "The week grid: the people who drive a route (owner first), the visits on each day for seven days from `from`, and the tray of visits still to schedule.",
  input: z.object({ from: Day }),
  output: z.object({
    from: Day,
    to: Day,
    people: z.array(WeekPerson),
    visits: z.array(VisitOut),
    tray: z.array(VisitOut),
  }),
  async run(ctx, input) {
    const to = addDays(input.from, 6)
    // Everyone with a truck, in or out of service: a visit still on someone who left stays readable in the grid.
    const people = (await listPeople(ctx)).filter((p) => p.truck !== null).map((p) => ({ id: p.id, name: p.name, role: p.role, truck: p.truck, workingDays: p.workingDays, active: p.active }))
    const visits = await visitsQuery(ctx.db)
      .where(and(eq(s.visit.organizationId, ctx.organizationId), gte(s.visit.scheduledOn, input.from), lte(s.visit.scheduledOn, to), notInArray(s.visit.status, ["cancelled", "skipped"])))
      .orderBy(asc(s.visit.scheduledOn), asc(s.visit.stopOrder), asc(s.visit.startTime), asc(s.visit.id))
    const tray = await visitsQuery(ctx.db)
      .where(and(eq(s.visit.organizationId, ctx.organizationId), eq(s.visit.status, "unscheduled")))
      .orderBy(asc(s.visit.createdAt), asc(s.visit.id))
      .limit(200)
    return {
      from: input.from,
      to,
      people,
      visits: (await withJobCredit(ctx.db, ctx.organizationId, visits)).map((v) => visitOut(ctx, v)),
      tray: (await withJobCredit(ctx.db, ctx.organizationId, tray)).map((v) => visitOut(ctx, v)),
    }
  },
})

const Stop = z.object({
  visitId: Id,
  personId: Id.nullable(),
  order: z.number().int().describe("1-based position in the person's day."),
  kind: VisitKind,
  firstName: z.string(),
  town: Town,
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  startTime: z.string().nullable(),
  durationMinutes: z.number().int().nullable(),
  status: z.string(),
})

export const scheduleDay = defineHandler({
  name: "schedule.day",
  method: "GET",
  path: "/schedule/day",
  scope: "read",
  summary: "The map's pins and stop order for one day, optionally for one person.",
  input: z.object({
    day: Day,
    personId: Id.optional().describe("Only this person's stops; an unknown id answers not_found."),
    truckId: PersonIdAlias.describe("Alias of personId, kept for one season: the same id (the old truck id is still understood); an unknown id answers not_found."),
  }),
  output: z.object({ day: Day, stops: z.array(Stop) }),
  async run(ctx, input) {
    const filterId = input.personId ?? input.truckId
    const personId = filterId ? await resolvePersonId(ctx, filterId) : undefined
    const rows = await visitsQuery(ctx.db)
      .where(and(eq(s.visit.organizationId, ctx.organizationId), eq(s.visit.scheduledOn, input.day), personId ? eq(s.visit.personId, personId) : undefined, notInArray(s.visit.status, ["cancelled", "skipped"])))
      .orderBy(asc(s.visit.personId), asc(s.visit.stopOrder), asc(s.visit.startTime), asc(s.visit.id))
    const position = new Map<string, number>()
    return {
      day: input.day,
      stops: rows.map((r) => {
        const key = r.visit.personId ?? ""
        const next = (position.get(key) ?? 0) + 1
        position.set(key, next)
        const v = r.visit
        return { visitId: v.id, personId: v.personId, order: v.stopOrder ?? next, kind: v.kind, firstName: r.firstName, town: r.town, lat: r.lat, lng: r.lng, startTime: v.startTime, durationMinutes: v.durationMinutes, status: v.status }
      }),
    }
  },
})

/** A day on someone's schedule, as the slot and offer lists name them. */
const slotPerson = { personId: Id, personName: z.string() }

export const scheduleSlots = defineHandler({
  name: "schedule.slots",
  method: "GET",
  path: "/schedule/slots",
  scope: "read",
  checkout: true,
  summary: "Open days for a service, zone count and town, from tomorrow, per person: they work the weekday, have room for the kind after the busy time on their Jobber calendar, and are not already in another area that day.",
  input: z.object({ service: z.string().min(1).describe("A service key, e.g. `turn-on-8`."), zones: z.coerce.number().int().min(1).max(16).optional(), town: Town, from: Day.optional(), days: z.coerce.number().int().min(1).max(60).default(14) }),
  output: z.object({ data: z.array(z.object({ day: Day, ...slotPerson, remaining: z.number().int(), slotMinutes: z.number().int() })) }),
  async run(ctx, input) {
    const [service] = await ctx.db.select().from(s.service).where(and(eq(s.service.organizationId, ctx.organizationId), eq(s.service.key, input.service)))
    if (!service) throw notFound("Service")
    if (!service.active || !service.bookable || service.quoteOnly) throw new ApiError("unprocessable", "This service is not booked online")
    if (input.zones !== undefined && ((service.minZones && input.zones < service.minZones) || (service.maxZones && input.zones > service.maxZones)))
      throw new ApiError("unprocessable", `This service covers ${service.minZones} to ${service.maxZones} zones`)
    const people = await routePeople(ctx)
    const areas = await ctx.db.select().from(s.area).where(eq(s.area.organizationId, ctx.organizationId))
    const areaOf = (town: string) => areas.find((a) => a.towns.includes(town as never))?.id ?? town
    const first = addDays(input.from ?? today(ctx), input.from ? 0 : 1)
    const last = addDays(first, input.days - 1)
    // A service carries the span of the year its visits may fall in (Settings > Services); a stretch with no day in it has nothing to offer.
    if (!Array.from({ length: input.days }, (_, i) => addDays(first, i)).some((d) => inBookableWindow(service, d)))
      throw new ApiError("unprocessable", `${service.name} days are ${windowWords(service)}; none of ${first} to ${last} fall in it`)
    const booked = await visitsQuery(ctx.db).where(and(eq(s.visit.organizationId, ctx.organizationId), gte(s.visit.scheduledOn, first), lte(s.visit.scheduledOn, last), notInArray(s.visit.status, ["cancelled", "skipped"])))
    const kind = capacityKind(service.kind)
    // Busy time from each person's Jobber calendar feed shrinks their day (all-day blocks close it).
    const blocks = await loadBlocks(ctx.db, ctx.organizationId, new Date(`${first}T00:00:00Z`), new Date(`${addDays(last, 1)}T23:59:59Z`))
    const data: { day: string; personId: string; personName: string; remaining: number; slotMinutes: number }[] = []
    for (let i = 0; i < input.days; i++) {
      const day = addDays(first, i)
      if (!inBookableWindow(service, day)) continue
      for (const person of people) {
        if (!person.workingDays.includes(weekdayOf(day))) continue
        const mine = booked.filter((b) => b.visit.personId === person.id && b.visit.scheduledOn === day)
        if (mine.some((b) => areaOf(b.town) !== areaOf(input.town))) continue
        const capacity = capacityAfterBlocks(person.capacityByKind[kind], blockedMinutes(blocks, person.id, day, "America/Denver"))
        const remaining = capacity - mine.filter((b) => capacityKind(b.visit.kind) === kind).length
        if (remaining > 0) data.push({ day, personId: person.id, personName: person.name, remaining, slotMinutes: service.slotMinutes })
      }
    }
    return { data }
  },
})

const PassKind = z.enum(["turn-on", "inspection", "blowout"])

export const scheduleOfferDays = defineHandler({
  name: "schedule.offerDays",
  method: "GET",
  path: "/schedule/offer-days",
  scope: "read",
  checkout: true,
  summary: "The three best open days for one pass visit that does not exist yet, for the checkout's \"Your days\" step: the town's open days inside the visit's window for that season, under capacity in visits and minutes after the busy time on the Jobber calendar, spread out as the earliest open day, one near the middle and the last. Each has the day, the person who would take it and the two-hour arrival window from the slot grid. Fewer open days gives fewer days; none gives an empty list.",
  input: z.object({ town: Town, kind: PassKind, season: z.coerce.number().int().min(2026).max(2100), zones: z.coerce.number().int().min(1).max(16) }),
  output: z.object({ days: z.array(z.object({ day: Day, ...slotPerson, start: z.string().describe("HH:MM, Mountain."), window: z.string().describe("The two-hour window, \"8 to 10 am\".") })) }),
  async run(ctx, input) {
    const slots = await openSlots(ctx.db, { id: "", organizationId: ctx.organizationId, kind: input.kind, town: input.town }, today(ctx), input.season)
    // Ordering a day starts its first stop at FIRST_STOP (8:00), so no window opens earlier than that.
    const opens = (start: string) => (start < "08:00" ? "08:00" : start)
    return { days: spreadDays(slots).map((x) => ({ day: x.day, personId: x.personId, personName: x.personName, start: opens(x.start), window: windowText(opens(x.start)) })) }
  },
})
