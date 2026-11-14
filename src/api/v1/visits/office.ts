import "server-only"
import { and, eq, inArray, notInArray } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { KIND_MINUTES, NOT_DONE_REASONS, OFFICE_KINDS } from "@/lib/admin/visit-defaults"
import { enqueueGeocode } from "@/lib/geocode"
import { syncPassJob } from "@/lib/pass/server/job"
import { orderDay } from "@/lib/scheduling/server/order-day"
import { ApiError, notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { customerFields, propertyInput } from "../customers/schemas"
import { cleanContact } from "../customers/handlers"
import { recordChange } from "../passes/queries"
import { Day, Id, weekdayOf } from "../shared"
import { loadVisit, visitOut } from "./queries"
import { VisitOut } from "./schemas"
import { placeVisit } from "./handlers"

const OPEN_STATES = ["unscheduled", "scheduled"] as const

async function loadOpen(ctx: Parameters<typeof loadVisit>[0], id: string, what: string) {
  const row = await loadVisit(ctx, id)
  if (!(OPEN_STATES as readonly string[]).includes(row.visit.status)) throw new ApiError("unprocessable", `A ${row.visit.status} visit cannot be ${what}`)
  return row
}

export const visitsMarkNotDone = defineHandler({
  name: "visits.markNotDone",
  method: "POST",
  path: "/visits/{id}/not-done",
  scope: "write",
  summary: "The visit was not done. The reason is kept on the change log; the visit goes back to Needs a day, its truck-day is ordered again, and nothing is charged.",
  input: z.object({ id: Id, reason: z.enum(NOT_DONE_REASONS), note: z.string().trim().max(300).optional() }),
  output: VisitOut,
  async run(ctx, input) {
    const { visit } = await loadOpen(ctx, input.id, "marked not done")
    if (visit.status !== "scheduled") throw new ApiError("unprocessable", "This visit has no day yet, so there is nothing to mark not done")
    if (input.reason === "other" && !input.note) throw new ApiError("invalid", "Say what happened when the reason is something else", [{ path: "note", message: "Add a short note" }])
    await ctx.db.update(s.visit).set({ status: "unscheduled", truckId: null, scheduledOn: null, startTime: null, stopOrder: null, awaitingPick: false }).where(eq(s.visit.id, visit.id))
    if (visit.truckId && visit.scheduledOn) await orderDay(ctx.db, { truckId: visit.truckId, day: visit.scheduledOn })
    await recordChange(ctx, { customerId: visit.customerId, passId: visit.passId, visitId: visit.id, kind: "not-done", detail: { reason: input.reason, note: input.note ?? null, day: visit.scheduledOn, truckId: visit.truckId } })
    return visitOut(ctx, await loadVisit(ctx, visit.id))
  },
})

export const visitsUpdate = defineHandler({
  name: "visits.update",
  method: "PATCH",
  path: "/visits/{id}",
  scope: "write",
  summary: "Change a visit's minutes, truck or notes, and for a pass visit the pass's access note. A new truck must be in service and work the visit's weekday.",
  input: z.object({
    id: Id,
    durationMinutes: z.number().int().min(15).max(480).multipleOf(15).optional(),
    truckId: Id.optional(),
    notes: z.string().trim().max(1000).optional().describe("An empty string clears the notes."),
    accessNote: z.string().trim().max(500).optional().describe("Pass visits only: gate code, dog, where the controller is."),
  }),
  output: VisitOut,
  async run(ctx, input) {
    const { visit } = await loadOpen(ctx, input.id, "edited")
    const changed: Record<string, unknown> = {}
    const set: Partial<typeof s.visit.$inferInsert> = {}
    if (input.durationMinutes !== undefined && input.durationMinutes !== visit.durationMinutes) {
      set.durationMinutes = input.durationMinutes
      changed.durationMinutes = { from: visit.durationMinutes, to: input.durationMinutes }
    }
    if (input.notes !== undefined && (input.notes || null) !== visit.notes) {
      set.notes = input.notes || null
      changed.notes = true
    }
    let reorder: { truckId: string; day: string }[] = []
    if (input.truckId && input.truckId !== visit.truckId) {
      if (!visit.scheduledOn) throw new ApiError("unprocessable", "Give this visit a day before choosing its truck")
      const [truck] = await ctx.db.select().from(s.truck).where(and(eq(s.truck.id, input.truckId), eq(s.truck.organizationId, ctx.organizationId)))
      if (!truck) throw notFound("Truck")
      if (!truck.active) throw new ApiError("unprocessable", `${truck.name} is not in service`)
      if (!truck.workingDays.includes(weekdayOf(visit.scheduledOn))) throw new ApiError("unprocessable", `${truck.name} does not work on ${weekdayOf(visit.scheduledOn)}days`)
      set.truckId = truck.id
      set.startTime = null
      set.stopOrder = null
      changed.truckId = { from: visit.truckId, to: truck.id }
      reorder = [{ truckId: truck.id, day: visit.scheduledOn }, ...(visit.truckId ? [{ truckId: visit.truckId, day: visit.scheduledOn }] : [])]
    }
    if (input.accessNote !== undefined) {
      if (!visit.passId) throw new ApiError("unprocessable", "Only a pass visit has an access note")
      await ctx.db.update(s.seasonPass).set({ accessNote: input.accessNote || null }).where(eq(s.seasonPass.id, visit.passId))
      changed.accessNote = true
    }
    if (Object.keys(set).length) await ctx.db.update(s.visit).set(set).where(eq(s.visit.id, visit.id))
    for (const r of reorder) await orderDay(ctx.db, r)
    if (Object.keys(changed).length) await recordChange(ctx, { customerId: visit.customerId, passId: visit.passId, visitId: visit.id, kind: "visit-edited", detail: changed })
    return visitOut(ctx, await loadVisit(ctx, visit.id))
  },
})

export const visitsCancel = defineHandler({
  name: "visits.cancel",
  method: "POST",
  path: "/visits/{id}/cancel",
  scope: "write",
  summary: "Cancel one visit. Its day is freed and a charge not yet made is not made. A pass's other visits stay; a job with no visit left is cancelled with it.",
  input: z.object({ id: Id, reason: z.string().trim().max(300).optional() }),
  output: VisitOut,
  async run(ctx, input) {
    const { visit } = await loadOpen(ctx, input.id, "cancelled")
    await ctx.db.update(s.visit).set({ status: "cancelled", truckId: null, scheduledOn: null, startTime: null, stopOrder: null, awaitingPick: false }).where(eq(s.visit.id, visit.id))
    if (visit.truckId && visit.scheduledOn) await orderDay(ctx.db, { truckId: visit.truckId, day: visit.scheduledOn })
    // A charge asked for but not yet made: leave it undone (the charge task also refuses a cancelled visit).
    await ctx.db.update(s.queueItem).set({ status: "done", lastError: "visit cancelled", doneAt: ctx.now }).where(and(eq(s.queueItem.kind, "pass-charge"), eq(s.queueItem.key, visit.id), eq(s.queueItem.status, "pending")))
    await ctx.db.update(s.adminAlert).set({ resolvedAt: ctx.now }).where(and(eq(s.adminAlert.organizationId, ctx.organizationId), eq(s.adminAlert.kind, "unplaced"), eq(s.adminAlert.key, visit.id)))
    if (visit.passId) await syncPassJob(ctx.db, visit.passId)
    else {
      const left = await ctx.db.select({ id: s.visit.id }).from(s.visit).where(and(eq(s.visit.jobId, visit.jobId), notInArray(s.visit.status, ["cancelled", "skipped"])))
      if (left.length === 0) await ctx.db.update(s.job).set({ status: "cancelled", cancelledAt: ctx.now }).where(eq(s.job.id, visit.jobId))
    }
    await recordChange(ctx, { customerId: visit.customerId, passId: visit.passId, visitId: visit.id, kind: "visit-cancelled", detail: { reason: input.reason ?? null, day: visit.scheduledOn, amount: visit.amount } })
    return visitOut(ctx, await loadVisit(ctx, visit.id))
  },
})

const NewCustomer = z.object({ ...customerFields, lastName: z.string().min(1).max(80), property: propertyInput, accessNote: z.string().max(500).optional() })

export const visitsCreate = defineHandler({
  name: "visits.create",
  method: "POST",
  path: "/visits",
  scope: "write",
  status: 201,
  summary: "Add a visit for work taken by phone: makes the job (kind repair, install or other, source office) and its first visit. Give an existing customer or a new one. With a day it goes through the same rules as a move and the customer is texted the date; with none it waits as Needs a day. Minutes default from the kind, the truck from the first in service.",
  input: z.object({
    customerId: Id.optional(),
    propertyId: Id.optional().describe("One of the customer's properties; the first when left out."),
    newCustomer: NewCustomer.optional(),
    kind: z.enum(OFFICE_KINDS),
    scheduledOn: Day.optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().describe("Left out means any time that day."),
    durationMinutes: z.number().int().min(15).max(480).multipleOf(15).optional(),
    truckId: Id.optional(),
    price: z.number().int().min(0).max(100000).optional().describe("Whole dollars; left out means quote later."),
    notes: z.string().trim().max(1000).optional(),
  }),
  output: VisitOut,
  async run(ctx, input) {
    if (!input.customerId === !input.newCustomer) throw new ApiError("invalid", "Choose an existing customer or add a new one", [{ path: "customerId", message: "Give a customer or a newCustomer, not both" }])
    if (input.startTime && !input.scheduledOn) throw new ApiError("invalid", "Choose a day for that time", [{ path: "scheduledOn", message: "A time needs a day" }])
    const org = ctx.organizationId
    let customerId = input.customerId!
    let propertyId: string
    let created: { customerId: string; propertyId: string } | null = null
    if (input.newCustomer) {
      const { property, accessNote: _a, ...fields } = input.newCustomer
      void _a
      const [c] = await ctx.db.insert(s.customer).values({ organizationId: org, ...fields, ...cleanContact(fields), leadSource: "office" }).returning()
      const [p] = await ctx.db.insert(s.property).values({ organizationId: org, customerId: c!.id, ...property }).returning()
      await enqueueGeocode(ctx.db, org, p!.id, ctx.now)
      customerId = c!.id
      propertyId = p!.id
      created = { customerId: c!.id, propertyId: p!.id }
    } else {
      const [c] = await ctx.db.select({ id: s.customer.id }).from(s.customer).where(and(eq(s.customer.id, customerId), eq(s.customer.organizationId, org)))
      if (!c) throw notFound("Customer")
      const props = await ctx.db.select().from(s.property).where(and(eq(s.property.customerId, customerId), eq(s.property.organizationId, org)))
      const prop = input.propertyId ? props.find((p) => p.id === input.propertyId) : props[0]
      if (!prop) throw new ApiError("unprocessable", "This customer has no address on file; add one first")
      propertyId = prop.id
    }
    let truckId = input.truckId
    if (input.scheduledOn && !truckId) {
      const trucks = await ctx.db.select().from(s.truck).where(and(eq(s.truck.organizationId, org), eq(s.truck.active, true)))
      truckId = trucks.sort((a, b) => a.name.localeCompare(b.name))[0]?.id
      if (!truckId) throw new ApiError("unprocessable", "No truck is in service to put this visit on")
    }
    const [job] = await ctx.db
      .insert(s.job)
      .values({ organizationId: org, customerId, propertyId, kind: input.kind === "repair" || input.kind === "install" ? input.kind : "other", status: "active", price: input.price ?? null, source: "office", notes: input.notes || null })
      .returning()
    const [made] = await ctx.db
      .insert(s.visit)
      .values({ organizationId: org, jobId: job!.id, customerId, propertyId, kind: input.kind, amount: input.price ?? 0, status: "unscheduled", durationMinutes: input.durationMinutes ?? KIND_MINUTES[input.kind], notes: input.notes || null })
      .returning({ id: s.visit.id })
    if (input.scheduledOn) {
      try {
        await placeVisit(ctx, { id: made!.id, truckId: truckId!, scheduledOn: input.scheduledOn, startTime: input.startTime })
      } catch (error) {
        // A refused day leaves nothing behind: the visit, its job and a customer made for it are taken back.
        await ctx.db.delete(s.visit).where(eq(s.visit.id, made!.id))
        await ctx.db.delete(s.job).where(eq(s.job.id, job!.id))
        if (created) {
          await ctx.db.delete(s.queueItem).where(and(eq(s.queueItem.kind, "geocode"), inArray(s.queueItem.key, [created.propertyId])))
          await ctx.db.delete(s.property).where(eq(s.property.id, created.propertyId))
          await ctx.db.delete(s.customer).where(eq(s.customer.id, created.customerId))
        }
        throw error
      }
    }
    await recordChange(ctx, { customerId, visitId: made!.id, kind: "visit-created", detail: { job: job!.id, kind: input.kind, day: input.scheduledOn ?? null } })
    return visitOut(ctx, await loadVisit(ctx, made!.id))
  },
})
