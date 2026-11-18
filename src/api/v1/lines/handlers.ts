import "server-only"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { addJobLine, cancelLineRow, updateLineRow } from "@/lib/jobs/write-lines"
import { isPaid, jobOwed } from "@/lib/money/words"
import type { Ctx } from "../../core/context"
import { ApiError, notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { Id, iso } from "../shared"
import { recordEvent, whoOf } from "@/lib/events/record"

export const LineOut = z.object({
  id: Id, jobId: Id, visitId: Id.nullable(), name: z.string(), description: z.string().nullable(), quantity: z.number().int(),
  unitPrice: z.number().int().describe("Whole dollars; 0 reads Quote later."), taxable: z.boolean(), cancelledAt: z.string().nullable(),
  jobTotal: z.number().int().describe("What the job comes to after this change, cancelled lines left out."),
})

const out = (r: typeof s.lineItem.$inferSelect, jobTotal: number) => ({
  id: r.id, jobId: r.jobId, visitId: r.visitId, name: r.name, description: r.description, quantity: r.quantity, unitPrice: r.unitPrice, taxable: r.taxable,
  cancelledAt: iso(r.cancelledAt) ?? null, jobTotal,
})

async function jobTotalOf(ctx: Ctx, jobId: string): Promise<number> {
  const lines = await ctx.db.select().from(s.lineItem).where(and(eq(s.lineItem.jobId, jobId), eq(s.lineItem.organizationId, ctx.organizationId)))
  return lines.filter((l) => !l.cancelledAt).reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
}

/** The job a line change is for: it must be in this organization, still open, not a Season Pass (its lines follow its visits) and not paid in full. */
async function openJob(ctx: Ctx, jobId: string) {
  const [job] = await ctx.db.select().from(s.job).where(and(eq(s.job.id, jobId), eq(s.job.organizationId, ctx.organizationId)))
  if (!job) throw notFound("Job")
  if (job.status === "cancelled" || job.cancelledAt) throw new ApiError("unprocessable", "This job is cancelled, so its lines cannot change")
  if (job.kind === "pass" || job.passNumber) throw new ApiError("unprocessable", "A Season Pass changes through its own buttons: add an inspection, skip a visit or cancel the pass")
  const [lines, payments] = await Promise.all([
    ctx.db.select().from(s.lineItem).where(and(eq(s.lineItem.jobId, job.id), eq(s.lineItem.organizationId, ctx.organizationId))),
    ctx.db.select().from(s.charge).where(and(eq(s.charge.jobId, job.id), eq(s.charge.organizationId, ctx.organizationId))),
  ])
  const live = lines.filter((l) => !l.cancelledAt)
  const total = live.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
  if (total > 0 && jobOwed(live, payments) === 0) throw new ApiError("conflict", "This job is paid in full, so its lines cannot change")
  return { job, lines, payments }
}

/** A line change is refused once the visit the line is billed after is Done and paid. */
async function assertVisitOpen(ctx: Ctx, line: typeof s.lineItem.$inferSelect, payments: (typeof s.charge.$inferSelect)[]) {
  if (!line.visitId) return
  const [visit] = await ctx.db.select().from(s.visit).where(and(eq(s.visit.id, line.visitId), eq(s.visit.organizationId, ctx.organizationId)))
  if (!visit || visit.status !== "completed") return
  const own = payments.filter((p) => p.visitId === visit.id)
  const price = (await ctx.db.select().from(s.lineItem).where(eq(s.lineItem.visitId, visit.id))).filter((l) => !l.cancelledAt).reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
  if (isPaid(own, price)) throw new ApiError("conflict", "That visit is done and paid, so its line cannot change")
}

async function loadLine(ctx: Ctx, id: string) {
  const [line] = await ctx.db.select().from(s.lineItem).where(and(eq(s.lineItem.id, id), eq(s.lineItem.organizationId, ctx.organizationId)))
  if (!line) throw notFound("Line")
  return line
}

const money = z.number().int().min(0).max(100_000)

/** A change to a line is one event about its job: the story of the job reads "Rotors, 12 added, 12 × $38". */
const lineEvent = (ctx: Ctx, job: typeof s.job.$inferSelect, kind: "job.line-added" | "job.line-edited" | "job.line-cancelled", detail: Record<string, unknown>) =>
  recordEvent(ctx.db, { organizationId: ctx.organizationId, about: "job", aboutId: job.id, customerId: job.customerId, jobId: job.id, kind, detail, who: whoOf(ctx), at: ctx.now })

export const linesAdd = defineHandler({
  name: "lines.add",
  method: "POST",
  path: "/lines",
  scope: "write",
  status: 201,
  summary:
    "Add a line to a job that is still open: priced from a catalogue service (its name, what it includes and its taxable flag are copied at that moment) or a free line with its own name. A price of 0 is a line to quote later. Refused on a cancelled job, on a job paid in full, and on a Season Pass.",
  input: z.object({
      jobId: Id,
      serviceKey: z.string().min(2).max(40).optional().describe("The active catalogue service the line is for; it gives the line its name, description and taxable flag."),
      name: z.string().trim().min(1).max(120).optional().describe("Needed for a free line; a service's own name is used otherwise."),
      description: z.string().trim().min(1).max(1000).nullable().optional().describe("What the visit includes, with no price in it."),
      quantity: z.number().int().min(1).max(1000).default(1),
      unitPrice: money.optional().describe("Whole dollars; a service's fixed price when left out, else 0 (quote later)."),
      taxable: z.boolean().optional().describe("Left out, the service's flag, else false."),
    }),
  output: LineOut,
  async run(ctx, input) {
    if (!input.serviceKey && !input.name) throw new ApiError("invalid", "Give a service or a name for the line", [{ path: "name", message: "Give a serviceKey or a name" }])
    const { job } = await openJob(ctx, input.jobId)
    let service: typeof s.service.$inferSelect | undefined
    if (input.serviceKey) {
      ;[service] = await ctx.db.select().from(s.service).where(and(eq(s.service.organizationId, ctx.organizationId), eq(s.service.key, input.serviceKey)))
      if (!service || !service.active) throw new ApiError("invalid", "That service is not offered", [{ path: "serviceKey", message: "No active service has that key" }])
    }
    const row = await addJobLine(ctx.db, {
      organizationId: ctx.organizationId, jobId: job.id, name: service?.name ?? input.name!, description: service?.description ?? input.description ?? null, quantity: input.quantity,
      unitPrice: input.unitPrice ?? service?.price ?? 0, taxable: input.taxable ?? service?.taxable ?? false, serviceId: service?.id ?? null, now: ctx.now,
    })
    await lineEvent(ctx, job, "job.line-added", { line: row.id, name: row.name, quantity: row.quantity, unitPrice: row.unitPrice })
    return out(row, await jobTotalOf(ctx, job.id))
  },
})

export const linesUpdate = defineHandler({
  name: "lines.update",
  method: "PATCH",
  path: "/lines/{id}",
  scope: "write",
  summary: "Change a live line's name, quantity or unit price on an open job. Refused on a cancelled line or job, once the line's visit is done and paid, on a job paid in full, and on a Season Pass.",
  input: z.object({ id: Id, name: z.string().trim().min(1).max(120).optional(), quantity: z.number().int().min(1).max(1000).optional(), unitPrice: money.optional() }),
  output: LineOut,
  async run(ctx, { id, ...changes }) {
    const line = await loadLine(ctx, id)
    if (line.cancelledAt) throw new ApiError("unprocessable", "This line is cancelled, so it cannot change")
    const { job, payments } = await openJob(ctx, line.jobId)
    await assertVisitOpen(ctx, line, payments)
    const row = Object.values(changes).some((v) => v !== undefined) ? await updateLineRow(ctx.db, line, changes, ctx.now) : line
    if (row !== line) await lineEvent(ctx, job, "job.line-edited", { line: id, name: row.name, quantity: row.quantity, unitPrice: row.unitPrice, changed: Object.keys(changes).filter((k) => changes[k as keyof typeof changes] !== undefined) })
    return out(row, await jobTotalOf(ctx, job.id))
  },
})

export const linesCancel = defineHandler({
  name: "lines.cancel",
  method: "DELETE",
  path: "/lines/{id}",
  scope: "write",
  summary: "Cancel a line: it counts for nothing from now on and shows struck through. Refused on a line already cancelled, on a cancelled job or one paid in full, once the line's visit is done and paid, and on a Season Pass.",
  input: z.object({ id: Id }),
  output: LineOut,
  async run(ctx, { id }) {
    const line = await loadLine(ctx, id)
    if (line.cancelledAt) throw new ApiError("conflict", "This line is already cancelled")
    const { job, payments } = await openJob(ctx, line.jobId)
    await assertVisitOpen(ctx, line, payments)
    const row = await cancelLineRow(ctx.db, line, ctx.now)
    await lineEvent(ctx, job, "job.line-cancelled", { line: id, name: line.name })
    return out(row, await jobTotalOf(ctx, job.id))
  },
})
