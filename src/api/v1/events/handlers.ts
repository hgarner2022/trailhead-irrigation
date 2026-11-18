import "server-only"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { hasScope } from "@/lib/auth/principal"
import { EVENT_ABOUT } from "@/lib/events/kinds"
import { recordEvent, whoOf } from "@/lib/events/record"
import { ApiError, notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { page, pageInput } from "../../core/pagination"
import { Id } from "../shared"
import { eventOut, loadEvents, whoNameOf } from "./queries"
import { EventOut, NOTE_TEXT_MAX } from "./schemas"

export const eventsList = defineHandler({
  name: "events.list", method: "GET", path: "/events", scope: "read",
  summary: "The story of a customer, a job, a visit or any one record: what happened and every note, newest first. Give a customerId, a jobId, a visitId, or about and aboutId. A caller without the write scope reads only notes, the sale, the pass and the visit, with money, gate and contact fields left out.",
  input: z.object({
    customerId: Id.optional(),
    jobId: Id.optional(),
    visitId: Id.optional(),
    about: z.enum(EVENT_ABOUT).optional().describe("With aboutId: the events about this one record."),
    aboutId: Id.optional(),
    ...pageInput,
  }),
  output: page(EventOut),
  async run(ctx, input) {
    if (input.about && !input.aboutId) throw new ApiError("invalid", "Give the aboutId of the record", [{ path: "aboutId", message: "Required with about" }])
    if (input.aboutId && !input.about) throw new ApiError("invalid", "Give the kind of record it is about", [{ path: "about", message: "Required with aboutId" }])
    if (!input.customerId && !input.jobId && !input.visitId && !input.about) throw new ApiError("invalid", "Give a customerId, a jobId, a visitId, or about and aboutId")
    return loadEvents(ctx, input, { limit: input.limit, cursor: input.cursor })
  },
})

const NOTE_ABOUT = ["customer", "property", "job", "visit"] as const

export const eventsNote = defineHandler({
  name: "events.note", method: "POST", path: "/events/note", scope: "read", status: 201,
  summary: "Add a note to a customer, a property, a job or a visit. A note is an event of kind note and shows in the story; it is never sent to the customer. A tech may add one; a read-only key may not. The text of the newest note about a visit or a job is what that record's `notes` reads (there is no notes column); a note on a property is not that (the property's notes are a standing fact, edited with the property).",
  input: z.object({
    about: z.enum(NOTE_ABOUT),
    aboutId: Id,
    text: z.string().trim().min(1, "Write the note").max(NOTE_TEXT_MAX, `A note can be ${NOTE_TEXT_MAX} characters at most`),
  }),
  output: EventOut,
  async run(ctx, input) {
    // Scope `read` lets a tech in; the check below keeps a read-only key out: a note needs the write scope or a signed-in person of the organization.
    const p = ctx.principal
    if (!hasScope(p, "write") && !(p.kind === "person" && p.type === "admin")) throw new ApiError("forbidden", "A read key cannot add notes")
    const org = ctx.organizationId
    let customerId: string
    let jobId: string | null = null
    let visitId: string | null = null
    if (input.about === "customer") {
      const [row] = await ctx.db.select({ id: s.customer.id }).from(s.customer).where(and(eq(s.customer.id, input.aboutId), eq(s.customer.organizationId, org)))
      if (!row) throw notFound("Customer")
      customerId = row.id
    } else if (input.about === "property") {
      const [row] = await ctx.db.select({ customerId: s.property.customerId }).from(s.property).where(and(eq(s.property.id, input.aboutId), eq(s.property.organizationId, org)))
      if (!row) throw notFound("Property")
      customerId = row.customerId
    } else if (input.about === "job") {
      const [row] = await ctx.db.select({ customerId: s.job.customerId }).from(s.job).where(and(eq(s.job.id, input.aboutId), eq(s.job.organizationId, org)))
      if (!row) throw notFound("Job")
      customerId = row.customerId
      jobId = input.aboutId
    } else {
      const [row] = await ctx.db.select({ customerId: s.visit.customerId, jobId: s.visit.jobId }).from(s.visit).where(and(eq(s.visit.id, input.aboutId), eq(s.visit.organizationId, org)))
      if (!row) throw notFound("Visit")
      customerId = row.customerId
      jobId = row.jobId
      visitId = input.aboutId
    }
    const who = whoOf(ctx)
    const id = await recordEvent(ctx.db, { organizationId: org, about: input.about, aboutId: input.aboutId, customerId, jobId, visitId, kind: "note", detail: { text: input.text }, who, at: ctx.now })
    const [row] = await ctx.db.select().from(s.event).where(and(eq(s.event.id, id), eq(s.event.organizationId, org)))
    return eventOut(ctx, row!, await whoNameOf(ctx, who))!
  },
})
