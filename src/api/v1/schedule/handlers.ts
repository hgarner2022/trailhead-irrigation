import "server-only"
import { and, asc, eq, gte, lte, notInArray } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { ApiError, notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { addDays, byPrincipal, Day, Id, Town, today, VisitKind } from "../shared"
import { runSchedule } from "@/lib/scheduling/server/run"
import { loadOffers, loadOpenDays, namedOffers } from "@/lib/scheduling/server/offers"
import { OfferOut } from "./offers"
import { timeText } from "@/emails/format"
import { OFFERED } from "@/lib/pass/server/area-days"
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
  summary: "Open days for a service, zone count and town, from tomorrow, per person, from the one offer rule (docs/plans/2026-11-18-scheduling-engine-design.md, section 4): they work the weekday, have a gap of the service's length inside their hours after the drive cushion to the visits already booked and the busy time on their Jobber calendar, and are under their count for the kind. `starts` is that person's open start times (every half hour); `remaining` is how many.",
  input: z.object({ service: z.string().min(1).describe("A service key, e.g. `turn-on-8`."), zones: z.coerce.number().int().min(1).max(16).optional(), town: Town, from: Day.optional(), days: z.coerce.number().int().min(1).max(60).default(14) }),
  output: z.object({ data: z.array(z.object({ day: Day, ...slotPerson, remaining: z.number().int(), slotMinutes: z.number().int(), starts: z.array(z.string()) })) }),
  async run(ctx, input) {
    const [service] = await ctx.db.select().from(s.service).where(and(eq(s.service.organizationId, ctx.organizationId), eq(s.service.key, input.service)))
    if (!service) throw notFound("Service")
    if (!service.active || !service.bookable || service.quoteOnly) throw new ApiError("unprocessable", "This service is not booked online")
    if (input.zones !== undefined && ((service.minZones && input.zones < service.minZones) || (service.maxZones && input.zones > service.maxZones)))
      throw new ApiError("unprocessable", `This service covers ${service.minZones} to ${service.maxZones} zones`)
    const first = addDays(input.from ?? today(ctx), input.from ? 0 : 1)
    const last = addDays(first, input.days - 1)
    // A service carries the span of the year its visits may fall in (Settings > Services); a stretch with no day in it has nothing to offer.
    if (!Array.from({ length: input.days }, (_, i) => addDays(first, i)).some((d) => inBookableWindow(service, d)))
      throw new ApiError("unprocessable", `${service.name} days are ${windowWords(service)}; none of ${first} to ${last} fall in it`)
    // The one offer rule: each open day in the range, per person who has a gap of the service's length, with that person's open starts.
    const { open } = await loadOpenDays(ctx.db, { organizationId: ctx.organizationId, kind: service.kind, serviceKey: service.key, town: input.town, zones: input.zones, today: [today(ctx), addDays(first, -1)].sort().at(-1)! }, 120)
    const names = new Map((await routePeople(ctx)).map((p) => [p.id, p.name]))
    const data: { day: string; personId: string; personName: string; remaining: number; slotMinutes: number; starts: string[] }[] = []
    for (const o of open) {
      if (o.day < first || o.day > last) continue
      const persons = [...new Set(o.slots.map((x) => x.personId))]
      for (const personId of persons) {
        const starts = o.slots.filter((x) => x.personId === personId).map((x) => x.start).sort()
        data.push({ day: o.day, personId, personName: names.get(personId) ?? "", remaining: starts.length, slotMinutes: service.slotMinutes, starts })
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
  summary: "The best open days for one pass visit that does not exist yet, for the checkout's \"Your days\" step, from the one offer rule (docs/plans/2026-11-18-scheduling-engine-design.md, section 4): tomorrow at the earliest, the service's bookable dates, a gap of the service's length inside someone's hours under their cap, soonest days first with nearness to the customer's town (and street, when `lat` and `lng` are given) ordering them. `days` keeps its old shape (the day, the person who would take it, the start of the best open time and the two-hour window around it) in date order; `offers` adds each day's label, the one to preselect and every open start time. Fewer open days gives fewer days; none gives an empty list.",
  input: z.object({ town: Town, kind: PassKind, season: z.coerce.number().int().min(2026).max(2100), zones: z.coerce.number().int().min(1).max(16), lat: z.coerce.number().min(-90).max(90).optional(), lng: z.coerce.number().min(-180).max(180).optional(), count: z.coerce.number().int().min(1).max(5).optional() }),
  output: z.object({
    days: z.array(z.object({ day: Day, ...slotPerson, start: z.string().describe("HH:MM, Mountain."), window: z.string().describe("The exact start, \"8:00 am\".") })),
    offers: z.array(OfferOut),
  }),
  async run(ctx, input) {
    const point = input.lat !== undefined && input.lng !== undefined ? { lat: input.lat, lng: input.lng } : null
    const offers = await namedOffers(ctx.db, ctx.organizationId, await loadOffers(ctx.db, { organizationId: ctx.organizationId, kind: input.kind, town: input.town, point, zones: input.zones, season: input.season, today: today(ctx), count: input.count ?? OFFERED }))
    return { days: offers.map((o) => ({ day: o.day, personId: o.slots[0]!.personId, personName: o.slots[0]!.personName, start: o.slots[0]!.start, window: timeText(o.slots[0]!.start) })), offers }
  },
})
