import "server-only"
import { and, desc, eq, gte, lte, ne, notInArray } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import type { Ctx } from "../../core/context"
import { ApiError, notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { afterTimeCursor, cursorPage, page, pageInput, timeCursor } from "../../core/pagination"
import { assertOwnsCustomer, capacityKind, Day, Id, idInput, okOutput, OK, today, VisitKind, VisitStatus, weekdayOf } from "../shared"
import { hasScope } from "@/lib/auth/principal"
import { readAppUrl } from "@/lib/env"
import { longDay, kindName, queueEmail, queueText } from "@/lib/pass/server/messages"
import { offeredDays, openSlots, truckFor } from "@/lib/pass/server/area-days"
import { emitEvent } from "../webhooks/deliver"
import { recordChange } from "../passes/queries"
import { loadVisit, visitOut, visitsQuery } from "./queries"
import { VisitOut } from "./schemas"

const FINAL = ["completed", "cancelled", "skipped"] as const

export const visitsList = defineHandler({
  name: "visits.list",
  method: "GET",
  path: "/visits",
  scope: "read",
  summary: "List visits, newest first. Filter by day range, truck, status, kind or pass.",
  input: z.object({ from: Day.optional(), to: Day.optional(), truckId: Id.optional(), status: VisitStatus.optional(), kind: VisitKind.optional(), passId: Id.optional(), ...pageInput }),
  output: page(VisitOut),
  async run(ctx, input) {
    const rows = await visitsQuery(ctx.db)
      .where(
        and(
          eq(s.visit.organizationId, ctx.organizationId),
          input.from ? gte(s.visit.scheduledOn, input.from) : undefined,
          input.to ? lte(s.visit.scheduledOn, input.to) : undefined,
          input.truckId ? eq(s.visit.truckId, input.truckId) : undefined,
          input.status ? eq(s.visit.status, input.status) : undefined,
          input.kind ? eq(s.visit.kind, input.kind) : undefined,
          input.passId ? eq(s.visit.passId, input.passId) : undefined,
          afterTimeCursor(s.visit.createdAt, s.visit.id, input.cursor),
        ),
      )
      .orderBy(desc(s.visit.createdAt), desc(s.visit.id))
      .limit(input.limit + 1)
    const result = cursorPage(rows, input.limit, (r) => timeCursor(r.visit))
    return { data: result.data.map((r) => visitOut(ctx, r)), next_cursor: result.next_cursor }
  },
})

export const visitsGet = defineHandler({
  name: "visits.get",
  method: "GET",
  path: "/visits/{id}",
  scope: "read",
  summary: "One visit, with its truck, day and the customer's first name.",
  input: idInput,
  output: VisitOut,
  async run(ctx, input) {
    return visitOut(ctx, await loadVisit(ctx, input.id))
  },
})

export const visitsMove = defineHandler({
  name: "visits.move",
  method: "POST",
  path: "/visits/{id}/move",
  scope: "write",
  summary: "Put a visit on a truck and a day. Hard rules: the truck works that weekday, the day is inside the visit's window, the truck-day has capacity for the kind, and the truck-day stays in one area group.",
  input: z.object({ id: Id, truckId: Id, scheduledOn: Day, startTime: z.string().regex(/^\d{2}:\d{2}$/).optional() }),
  output: VisitOut,
  async run(ctx, input) {
    const row = await loadVisit(ctx, input.id)
    const visit = row.visit
    if ((FINAL as readonly string[]).includes(visit.status)) throw new ApiError("unprocessable", `A ${visit.status} visit cannot be moved`)
    const [truck] = await ctx.db.select().from(s.truck).where(and(eq(s.truck.id, input.truckId), eq(s.truck.organizationId, ctx.organizationId)))
    if (!truck) throw notFound("Truck")
    if (!truck.active) throw new ApiError("unprocessable", `${truck.name} is not in service`)
    if (!truck.workingDays.includes(weekdayOf(input.scheduledOn))) throw new ApiError("unprocessable", `${truck.name} does not work on ${weekdayOf(input.scheduledOn)}days`)
    const [org] = await ctx.db.select({ settings: s.organization.settings }).from(s.organization).where(eq(s.organization.id, ctx.organizationId))
    const window = visit.passId ? org?.settings.windows.find((w) => w.kind === visit.kind) : undefined
    if (window && (input.scheduledOn < window.opensOn.slice(0, 10) || input.scheduledOn > window.closesOn.slice(0, 10)))
      throw new ApiError("unprocessable", `A ${visit.kind} visit must land between ${window.opensOn.slice(0, 10)} and ${window.closesOn.slice(0, 10)}`)
    const others = await visitsQuery(ctx.db).where(
      and(eq(s.visit.organizationId, ctx.organizationId), eq(s.visit.truckId, truck.id), eq(s.visit.scheduledOn, input.scheduledOn), ne(s.visit.id, visit.id), notInArray(s.visit.status, ["cancelled", "skipped"])),
    )
    const kind = capacityKind(visit.kind)
    if (others.filter((o) => capacityKind(o.visit.kind) === kind).length >= truck.capacityByKind[kind])
      throw new ApiError("unprocessable", `${truck.name} is full of ${kind} visits on ${input.scheduledOn}`)
    const areas = await ctx.db.select().from(s.area).where(eq(s.area.organizationId, ctx.organizationId))
    const areaOf = (town: string) => areas.find((a) => a.towns.includes(town as never))?.id ?? town
    if (others.some((o) => areaOf(o.town) !== areaOf(row.town)))
      throw new ApiError("unprocessable", `${truck.name} already works a different area on ${input.scheduledOn}`)
    const moved = visit.status === "scheduled"
    await ctx.db
      .update(s.visit)
      .set({ status: "scheduled", truckId: truck.id, scheduledOn: input.scheduledOn, startTime: input.startTime ?? null, awaitingPick: false, stopOrder: null })
      .where(eq(s.visit.id, visit.id))
    await emitEvent(ctx.db, ctx.organizationId, moved ? "visit.moved" : "visit.scheduled", { visitId: visit.id, truckId: truck.id, scheduledOn: input.scheduledOn, from: moved ? { truckId: visit.truckId, scheduledOn: visit.scheduledOn } : null })
    return visitOut(ctx, await loadVisit(ctx, visit.id))
  },
})

export const visitsMarkClosed = defineHandler({
  name: "visits.markClosed",
  method: "POST",
  path: "/visits/{id}/close",
  scope: "admin",
  summary: "Mark a visit done when the completion never arrived from the field (21 percent of 2026 visits were never closed).",
  input: z.object({ id: Id, completedOn: Day.optional().describe("Defaults to today.") }),
  output: VisitOut,
  async run(ctx, input) {
    const { visit } = await loadVisit(ctx, input.id)
    if (visit.status === "completed") return visitOut(ctx, await loadVisit(ctx, visit.id))
    if (!(["scheduled", "not-closed"] as string[]).includes(visit.status)) throw new ApiError("unprocessable", `A ${visit.status} visit cannot be closed`)
    await ctx.db.update(s.visit).set({ status: "completed", completedOn: input.completedOn ?? today(ctx) }).where(eq(s.visit.id, visit.id))
    await emitEvent(ctx.db, ctx.organizationId, "visit.done", { visitId: visit.id, completedOn: input.completedOn ?? today(ctx) })
    return visitOut(ctx, await loadVisit(ctx, visit.id))
  },
})

export const visitsStretch = defineHandler({
  name: "visits.stretch",
  method: "POST",
  path: "/visits/{id}/stretch",
  scope: "write",
  summary: "Change the length of a scheduled visit after it is booked.",
  input: z.object({ id: Id, durationMinutes: z.number().int().min(15).max(480).multipleOf(15) }),
  output: VisitOut,
  async run(ctx, input) {
    const { visit } = await loadVisit(ctx, input.id)
    if (visit.status !== "scheduled") throw new ApiError("unprocessable", "Only a scheduled visit can be stretched")
    await ctx.db.update(s.visit).set({ durationMinutes: input.durationMinutes }).where(eq(s.visit.id, visit.id))
    return visitOut(ctx, await loadVisit(ctx, visit.id))
  },
})

export const visitsRequestMove = defineHandler({
  name: "visits.requestMove",
  method: "POST",
  path: "/visits/{id}/request-move",
  scope: "write",
  customerSelf: true,
  summary: "A customer asks for a different day or week. Recorded for the admin; nothing moves until someone places the visit.",
  input: z.object({ id: Id, preferredWeek: Day.optional().describe("A day in the week the customer would like."), note: z.string().max(500).optional() }),
  output: okOutput,
  async run(ctx, input) {
    const { visit } = await loadVisit(ctx, input.id)
    const p = ctx.principal
    if (p.kind === "person" && p.type === "customer" && p.customerId !== visit.customerId) throw new ApiError("forbidden", "That visit belongs to another customer")
    if ((FINAL as readonly string[]).includes(visit.status)) throw new ApiError("unprocessable", `A ${visit.status} visit cannot be moved`)
    await recordChange(ctx, { customerId: visit.customerId, passId: visit.passId, visitId: visit.id, kind: "move-requested", detail: { preferredWeek: input.preferredWeek ?? null, note: input.note ?? null } })
    return OK
  },
})


export const visitsLinkRequest = defineHandler({
  name: "visits.linkRequest",
  method: "POST",
  path: "/visits/{id}/jobber-request",
  scope: "write",
  summary: "Record the Jobber request created for a placed visit, so the Jobber routine does not create it twice. Visits with `jobberRequestUrl` null still need one.",
  input: z.object({ id: Id, url: z.string().url().max(500).describe("The request's address in Jobber.") }),
  output: VisitOut,
  async run(ctx, input) {
    const { visit } = await loadVisit(ctx, input.id)
    await ctx.db.update(s.visit).set({ jobberJobUrl: input.url }).where(eq(s.visit.id, visit.id))
    return visitOut(ctx, await loadVisit(ctx, visit.id))
  },
})

const PICKABLE = ["unscheduled", "scheduled"] as const

/** The pass visit and its open pass, for the two calls a customer makes about their own day. */
async function loadPickable(ctx: Ctx, id: string) {
  const row = await loadVisit(ctx, id)
  const { visit } = row
  assertOwnsCustomer(ctx, visit.customerId)
  if (!visit.passId) throw new ApiError("unprocessable", "Only a pass visit has days to pick from")
  const [pass] = await ctx.db.select().from(s.seasonPass).where(eq(s.seasonPass.id, visit.passId))
  if (!pass || pass.status !== "active") throw new ApiError("unprocessable", "This pass is not open")
  if (!(PICKABLE as readonly string[]).includes(visit.status)) throw new ApiError("unprocessable", `A ${visit.status} visit has no day to pick`)
  return { row, visit, pass }
}

export const visitsAreaDays = defineHandler({
  name: "visits.areaDays",
  method: "GET",
  path: "/visits/{id}/area-days",
  scope: "read",
  customerSelf: true,
  summary: "The days a pass visit could take, up to three, each a day a truck already works the customer's area or has room: what the pass page offers a customer who must be home. A customer asks only about their own visit.",
  input: idInput,
  output: z.object({ days: z.array(Day) }),
  async run(ctx, input) {
    const { row, visit } = await loadPickable(ctx, input.id)
    return { days: offeredDays(await openSlots(ctx.db, { id: visit.id, organizationId: visit.organizationId, kind: visit.kind, town: row.town }, today(ctx))) }
  },
})

export const visitsPick = defineHandler({
  name: "visits.pick",
  method: "POST",
  path: "/visits/{id}/pick",
  scope: "write",
  customerSelf: true,
  summary: "A customer who must be home picks one of the offered area days for their pass visit. The visit lands on that day on a truck that works the area, and the customer is texted the date (emailed when there is no mobile number). A day that was not offered is refused.",
  input: z.object({ id: Id, day: Day }),
  output: VisitOut,
  async run(ctx, input) {
    const { row, visit, pass } = await loadPickable(ctx, input.id)
    if (!pass.needsCustomerHome && !hasScope(ctx.principal, "write")) throw new ApiError("unprocessable", "Your visits are placed for you; ask us if you need a different day")
    const slots = await openSlots(ctx.db, { id: visit.id, organizationId: visit.organizationId, kind: visit.kind, town: row.town }, today(ctx))
    const slot = offeredDays(slots).includes(input.day) ? truckFor(slots, input.day) : undefined
    if (!slot) throw new ApiError("unprocessable", "That day is not one of the days on offer; pick another")
    const moved = visit.status === "scheduled"
    await ctx.db.update(s.visit).set({ status: "scheduled", truckId: slot.truckId, scheduledOn: input.day, startTime: null, stopOrder: null, awaitingPick: false, exception: null }).where(eq(s.visit.id, visit.id))
    await recordChange(ctx, { customerId: visit.customerId, passId: visit.passId, visitId: visit.id, kind: "day-picked", detail: { visit: visit.kind, day: input.day, truck: slot.truckName, from: visit.scheduledOn } })
    await emitEvent(ctx.db, ctx.organizationId, moved ? "visit.moved" : "visit.scheduled", { visitId: visit.id, truckId: slot.truckId, scheduledOn: input.day, from: moved ? { truckId: visit.truckId, scheduledOn: visit.scheduledOn } : null })
    const [customer] = await ctx.db.select().from(s.customer).where(eq(s.customer.id, visit.customerId))
    if (customer) {
      const text = `Trailhead: your ${kindName(visit.kind)} is ${longDay(input.day)}. Change your day or anything else: ${readAppUrl()}/account/pass`
      const base = { organizationId: ctx.organizationId, customerId: customer.id, visitId: visit.id, kind: moved ? ("date-moved" as const) : ("date-set" as const), key: `${visit.id}-${input.day}`, body: text }
      if (customer.phone) await queueText(ctx.db, { ...base, to: customer.phone })
      else if (customer.email) await queueEmail(ctx.db, { ...base, to: customer.email, subject: `Your ${kindName(visit.kind)} is ${longDay(input.day)}` })
    }
    return visitOut(ctx, await loadVisit(ctx, visit.id))
  },
})
