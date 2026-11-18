import "server-only"
import { and, desc, eq, inArray, isNull, notInArray } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { ApiError, notFound, notImplemented } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { afterTimeCursor, cursorPage, page, pageInput, timeCursor } from "../../core/pagination"
import { Day, Id, idInput, Iso } from "../shared"
import { consentInput, customerFields, propertyInput } from "../customers/schemas"
import { getCustomerRow } from "../customers/handlers"
import { visitName } from "@/lib/events/names"
import { recordEvent, whoOf } from "@/lib/events/record"
import { linesOfVisit, visitPrice } from "@/lib/jobs/lines"
import { emitEvent } from "../webhooks/deliver"

export const bookingsCreate = defineHandler({
  name: "bookings.create",
  method: "POST",
  path: "/bookings",
  scope: "write",
  checkout: true,
  status: 201,
  summary: "Book a service into an open slot: the booking form's write. Needs the slot model and messaging (Phase 13); not implemented yet.",
  input: z.object({
    serviceKey: z.string().min(1),
    day: Day,
    personId: Id.optional().describe("Who takes the visit, from the slot."),
    truckId: Id.optional().describe("Alias of personId, kept for one season: the same id."),
    customer: z.object({ ...customerFields, email: z.email() }),
    property: propertyInput,
    zones: z.number().int().min(1).max(16).optional(),
    accessConfirmed: z.boolean().default(false),
    notes: z.string().max(1000).optional(),
    consent: consentInput.extend({ termsAccepted: z.literal(true) }),
  }),
  output: z.object({ id: Id, status: z.enum(["booked", "cancelled"]), visitId: Id }),
  async run() {
    throw notImplemented("bookings.create")
  },
})

export const bookingsCancel = defineHandler({
  name: "bookings.cancel",
  method: "POST",
  path: "/bookings/{id}/cancel",
  scope: "write",
  summary: "Cancel a job booked by the office or the site (its id, or the old booking id) and its visits that have not happened.",
  input: idInput,
  output: z.object({ id: Id, status: z.literal("cancelled"), cancelledVisits: z.number().int() }),
  async run(ctx, input) {
    // A job's id, or a booking's old id: the backfill made job_<booking id>.
    const [row] = await ctx.db.select().from(s.job).where(and(inArray(s.job.id, [input.id, `job_${input.id}`]), eq(s.job.organizationId, ctx.organizationId)))
    if (!row) throw notFound("Booking")
    const wasCancelled = row.cancelledAt !== null
    // The visits that still count, read before they change, so each event carries the day it gave up.
    const open = await ctx.db
      .select({ id: s.visit.id, kind: s.visit.kind, scheduledOn: s.visit.scheduledOn })
      .from(s.visit)
      .where(and(eq(s.visit.jobId, row.id), eq(s.visit.organizationId, ctx.organizationId), notInArray(s.visit.status, ["completed", "cancelled"])))
    // What each gave up is its own lines' total, read before the lines are cancelled.
    const lines = await ctx.db.select().from(s.lineItem).where(and(eq(s.lineItem.jobId, row.id), eq(s.lineItem.organizationId, ctx.organizationId)))
    await ctx.db.update(s.job).set({ cancelledAt: ctx.now }).where(eq(s.job.id, row.id))
    // Job-wide, so a line with no visit (a backfilled one-off) goes too; a line already cancelled keeps its time.
    await ctx.db.update(s.lineItem).set({ cancelledAt: ctx.now, updatedAt: ctx.now }).where(and(eq(s.lineItem.jobId, row.id), isNull(s.lineItem.cancelledAt)))
    const cancelled = await ctx
      .db.update(s.visit)
      .set({ status: "cancelled", personId: null, scheduledOn: null, startTime: null, stopOrder: null })
      .where(and(eq(s.visit.jobId, row.id), notInArray(s.visit.status, ["completed", "cancelled"])))
      .returning({ id: s.visit.id })
    for (const v of open.filter((o) => cancelled.some((c) => c.id === o.id)))
      await recordEvent(ctx.db, { organizationId: ctx.organizationId, about: "visit", aboutId: v.id, customerId: row.customerId, jobId: row.id, visitId: v.id, kind: "visit.cancelled", detail: { name: visitName(v.kind), reason: null, day: v.scheduledOn, amount: visitPrice(linesOfVisit(lines, v.id)) }, who: whoOf(ctx), at: ctx.now })
    if (!wasCancelled) await recordEvent(ctx.db, { organizationId: ctx.organizationId, about: "job", aboutId: row.id, customerId: row.customerId, jobId: row.id, kind: "job.cancelled", detail: {}, who: whoOf(ctx), at: ctx.now })
    return { id: row.id, status: "cancelled" as const, cancelledVisits: cancelled.length }
  },
})

const QuoteRequestOut = z.object({
  id: Id,
  customerId: Id,
  propertyId: Id.nullable(),
  serviceKey: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.enum(["new", "quoted", "archived"]),
  createdAt: Iso,
})

async function quoteOut(ctx: { db: import("@/db/types").Database }, row: typeof s.quoteRequest.$inferSelect) {
  let serviceKey: string | null = null
  if (row.serviceId) {
    const [svc] = await ctx.db.select({ key: s.service.key }).from(s.service).where(eq(s.service.id, row.serviceId))
    serviceKey = svc?.key ?? null
  }
  return { id: row.id, customerId: row.customerId, propertyId: row.propertyId, serviceKey, notes: row.notes, status: row.status, createdAt: row.createdAt.toISOString() }
}

export const quoteRequestsCreate = defineHandler({
  name: "quoteRequests.create",
  method: "POST",
  path: "/quote-requests",
  scope: "write",
  status: 201,
  summary: "Record a request for a quote on work that is priced by visit, for a customer already on file.",
  input: z.object({ customerId: Id, propertyId: Id.optional(), serviceKey: z.string().optional(), notes: z.string().max(2000).optional() }),
  output: QuoteRequestOut,
  async run(ctx, input) {
    await getCustomerRow(ctx, input.customerId)
    if (input.propertyId) {
      const [property] = await ctx.db.select().from(s.property).where(and(eq(s.property.id, input.propertyId), eq(s.property.customerId, input.customerId)))
      if (!property) throw new ApiError("unprocessable", "That property does not belong to this customer")
    }
    let serviceId: string | undefined
    if (input.serviceKey) {
      const [svc] = await ctx.db.select().from(s.service).where(and(eq(s.service.organizationId, ctx.organizationId), eq(s.service.key, input.serviceKey)))
      if (!svc) throw notFound("Service")
      if (!svc.active) throw new ApiError("unprocessable", "This service is not offered")
      serviceId = svc.id
    }
    const [row] = await ctx.db.insert(s.quoteRequest).values({ organizationId: ctx.organizationId, customerId: input.customerId, propertyId: input.propertyId, serviceId, notes: input.notes }).returning()
    await emitEvent(ctx.db, ctx.organizationId, "request.received", { quoteRequestId: row!.id, customerId: input.customerId })
    return quoteOut(ctx, row!)
  },
})

export const quoteRequestsList = defineHandler({
  name: "quoteRequests.list",
  method: "GET",
  path: "/quote-requests",
  scope: "read",
  summary: "List quote requests, newest first.",
  input: z.object({ status: z.enum(["new", "quoted", "archived"]).optional(), ...pageInput }),
  output: page(QuoteRequestOut),
  async run(ctx, input) {
    const rows = await ctx.db
      .select()
      .from(s.quoteRequest)
      .where(and(eq(s.quoteRequest.organizationId, ctx.organizationId), input.status ? eq(s.quoteRequest.status, input.status) : undefined, afterTimeCursor(s.quoteRequest.createdAt, s.quoteRequest.id, input.cursor)))
      .orderBy(desc(s.quoteRequest.createdAt), desc(s.quoteRequest.id))
      .limit(input.limit + 1)
    const result = cursorPage(rows, input.limit, timeCursor)
    return { data: await Promise.all(result.data.map((r) => quoteOut(ctx, r))), next_cursor: result.next_cursor }
  },
})

