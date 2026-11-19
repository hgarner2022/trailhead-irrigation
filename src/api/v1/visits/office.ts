import "server-only"
import { and, eq, inArray, notInArray } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { KIND_MINUTES, NOT_DONE_REASONS, OFFICE_KINDS } from "@/lib/admin/visit-defaults"
import { visitName } from "@/lib/events/names"
import { recordEvent, whoOf } from "@/lib/events/record"
import { enqueueGeocode } from "@/lib/geocode"
import { defaultVisitPrice, jobSubtotal, LINE_NAMES, lineForVisitKind } from "@/lib/jobs/lines"
import { cancelVisitLines, deleteVisitLines, insertLines, setVisitLinePrice } from "@/lib/jobs/write-lines"
import { loadVisitPrice } from "@/lib/money/record"
import { orderDay } from "@/lib/scheduling/server/order-day"
import { ApiError, notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { customerFields, propertyInput } from "../customers/schemas"
import { cleanText } from "@/lib/format/contact"
import { cleanContact, cleanYard } from "../customers/handlers"
import { recordChange } from "../passes/queries"
import { routePeople } from "../people/handlers"
import { Day, Id, today } from "../shared"
import { eventsOfJson, newestNoteText } from "../events/queries"
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
  summary: "The visit was not done. The reason is kept on the change log; the visit goes back to Unscheduled, the person's day is ordered again, and nothing is charged.",
  input: z.object({ id: Id, reason: z.enum(NOT_DONE_REASONS), note: z.string().trim().max(300).optional() }),
  output: VisitOut,
  async run(ctx, input) {
    const { visit } = await loadOpen(ctx, input.id, "marked not done")
    if (visit.status !== "scheduled") throw new ApiError("unprocessable", "This visit has no day yet, so there is nothing to mark not done")
    if (input.reason === "other" && !input.note) throw new ApiError("invalid", "Say what happened when the reason is something else", [{ path: "note", message: "Add a short note" }])
    await ctx.db.update(s.visit).set({ status: "unscheduled", personId: null, scheduledOn: null, startTime: null, stopOrder: null, awaitingPick: false, notDoneReason: input.reason }).where(eq(s.visit.id, visit.id))
    if (visit.personId && visit.scheduledOn) await orderDay(ctx.db, { personId: visit.personId, day: visit.scheduledOn })
    await recordChange(ctx, { customerId: visit.customerId, jobId: visit.jobId, visitId: visit.id, kind: "not-done", detail: { name: visitName(visit.kind), reason: input.reason, note: input.note ?? null, day: visit.scheduledOn, personId: visit.personId } })
    return visitOut(ctx, await loadVisit(ctx, visit.id))
  },
})

export const visitsUpdate = defineHandler({
  name: "visits.update",
  method: "PATCH",
  path: "/visits/{id}",
  scope: "write",
  summary: "Change a visit's minutes, price, person or notes, and the access note of the visit's property. A new person must be on the schedule and work the visit's weekday. A price edits the visit's line.",
  input: z.object({
    id: Id,
    durationMinutes: z.number().int().min(15).max(480).multipleOf(15).optional(),
    price: z.number().int().min(0).max(100000).optional().describe("Whole dollars: reprices the visit's line (a visit with no line gets one); the visit's price is its line's."),
    personId: Id.optional().describe("Who takes the visit; it needs a day first."),
    truckId: PersonIdAlias,
    notes: z.string().trim().max(1000).optional().describe("Adds a note to the visit's story (an event of kind note); a note is never edited or cleared, and the text of the newest one is what `notes` reads."),
    accessNote: z.string().trim().max(500).optional().describe("Lands on the visit's property: gate code, dog, where the controller is."),
    unscheduled: z.literal(true).optional().describe("Take the visit back to Unscheduled: the undo of giving it a day."),
  }),
  output: VisitOut,
  async run(ctx, input) {
    const { visit, events } = await loadOpen(ctx, input.id, "edited")
    const changed: Record<string, unknown> = {}
    const set: Partial<typeof s.visit.$inferInsert> = {}
    if (input.durationMinutes !== undefined && input.durationMinutes !== visit.durationMinutes) {
      set.durationMinutes = input.durationMinutes
      changed.durationMinutes = { from: visit.durationMinutes, to: input.durationMinutes }
    }
    // Notes are added, never edited: new text is a `note` event (written below), and the same text as the newest note is not a new one.
    const noteText = input.notes && input.notes !== newestNoteText(eventsOfJson(ctx, events)) ? input.notes : undefined
    if (input.price !== undefined) {
      // The visit's price is its line's: this edits the line (making one when the visit has none).
      // `input.price` is the line's own price, so it is compared with the visit's lines before tax.
      const before = jobSubtotal(await ctx.db.select().from(s.lineItem).where(and(eq(s.lineItem.organizationId, ctx.organizationId), eq(s.lineItem.visitId, visit.id))))
      await setVisitLinePrice(ctx.db, visit, input.price, ctx.now)
      if (input.price !== before) changed.price = { from: before, to: input.price }
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
      // The property holds the yard's access note, for a pass and a one-off alike.
      await ctx.db.update(s.property).set({ accessNote: input.accessNote || null, updatedAt: ctx.now }).where(and(eq(s.property.id, visit.propertyId), eq(s.property.organizationId, ctx.organizationId)))
      changed.accessNote = true
    }
    if (Object.keys(set).length) await ctx.db.update(s.visit).set(set).where(eq(s.visit.id, visit.id))
    for (const r of reorder) await orderDay(ctx.db, r)
    if (noteText) await recordEvent(ctx.db, { organizationId: ctx.organizationId, about: "visit", aboutId: visit.id, customerId: visit.customerId, jobId: visit.jobId, visitId: visit.id, kind: "note", detail: { text: noteText }, who: whoOf(ctx), at: ctx.now })
    if (Object.keys(changed).length) await recordChange(ctx, { customerId: visit.customerId, jobId: visit.jobId, visitId: visit.id, kind: "visit-edited", detail: { name: visitName(visit.kind), ...changed } })
    return visitOut(ctx, await loadVisit(ctx, visit.id))
  },
})

export const visitsCancel = defineHandler({
  name: "visits.cancel",
  method: "POST",
  path: "/visits/{id}/cancel",
  scope: "write",
  summary: "Cancel one visit. Its day is freed and a charge not yet made is not made. A pass's other visits stay; a job with no visit left is canceled with it.",
  input: z.object({ id: Id, reason: z.string().trim().max(300).optional() }),
  output: VisitOut,
  async run(ctx, input) {
    const { visit, isPassVisit } = await loadOpen(ctx, input.id, "cancelled")
    // What it gave up, read before its line is canceled.
    const gaveUp = await loadVisitPrice(ctx.db, ctx.organizationId, visit.id)
    await ctx.db.update(s.visit).set({ status: "cancelled", personId: null, scheduledOn: null, startTime: null, stopOrder: null, awaitingPick: false }).where(eq(s.visit.id, visit.id))
    await cancelVisitLines(ctx.db, [visit.id], ctx.now)
    if (visit.personId && visit.scheduledOn) await orderDay(ctx.db, { personId: visit.personId, day: visit.scheduledOn })
    // A charge asked for but not yet made: leave it undone (the charge task also refuses a canceled visit).
    await ctx.db.update(s.queueItem).set({ status: "done", lastError: "visit canceled", doneAt: ctx.now }).where(and(eq(s.queueItem.kind, "pass-charge"), eq(s.queueItem.key, visit.id), eq(s.queueItem.status, "pending")))
    await ctx.db.update(s.adminAlert).set({ resolvedAt: ctx.now }).where(and(eq(s.adminAlert.organizationId, ctx.organizationId), eq(s.adminAlert.kind, "unplaced"), eq(s.adminAlert.key, visit.id)))
    if (!isPassVisit) {
      const left = await ctx.db.select({ id: s.visit.id }).from(s.visit).where(and(eq(s.visit.jobId, visit.jobId), notInArray(s.visit.status, ["cancelled", "skipped"])))
      if (left.length === 0) {
        await ctx.db.update(s.job).set({ cancelledAt: ctx.now }).where(eq(s.job.id, visit.jobId))
        await recordEvent(ctx.db, { organizationId: ctx.organizationId, about: "job", aboutId: visit.jobId, customerId: visit.customerId, jobId: visit.jobId, kind: "job.cancelled", detail: {}, who: whoOf(ctx), at: ctx.now })
      }
    }
    await recordChange(ctx, { customerId: visit.customerId, jobId: visit.jobId, visitId: visit.id, kind: "visit-cancelled", detail: { name: visitName(visit.kind), reason: input.reason ?? null, day: visit.scheduledOn, amount: gaveUp } })
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
  summary: "Add a visit for work taken by phone: makes the job (kind repair, install or other, source office), its first visit and the job's one line from the service of that kind. Give an existing customer or a new one. With a day it goes through the same rules as a move and the customer is texted the date; with none it waits as Unscheduled. Minutes default from the kind, the price from the service when it has a fixed one (a repair visit), the person from the first on the schedule (the owner, else by name).",
  input: z.object({
    jobId: Id.optional().describe("Add the visit to this open job (its customer and property are the job's) instead of making a new job; a Season Pass takes no visit this way."),
    customerId: Id.optional(),
    propertyId: Id.optional().describe("One of the customer's properties; the first when left out."),
    newCustomer: NewCustomer.optional(),
    kind: z.enum(OFFICE_KINDS).optional().describe("Left out when `serviceKey` is given: the service's own kind is used."),
    serviceKey: z.string().min(2).max(40).optional().describe("The catalogue service the job is for (services.list); its kind, minutes, price and description are used unless the call gives its own."),
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
    if (input.jobId && (input.customerId || input.newCustomer || input.propertyId)) throw new ApiError("invalid", "A visit added to a job is for that job's customer", [{ path: "jobId", message: "Leave the customer out when you give a jobId" }])
    if (!input.jobId && !input.customerId === !input.newCustomer) throw new ApiError("invalid", "Choose an existing customer or add a new one", [{ path: "customerId", message: "Give a customer or a newCustomer, not both" }])
    if (!input.kind && !input.serviceKey) throw new ApiError("invalid", "Choose what the job is for", [{ path: "serviceKey", message: "Give a serviceKey or a kind" }])
    if (input.startTime && !input.scheduledOn) throw new ApiError("invalid", "Choose a day for that time", [{ path: "scheduledOn", message: "A time needs a day" }])
    const org = ctx.organizationId
    // The service is checked before any customer row is made, so a refused service leaves nothing behind.
    let service: typeof s.service.$inferSelect | undefined
    if (input.serviceKey) {
      ;[service] = await ctx.db.select().from(s.service).where(and(eq(s.service.organizationId, org), eq(s.service.key, input.serviceKey)))
      if (!service || !service.active) throw new ApiError("invalid", "That service is not offered", [{ path: "serviceKey", message: "No active service has that key" }])
      if (input.kind && input.kind !== service.kind) throw new ApiError("invalid", "kind does not match the service", [{ path: "kind", message: "kind does not match the service" }])
    }
    let customerId = input.customerId!
    let propertyId: string
    let created: { customerId: string; propertyId: string } | null = null
    let existingJob: typeof s.job.$inferSelect | undefined
    if (input.jobId) {
      ;[existingJob] = await ctx.db.select().from(s.job).where(and(eq(s.job.id, input.jobId), eq(s.job.organizationId, org)))
      if (!existingJob) throw notFound("Job")
      if (existingJob.cancelledAt) throw new ApiError("unprocessable", "This job is canceled, so it takes no more visits")
      // A job with a season is a Season Pass.
      if (existingJob.season !== null) throw new ApiError("unprocessable", "A Season Pass gets its visits from the pass: add an inspection to it")
      // One visit of each pass kind to a job (the visit_job_pass_kind_unique index says the same), so a second is refused with a plain word.
      if ((["turn-on", "inspection", "blowout"] as string[]).includes(input.kind ?? service?.kind ?? "")) {
        const [again] = await ctx.db.select({ id: s.visit.id }).from(s.visit).where(and(eq(s.visit.jobId, existingJob.id), eq(s.visit.kind, (input.kind ?? service?.kind) as "turn-on")))
        if (again) throw new ApiError("unprocessable", `This job already has a ${input.kind ?? service?.kind} visit.`)
      }
      customerId = existingJob.customerId
      propertyId = existingJob.propertyId
    } else if (input.newCustomer) {
      const { property, accessNote, ...fields } = input.newCustomer
      const [c] = await ctx.db.insert(s.customer).values({ organizationId: org, ...fields, ...cleanContact(fields), leadSource: "office" }).returning()
      const [p] = await ctx.db.insert(s.property).values({ organizationId: org, customerId: c!.id, address: property.address, town: property.town, ...cleanYard(property), ...(accessNote ? { accessNote: cleanText(accessNote) } : {}) }).returning()
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
    const kind = service ? service.kind : input.kind!
    const price = input.price ?? (service ? (service.price ?? undefined) : defaultVisitPrice(kind as (typeof OFFICE_KINDS)[number]))
    const [job] = existingJob
      ? [existingJob]
      : await ctx.db
          .insert(s.job)
          .values({ organizationId: org, customerId, propertyId, source: "office", soldOn: today(ctx) })
          .returning()
    const [made] = await ctx.db
      .insert(s.visit)
      .values({ organizationId: org, jobId: job!.id, customerId, propertyId, kind, status: "unscheduled", durationMinutes: input.durationMinutes ?? service?.slotMinutes ?? KIND_MINUTES[kind as (typeof OFFICE_KINDS)[number]] })
      .returning({ id: s.visit.id })
    const line = service ? { name: LINE_NAMES[service.kind] ?? service.name, description: service.description, quantity: 1, unitPrice: price ?? 0, taxable: service.taxable, serviceKey: service.key, visitKind: kind } : lineForVisitKind(kind, price ?? 0)
    await insertLines(ctx.db, { organizationId: org, jobId: job!.id, now: ctx.now }, [{ ...line, visitId: made!.id }])
    if (input.scheduledOn) {
      try {
        await placeVisit(ctx, { id: made!.id, personId: personId!, scheduledOn: input.scheduledOn, startTime: input.startTime })
      } catch (error) {
        // A refused day leaves nothing behind: the line, the visit, its job and a customer made for it are taken back.
        await deleteVisitLines(ctx.db, [made!.id])
        await ctx.db.delete(s.visit).where(eq(s.visit.id, made!.id))
        if (!existingJob) await ctx.db.delete(s.job).where(eq(s.job.id, job!.id))
        if (created) {
          await ctx.db.delete(s.queueItem).where(and(eq(s.queueItem.kind, "geocode"), inArray(s.queueItem.key, [created.propertyId])))
          await ctx.db.delete(s.property).where(eq(s.property.id, created.propertyId))
          await ctx.db.delete(s.customer).where(eq(s.customer.id, created.customerId))
        }
        throw error
      }
    }
    await recordChange(ctx, { customerId, jobId: job!.id, visitId: made!.id, kind: "visit-created", detail: { job: job!.id, source: "office", name: line.name, kind, day: input.scheduledOn ?? null } })
    if (input.notes) await recordEvent(ctx.db, { organizationId: org, about: "job", aboutId: job!.id, customerId, jobId: job!.id, visitId: made!.id, kind: "note", detail: { text: input.notes }, who: whoOf(ctx), at: ctx.now })
    return visitOut(ctx, await loadVisit(ctx, made!.id))
  },
})
