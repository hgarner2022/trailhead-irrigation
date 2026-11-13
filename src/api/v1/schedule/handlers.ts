import "server-only"
import { and, asc, eq, gte, lte, notInArray } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { ApiError, notFound, notImplemented } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { addDays, capacityKind, Day, Id, Town, today, VisitKind, weekdayOf } from "../shared"
import { blockedMinutes, capacityAfterBlocks } from "@/lib/admin/calendar"
import { loadBlocks } from "@/lib/jobber-feed"
import { visitOut, visitsQuery } from "../visits/queries"
import { VisitOut } from "../visits/schemas"

export const scheduleRun = defineHandler({
  name: "schedule.run",
  method: "POST",
  path: "/schedule/run",
  scope: "admin",
  summary: "Place the visits due within a window's lead time onto truck-days and send the date messages in the same run. Needs the scheduler (Phase 10); not implemented yet.",
  input: z.object({ window: z.enum(["turn-on", "inspection", "blowout"]), season: z.number().int().optional() }),
  output: z.object({ placed: z.number().int(), unplaced: z.number().int() }),
  async run() {
    throw notImplemented("schedule.run")
  },
})

export const scheduleWeek = defineHandler({
  name: "schedule.week",
  method: "GET",
  path: "/schedule/week",
  scope: "read",
  summary: "The week grid: the trucks, the visits on each day for seven days from `from`, and the tray of visits still to schedule.",
  input: z.object({ from: Day }),
  output: z.object({
    from: Day,
    to: Day,
    trucks: z.array(z.object({ id: Id, name: z.string(), workingDays: z.array(z.string()), active: z.boolean() })),
    visits: z.array(VisitOut),
    tray: z.array(VisitOut),
  }),
  async run(ctx, input) {
    const to = addDays(input.from, 6)
    const trucks = await ctx.db.select().from(s.truck).where(eq(s.truck.organizationId, ctx.organizationId)).orderBy(asc(s.truck.name))
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
      trucks: trucks.map((t) => ({ id: t.id, name: t.name, workingDays: t.workingDays, active: t.active })),
      visits: visits.map((v) => visitOut(ctx, v)),
      tray: tray.map((v) => visitOut(ctx, v)),
    }
  },
})

const Stop = z.object({
  visitId: Id,
  truckId: Id.nullable(),
  order: z.number().int().describe("1-based position in the truck's day."),
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
  summary: "The map's pins and stop order for one day, optionally for one truck.",
  input: z.object({ day: Day, truckId: Id.optional() }),
  output: z.object({ day: Day, stops: z.array(Stop) }),
  async run(ctx, input) {
    const rows = await visitsQuery(ctx.db)
      .where(and(eq(s.visit.organizationId, ctx.organizationId), eq(s.visit.scheduledOn, input.day), input.truckId ? eq(s.visit.truckId, input.truckId) : undefined, notInArray(s.visit.status, ["cancelled", "skipped"])))
      .orderBy(asc(s.visit.truckId), asc(s.visit.stopOrder), asc(s.visit.startTime), asc(s.visit.id))
    const position = new Map<string, number>()
    return {
      day: input.day,
      stops: rows.map((r) => {
        const key = r.visit.truckId ?? ""
        const next = (position.get(key) ?? 0) + 1
        position.set(key, next)
        const v = r.visit
        return { visitId: v.id, truckId: v.truckId, order: v.stopOrder ?? next, kind: v.kind, firstName: r.firstName, town: r.town, lat: r.lat, lng: r.lng, startTime: v.startTime, durationMinutes: v.durationMinutes, status: v.status }
      }),
    }
  },
})

export const scheduleSlots = defineHandler({
  name: "schedule.slots",
  method: "GET",
  path: "/schedule/slots",
  scope: "read",
  summary: "Open truck-days for a service, zone count and town, from tomorrow: the truck works the weekday, has room for the kind after the busy time on its Jobber calendar, and is not already in another area that day.",
  input: z.object({ service: z.string().min(1).describe("A service key, e.g. `turn-on-8`."), zones: z.coerce.number().int().min(1).max(16).optional(), town: Town, from: Day.optional(), days: z.coerce.number().int().min(1).max(60).default(14) }),
  output: z.object({ data: z.array(z.object({ day: Day, truckId: Id, truckName: z.string(), remaining: z.number().int(), slotMinutes: z.number().int() })) }),
  async run(ctx, input) {
    const [service] = await ctx.db.select().from(s.service).where(and(eq(s.service.organizationId, ctx.organizationId), eq(s.service.key, input.service)))
    if (!service) throw notFound("Service")
    if (!service.bookable || service.quoteOnly) throw new ApiError("unprocessable", "This service is not booked online")
    if (input.zones !== undefined && ((service.minZones && input.zones < service.minZones) || (service.maxZones && input.zones > service.maxZones)))
      throw new ApiError("unprocessable", `This service covers ${service.minZones} to ${service.maxZones} zones`)
    const trucks = await ctx.db.select().from(s.truck).where(and(eq(s.truck.organizationId, ctx.organizationId), eq(s.truck.active, true)))
    const areas = await ctx.db.select().from(s.area).where(eq(s.area.organizationId, ctx.organizationId))
    const areaOf = (town: string) => areas.find((a) => a.towns.includes(town as never))?.id ?? town
    const first = addDays(input.from ?? today(ctx), input.from ? 0 : 1)
    const last = addDays(first, input.days - 1)
    const booked = await visitsQuery(ctx.db).where(and(eq(s.visit.organizationId, ctx.organizationId), gte(s.visit.scheduledOn, first), lte(s.visit.scheduledOn, last), notInArray(s.visit.status, ["cancelled", "skipped"])))
    const kind = capacityKind(service.kind)
    // Busy time from each truck's Jobber calendar feed shrinks the truck-day (all-day blocks close it).
    const blocks = await loadBlocks(ctx.db, ctx.organizationId, new Date(`${first}T00:00:00Z`), new Date(`${addDays(last, 1)}T23:59:59Z`))
    const data: { day: string; truckId: string; truckName: string; remaining: number; slotMinutes: number }[] = []
    for (let i = 0; i < input.days; i++) {
      const day = addDays(first, i)
      for (const truck of trucks) {
        if (!truck.workingDays.includes(weekdayOf(day))) continue
        const mine = booked.filter((b) => b.visit.truckId === truck.id && b.visit.scheduledOn === day)
        if (mine.some((b) => areaOf(b.town) !== areaOf(input.town))) continue
        const capacity = capacityAfterBlocks(truck.capacityByKind[kind], blockedMinutes(blocks, truck.id, day, "America/Denver"))
        const remaining = capacity - mine.filter((b) => capacityKind(b.visit.kind) === kind).length
        if (remaining > 0) data.push({ day, truckId: truck.id, truckName: truck.name, remaining, slotMinutes: service.slotMinutes })
      }
    }
    return { data }
  },
})
