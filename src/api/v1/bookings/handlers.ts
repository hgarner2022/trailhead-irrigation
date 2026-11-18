import "server-only"
import { and, eq, inArray, isNull, notInArray } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { notFound, notImplemented } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { Day, Id, idInput } from "../shared"
import { consentInput, customerFields, propertyInput } from "../customers/schemas"
import { visitName } from "@/lib/events/names"
import { recordEvent, whoOf } from "@/lib/events/record"
import { linesOfVisit, visitPrice } from "@/lib/jobs/lines"

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
