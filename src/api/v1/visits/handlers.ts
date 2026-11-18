import "server-only"
import { and, desc, eq, gte, lte, ne, notInArray } from "drizzle-orm"
import { passStatus } from "@/lib/pass/facts"
import { z } from "zod"
import * as s from "@/db/schema"
import type { Ctx } from "../../core/context"
import { ApiError, notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { afterTimeCursor, cursorPage, page, pageInput, timeCursor } from "../../core/pagination"
import { addDays, assertOwnsCustomer, capacityKind, Day, Id, idInput, okOutput, OK, today, VisitKind, VisitStatus, weekdayOf } from "../shared"
import { queueDateMessage } from "@/lib/scheduling/server/notify"
import { orderDay } from "@/lib/scheduling/server/order-day"
import { blockedMinutes, capacityAfterBlocks } from "@/lib/admin/calendar"
import { loadBlocks } from "@/lib/jobber-feed"
import { offeredDays, openSlots, personFor } from "@/lib/pass/server/area-days"
import { visitName } from "@/lib/events/names"
import { recordEvent, whoOf } from "@/lib/events/record"
import { emitEvent } from "../webhooks/deliver"
import { isRoutePerson, personByAnyId, resolvePersonId } from "../people/handlers"
import { recordChange } from "../passes/queries"
import { loadVisit, visitOut, visitsQuery, withJobCredit } from "./queries"
import { VisitOut, who } from "./schemas"

const FINAL = ["completed", "cancelled", "skipped"] as const

/** The alias on every input that names a person: `truckId` means the same id for one season. */
export const PersonIdAlias = Id.optional().describe("Alias of personId, kept for one season: the same id (the old truck id is still understood).")

/**
 * Who a visit is assigned to, from an input that may name them either way; the person must be on the schedule and work that weekday.
 * Naming `current`, the person the visit already has, is a no-op and passes those checks, even once that person is out of service.
 */
export async function assignee(ctx: Ctx, input: { personId?: string; truckId?: string }, day: string, current?: string | null) {
  const id = input.personId ?? input.truckId
  if (!id) throw new ApiError("invalid", "Say who takes the visit", [{ path: "personId", message: "Give a person" }])
  const person = await personByAnyId(ctx, id)
  if (!person) throw notFound("Person")
  if (person.id === current) return person
  if (!isRoutePerson(person)) throw new ApiError("unprocessable", `${person.name} is not in service`)
  if (!person.workingDays.includes(weekdayOf(day))) throw new ApiError("unprocessable", `${person.name} does not work on ${weekdayOf(day)}days`)
  return person
}

export const visitsList = defineHandler({
  name: "visits.list",
  method: "GET",
  path: "/visits",
  scope: "read",
  summary: "List visits, newest first. Filter by day range, person, status, kind or pass.",
  input: z.object({
    from: Day.optional(),
    to: Day.optional(),
    personId: Id.optional().describe("Only the visits assigned to this person; an unknown id answers not_found."),
    truckId: PersonIdAlias.describe("Alias of personId, kept for one season: the same id (the old truck id is still understood); an unknown id answers not_found."),
    status: VisitStatus.optional(),
    kind: VisitKind.optional(),
    passId: Id.optional(),
    ...pageInput,
  }),
  output: page(VisitOut),
  async run(ctx, input) {
    const filterId = input.personId ?? input.truckId
    const personId = filterId ? await resolvePersonId(ctx, filterId) : undefined
    const rows = await visitsQuery(ctx.db)
      .where(
        and(
          eq(s.visit.organizationId, ctx.organizationId),
          input.from ? gte(s.visit.scheduledOn, input.from) : undefined,
          input.to ? lte(s.visit.scheduledOn, input.to) : undefined,
          personId ? eq(s.visit.personId, personId) : undefined,
          input.status ? eq(s.visit.status, input.status) : undefined,
          input.kind ? eq(s.visit.kind, input.kind) : undefined,
          input.passId ? eq(s.visit.passId, input.passId) : undefined,
          afterTimeCursor(s.visit.createdAt, s.visit.id, input.cursor),
        ),
      )
      .orderBy(desc(s.visit.createdAt), desc(s.visit.id))
      .limit(input.limit + 1)
    const result = cursorPage(rows, input.limit, (r) => timeCursor(r.visit))
    return { data: (await withJobCredit(ctx.db, ctx.organizationId, result.data)).map((r) => visitOut(ctx, r)), next_cursor: result.next_cursor }
  },
})

export const visitsGet = defineHandler({
  name: "visits.get",
  method: "GET",
  path: "/visits/{id}",
  scope: "read",
  summary: "One visit, with the person assigned, the day and the customer's first name.",
  input: idInput,
  output: VisitOut,
  async run(ctx, input) {
    return visitOut(ctx, await loadVisit(ctx, input.id))
  },
})

/** The one placement: every hard rule, the day ordered, the date text queued. `visits.move` and `visits.create` both run it. `personId` names the person; `truckId` is its alias. */
export async function placeVisit(ctx: Ctx, input: { id: string; personId?: string; truckId?: string; scheduledOn: string; startTime?: string }) {
    const row = await loadVisit(ctx, input.id)
    const visit = row.visit
    if ((FINAL as readonly string[]).includes(visit.status)) throw new ApiError("unprocessable", `A ${visit.status} visit cannot be moved`)
    const person = await assignee(ctx, input, input.scheduledOn)
    const [org] = await ctx.db.select({ settings: s.organization.settings }).from(s.organization).where(eq(s.organization.id, ctx.organizationId))
    const window = visit.passId ? org?.settings.windows.find((w) => w.kind === visit.kind) : undefined
    if (window && (input.scheduledOn < window.opensOn.slice(0, 10) || input.scheduledOn > window.closesOn.slice(0, 10)))
      throw new ApiError("unprocessable", `A ${visit.kind} visit must land between ${window.opensOn.slice(0, 10)} and ${window.closesOn.slice(0, 10)}`)
    const others = await visitsQuery(ctx.db).where(
      and(eq(s.visit.organizationId, ctx.organizationId), eq(s.visit.personId, person.id), eq(s.visit.scheduledOn, input.scheduledOn), ne(s.visit.id, visit.id), notInArray(s.visit.status, ["cancelled", "skipped"])),
    )
    const kind = capacityKind(visit.kind)
    // The person's own Jobber calendar shrinks the day; Ryan may use the buffer the scheduler holds back.
    const blocks = await loadBlocks(ctx.db, ctx.organizationId, new Date(`${addDays(input.scheduledOn, -1)}T00:00:00Z`), new Date(`${addDays(input.scheduledOn, 2)}T00:00:00Z`))
    const room = capacityAfterBlocks(person.capacityByKind[kind], blockedMinutes(blocks, person.id, input.scheduledOn, "America/Denver"))
    if (others.filter((o) => capacityKind(o.visit.kind) === kind).length >= room)
      throw new ApiError("unprocessable", `${person.name} is full of ${kind} visits on ${input.scheduledOn}`)
    const areas = await ctx.db.select().from(s.area).where(eq(s.area.organizationId, ctx.organizationId))
    const areaOf = (town: string) => areas.find((a) => a.towns.includes(town as never))?.id ?? town
    if (others.some((o) => areaOf(o.town) !== areaOf(row.town)))
      throw new ApiError("unprocessable", `${person.name} already works a different area on ${input.scheduledOn}`)
    const moved = visit.status === "scheduled"
    await ctx.db
      .update(s.visit)
      .set({ status: "scheduled", personId: person.id, scheduledOn: input.scheduledOn, startTime: null, awaitingPick: false, stopOrder: null, exception: null, notDoneReason: null })
      .where(eq(s.visit.id, visit.id))
    await orderDay(ctx.db, { personId: person.id, day: input.scheduledOn })
    if (moved && visit.personId && visit.scheduledOn && (visit.personId !== person.id || visit.scheduledOn !== input.scheduledOn)) await orderDay(ctx.db, { personId: visit.personId, day: visit.scheduledOn })
    if (input.startTime) await ctx.db.update(s.visit).set({ startTime: input.startTime }).where(eq(s.visit.id, visit.id))
    await ctx.db.update(s.adminAlert).set({ resolvedAt: ctx.now }).where(and(eq(s.adminAlert.organizationId, ctx.organizationId), eq(s.adminAlert.kind, "unplaced"), eq(s.adminAlert.key, visit.id)))
    if (visit.scheduledOn !== input.scheduledOn) await queueDateMessage(ctx.db, visit, moved ? "date-moved" : "date-set", input.scheduledOn)
    await emitEvent(ctx.db, ctx.organizationId, moved ? "visit.moved" : "visit.scheduled", { visitId: visit.id, ...who(person.id), scheduledOn: input.scheduledOn, from: moved ? { ...who(visit.personId), scheduledOn: visit.scheduledOn } : null }, {
      about: "visit", aboutId: visit.id, customerId: visit.customerId, jobId: visit.jobId, visitId: visit.id, who: whoOf(ctx), at: ctx.now,
      detail: { name: visitName(visit.kind), day: input.scheduledOn, from: moved ? visit.scheduledOn : null, personId: person.id },
    })
    return visitOut(ctx, await loadVisit(ctx, visit.id))
}

export const visitsMove = defineHandler({
  name: "visits.move",
  method: "POST",
  path: "/visits/{id}/move",
  scope: "write",
  summary: "Put a visit on a person and a day. Hard rules: the person is on the schedule and works that weekday, the day is inside the visit's window, their day has capacity for the kind, and it stays in one area group. `personId` names them; `truckId` is the same id for one season.",
  input: z.object({ id: Id, personId: Id.optional(), truckId: PersonIdAlias, scheduledOn: Day, startTime: z.string().regex(/^\d{2}:\d{2}$/).optional() }),
  output: VisitOut,
  async run(ctx, input) {
    return placeVisit(ctx, input)
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
    if (input.durationMinutes !== visit.durationMinutes)
      await recordEvent(ctx.db, { organizationId: ctx.organizationId, about: "visit", aboutId: visit.id, customerId: visit.customerId, jobId: visit.jobId, visitId: visit.id, kind: "visit.edited", detail: { name: visitName(visit.kind), durationMinutes: { from: visit.durationMinutes, to: input.durationMinutes } }, who: whoOf(ctx), at: ctx.now })
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
  // The pass is open when its job is: the status is read from the job and its visits, never from the alias column.
  const [job] = pass ? await ctx.db.select({ status: s.job.status, cancelledAt: s.job.cancelledAt, season: s.job.season }).from(s.job).where(eq(s.job.id, pass.jobId)) : []
  if (!pass || !job || passStatus(job, today(ctx)) !== "active") throw new ApiError("unprocessable", "This pass is not open")
  if (!(PICKABLE as readonly string[]).includes(visit.status)) throw new ApiError("unprocessable", `A ${visit.status} visit has no day to pick`)
  return { row, visit, pass, season: job.season ?? pass.season }
}

export const visitsAreaDays = defineHandler({
  name: "visits.areaDays",
  method: "GET",
  path: "/visits/{id}/area-days",
  scope: "read",
  customerSelf: true,
  summary: "The days a pass visit could take, up to three, each a day someone already works the customer's area or has room: what the pass page offers a customer who must be home. A customer asks only about their own visit.",
  input: idInput,
  output: z.object({ days: z.array(Day) }),
  async run(ctx, input) {
    const { row, visit, season } = await loadPickable(ctx, input.id)
    return { days: offeredDays(await openSlots(ctx.db, { id: visit.id, organizationId: visit.organizationId, kind: visit.kind, town: row.town }, today(ctx), season)) }
  },
})

export const visitsPick = defineHandler({
  name: "visits.pick",
  method: "POST",
  path: "/visits/{id}/pick",
  scope: "write",
  customerSelf: true,
  summary: "A customer picks one of the offered days for their pass visit, to set it or to change it. The visit lands on that day with the person who works the area, and the customer is texted the date (emailed when there is no mobile number). A day that was not offered is refused.",
  input: z.object({ id: Id, day: Day }),
  output: VisitOut,
  async run(ctx, input) {
    const { row, visit, season } = await loadPickable(ctx, input.id)
    const slots = await openSlots(ctx.db, { id: visit.id, organizationId: visit.organizationId, kind: visit.kind, town: row.town }, today(ctx), season)
    const slot = offeredDays(slots).includes(input.day) ? personFor(slots, input.day) : undefined
    if (!slot) throw new ApiError("unprocessable", "That day is not one of the days on offer; pick another")
    const moved = visit.status === "scheduled"
    await ctx.db.update(s.visit).set({ status: "scheduled", personId: slot.personId, scheduledOn: input.day, startTime: null, stopOrder: null, awaitingPick: false, exception: null, notDoneReason: null }).where(eq(s.visit.id, visit.id))
    await recordChange(ctx, { customerId: visit.customerId, passId: visit.passId, visitId: visit.id, kind: "day-picked", eventKind: moved ? "visit.moved" : "visit.scheduled", detail: { visit: visit.kind, name: visitName(visit.kind), day: input.day, person: slot.personName, personId: slot.personId, from: moved ? visit.scheduledOn : null } })
    // `recordChange` above writes the event (who is the customer); the outbound webhook does not record it a second time.
    await emitEvent(ctx.db, ctx.organizationId, moved ? "visit.moved" : "visit.scheduled", { visitId: visit.id, ...who(slot.personId), scheduledOn: input.day, from: moved ? { ...who(visit.personId), scheduledOn: visit.scheduledOn } : null })
    await queueDateMessage(ctx.db, visit, moved ? "date-moved" : "date-set", input.day)
    return visitOut(ctx, await loadVisit(ctx, visit.id))
  },
})
