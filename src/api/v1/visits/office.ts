import "server-only"
import { and, eq, inArray, notInArray } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { KIND_MINUTES, NOT_DONE_REASONS, OFFICE_KINDS } from "@/lib/admin/visit-defaults"
import { enqueueGeocode } from "@/lib/geocode"
import { defaultVisitPrice, lineForVisitKind } from "@/lib/jobs/lines"
import { cancelVisitLines, deleteVisitLines, insertLines, setVisitLinePrice } from "@/lib/jobs/write-lines"
import { syncPassJob } from "@/lib/pass/server/job"
import { orderDay } from "@/lib/scheduling/server/order-day"
import { ApiError, notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { customerFields, propertyInput } from "../customers/schemas"
import { cleanContact } from "../customers/handlers"
import { recordChange } from "../passes/queries"
import { routePeople } from "../people/handlers"
import { Day, Id } from "../shared"
import { loadVisit, visitOut } from "./queries"
import { VisitOut } from "./schemas"
import { assignee, PersonIdAlias, placeVisit } from "./handlers"

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
  summary: "The visit was not done. The reason is kept on the change log; the visit goes back to Needs a day, the person's day is ordered again, and nothing is charged.",
  input: z.object({ id: Id, reason: z.enum(NOT_DONE_REASONS), note: z.string().trim().max(300).optional() }),
  output: VisitOut,
  async run(ctx, input) {
    const { visit } = await loadOpen(ctx, input.id, "marked not done")
    if (visit.status !== "scheduled") throw new ApiError("unprocessable", "This visit has no day yet, so there is nothing to mark not done")
    if (input.reason === "other" && !input.note) throw new ApiError("invalid", "Say what happened when the reason is something else", [{ path: "note", message: "Add a short note" }])
    await ctx.db.update(s.visit).set({ status: "unscheduled", personId: null, scheduledOn: null, startTime: null, stopOrder: null, awaitingPick: false, notDoneReason: input.reason }).where(eq(s.visit.id, visit.id))
    if (visit.personId && visit.scheduledOn) await orderDay(ctx.db, { personId: visit.personId, day: visit.scheduledOn })
    await recordChange(ctx, { customerId: visit.customerId, passId: visit.passId, visitId: visit.id, kind: "not-done", detail: { reason: input.reason, note: input.note ?? null, day: visit.scheduledOn, personId: visit.personId } })
    return visitOut(ctx, await loadVisit(ctx, visit.id))
  },
})

export const visitsUpdate = defineHandler({
  name: "visits.update",
  method: "PATCH",
  path: "/visits/{id}",
  scope: "write",
  summary: "Change a visit's minutes, price, person or notes, and for a pass visit the pass's access note. A new person must be on the schedule and work the visit's weekday. A price edits the visit's line.",
  input: z.object({
    id: Id,
    durationMinutes: z.number().int().min(15).max(480).multipleOf(15).optional(),
    price: z.number().int().min(0).max(100000).optional().describe("Whole dollars: reprices the visit's line (and the visit's amount), never the job's old price column."),
    personId: Id.optional().describe("Who takes the visit; it needs a day first."),
    truckId: PersonIdAlias,
    notes: z.string().trim().max(1000).optional().describe("An empty string clears the notes."),
    accessNote: z.string().trim().max(500).optional().describe("Pass visits only: gate code, dog, where the controller is."),
    unscheduled: z.literal(true).optional().describe("Take the visit back to Needs a day: the undo of giving it a day."),
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
    if (input.price !== undefined) {
      await setVisitLinePrice(ctx.db, visit, input.price, ctx.now)
      if (input.price !== visit.amount) {
        set.amount = input.price
        changed.price = { from: visit.amount, to: input.price }
      }
    }
    let reorder: { personId: string; day: string }[] = []
    if (input.unscheduled) {
      if (visit.status !== "scheduled") throw new ApiError("unprocessable", "This visit has no day to take back")
      Object.assign(set, { status: "unscheduled", personId: null, scheduledOn: null, startTime: null, stopOrder: null })
      changed.unscheduled = { from: visit.scheduledOn }
      if (visit.personId && visit.scheduledOn) reorder = [{ personId: visit.personId, day: visit.scheduledOn }]
    }
    const wanted = input.personId ?? input.truckId
    if (wanted && wanted !== visit.personId && !input.unscheduled) {
      if (!visit.scheduledOn) throw new ApiError("unprocessable", "Give this visit a day before choosing who takes it")
      const person = await assignee(ctx, { personId: wanted }, visit.scheduledOn, visit.personId)
      if (person.id !== visit.personId) {
        set.personId = person.id
        set.startTime = null
        set.stopOrder = null
        changed.personId = { from: visit.personId, to: person.id }
        reorder = [{ personId: person.id, day: visit.scheduledOn }, ...(visit.personId ? [{ personId: visit.personId, day: visit.scheduledOn }] : [])]
      }
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
    await ctx.db.update(s.visit).set({ status: "cancelled", personId: null, scheduledOn: null, startTime: null, stopOrder: null, awaitingPick: false }).where(eq(s.visit.id, visit.id))
    await cancelVisitLines(ctx.db, [visit.id], ctx.now)
    if (visit.personId && visit.scheduledOn) await orderDay(ctx.db, { personId: visit.personId, day: visit.scheduledOn })
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
  summary: "Add a visit for work taken by phone: makes the job (kind repair, install or other, source office), its first visit and the job's one line from the service of that kind. Give an existing customer or a new one. With a day it goes through the same rules as a move and the customer is texted the date; with none it waits as Needs a day. Minutes default from the kind, the price from the service when it has a fixed one (a repair visit), the person from the first on the schedule (the owner, else by name).",
  input: z.object({
    customerId: Id.optional(),
    propertyId: Id.optional().describe("One of the customer's properties; the first when left out."),
    newCustomer: NewCustomer.optional(),
    kind: z.enum(OFFICE_KINDS),
    scheduledOn: Day.optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().describe("Left out means any time that day."),
    durationMinutes: z.number().int().min(15).max(480).multipleOf(15).optional(),
    personId: Id.optional().describe("Who takes the visit, used only with scheduledOn; left out, the first person on the schedule."),
    truckId: PersonIdAlias.describe("Alias of personId, kept for one season: the same id (the old truck id is still understood); used only with scheduledOn."),
    price: z.number().int().min(0).max(100000).optional().describe("Whole dollars; left out, the service's fixed price when it has one (a repair visit is $145), else quote later."),
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
    let personId = input.personId ?? input.truckId
    if (input.scheduledOn && !personId) {
      // The default assignee: the first person on the schedule, the owner before anyone else.
      personId = (await routePeople(ctx))[0]?.id
      if (!personId) throw new ApiError("unprocessable", "No one is on the schedule to take this visit")
    }
    // The price is the office's, else the service's fixed price (a repair visit), else none until quoted.
    const price = input.price ?? defaultVisitPrice(input.kind)
    const [job] = await ctx.db
      .insert(s.job)
      .values({ organizationId: org, customerId, propertyId, kind: input.kind === "repair" || input.kind === "install" ? input.kind : "other", status: "active", price: price ?? null, source: "office", notes: input.notes || null })
      .returning()
    const [made] = await ctx.db
      .insert(s.visit)
      .values({ organizationId: org, jobId: job!.id, customerId, propertyId, kind: input.kind, amount: price ?? 0, status: "unscheduled", durationMinutes: input.durationMinutes ?? KIND_MINUTES[input.kind], notes: input.notes || null })
      .returning({ id: s.visit.id })
    await insertLines(ctx.db, { organizationId: org, jobId: job!.id, now: ctx.now }, [{ ...lineForVisitKind(input.kind, price ?? 0), visitId: made!.id }])
    if (input.scheduledOn) {
      try {
        await placeVisit(ctx, { id: made!.id, personId: personId!, scheduledOn: input.scheduledOn, startTime: input.startTime })
      } catch (error) {
        // A refused day leaves nothing behind: the line, the visit, its job and a customer made for it are taken back.
        await deleteVisitLines(ctx.db, [made!.id])
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
