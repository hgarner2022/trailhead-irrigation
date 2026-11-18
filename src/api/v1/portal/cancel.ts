import "server-only"
import { and, eq, inArray, isNull, notInArray, or } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { visitName } from "@/lib/events/names"
import { readAppUrl } from "@/lib/env"
import { cancelVisitLines } from "@/lib/jobs/write-lines"
import { baseData } from "@/lib/messaging/data"
import { visitLinkUrl } from "@/lib/messaging/tokens"
import { queueMessage } from "@/lib/messaging/queue"
import { kindName } from "@/lib/pass/server/messages"
import { passStatus } from "@/lib/pass/facts"
import { alertCustomerChange } from "@/lib/portal/alerts"
import { CANCEL_REFUSED } from "@/lib/portal/words"
import { orderDay } from "@/lib/scheduling/server/order-day"
import { ApiError, notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { cancelJobRows, heldMoney } from "../jobs/cancel"
import { recordChange } from "../passes/queries"
import { assertOwnsCustomer, Id, today } from "../shared"
import { loadVisit } from "../visits/queries"
import { assertBeforeCutoff } from "./cutoff"
import { selfCustomerId } from "./self"

const FINAL = ["cancelled", "skipped"] as const

export const visitsCancelSelf = defineHandler({
  name: "visits.cancelSelf",
  method: "POST",
  path: "/visits/{id}/cancel-self",
  scope: "write",
  customerSelf: true,
  visitLink: true,
  summary:
    "A customer cancels their own visit that has not happened (no day yet, or booked), until 24 hours before its day. A Season Pass visit becomes the pass skip (skipped, its line canceled, the pass stays, nothing is charged); a one-off visit is canceled with its line, and the job is canceled with it (the `jobs.cancel` rules) when it was the job's only live visit and the job holds no payment. A cancel never moves money: a job that holds a payment stays open and the office is told. Writes one `visit.cancelled` event by the customer (with their optional reason), texts the customer a confirmation, raises a Home alert and emails the owner. A second call answers the same. Only a signed-in customer, only their own visit.",
  input: z.object({ id: Id, reason: z.string().trim().max(300).optional().describe("Why, in the customer's words; Ryan reads it, the customer's screens never show it back.") }),
  output: z.object({ id: Id, status: z.enum(["cancelled", "skipped"]), jobCancelled: z.boolean().describe("The whole job went with it (a one-off with no other visit and no payment).") }),
  async run(ctx, input) {
    if (!selfCustomerId(ctx)) throw new ApiError("forbidden", "Only a customer cancels their own visit here")
    const row = await loadVisit(ctx, input.id)
    const { visit, isPassVisit } = row
    assertOwnsCustomer(ctx, visit.customerId)
    const [job] = await ctx.db.select().from(s.job).where(eq(s.job.id, visit.jobId))
    if (!job) throw notFound("Job")
    // A second call on a canceled visit answers the same and writes nothing.
    if ((FINAL as readonly string[]).includes(visit.status)) return { id: visit.id, status: visit.status as (typeof FINAL)[number], jobCancelled: Boolean(job.cancelledAt) }
    if (visit.status !== "unscheduled" && visit.status !== "scheduled") throw new ApiError("unprocessable", CANCEL_REFUSED)
    if (isPassVisit ? passStatus(job, today(ctx)) !== "active" : !job.soldOn || job.cancelledAt) throw new ApiError("unprocessable", isPassVisit ? "This pass is not open" : "This job is not open")
    assertBeforeCutoff(ctx, visit)

    const org = ctx.organizationId
    // The job's money decides whether the job can be canceled with it (the `jobs.cancel` rule); what the customer and Ryan are told is what is held on this visit: its own
    // payment rows and any payment made on the job as a whole, never another visit's (a pass visit is charged only after it is done).
    const jobHeld = await heldMoney(ctx.db, org, job.id)
    const here = await ctx.db.select({ amount: s.charge.amount }).from(s.charge).where(and(eq(s.charge.organizationId, org), eq(s.charge.jobId, job.id), eq(s.charge.status, "succeeded"), or(eq(s.charge.visitId, visit.id), isNull(s.charge.visitId))))
    const held = here.reduce((sum, r) => sum + r.amount, 0)
    const status = (isPassVisit ? "skipped" : "cancelled") as (typeof FINAL)[number]
    // The update is conditional on the visit still being open and says whether it won: a second tab or a double submit finds it already canceled and writes nothing more.
    const won = await ctx.db.update(s.visit).set({ status, personId: null, scheduledOn: null, startTime: null, stopOrder: null, awaitingPick: false }).where(and(eq(s.visit.id, visit.id), inArray(s.visit.status, ["unscheduled", "scheduled"]))).returning({ id: s.visit.id })
    if (won.length === 0) {
      const [now] = await ctx.db.select({ status: s.visit.status }).from(s.visit).where(eq(s.visit.id, visit.id))
      const [j] = await ctx.db.select({ cancelledAt: s.job.cancelledAt }).from(s.job).where(eq(s.job.id, job.id))
      return { id: visit.id, status: (now?.status === "skipped" ? "skipped" : "cancelled") as (typeof FINAL)[number], jobCancelled: Boolean(j?.cancelledAt) }
    }
    await cancelVisitLines(ctx.db, [visit.id], ctx.now)
    if (visit.personId && visit.scheduledOn) await orderDay(ctx.db, { personId: visit.personId, day: visit.scheduledOn })
    // A charge asked for but not yet made is left undone, and the visit's "Needs a day" alert resolves with it.
    await ctx.db.update(s.queueItem).set({ status: "done", lastError: "visit canceled", doneAt: ctx.now }).where(and(eq(s.queueItem.kind, "pass-charge"), eq(s.queueItem.key, visit.id), eq(s.queueItem.status, "pending")))
    await ctx.db.update(s.adminAlert).set({ resolvedAt: ctx.now }).where(and(eq(s.adminAlert.organizationId, org), eq(s.adminAlert.kind, "unplaced"), eq(s.adminAlert.key, visit.id)))

    // A one-off job whose only live visit this was is canceled with it, by the rules `jobs.cancel` has; one that holds a payment stays open.
    let jobCancelled = false
    if (!isPassVisit && jobHeld <= 0) {
      const left = await ctx.db.select({ id: s.visit.id }).from(s.visit).where(and(eq(s.visit.jobId, job.id), eq(s.visit.organizationId, org), notInArray(s.visit.status, [...FINAL])))
      if (left.length === 0) {
        await cancelJobRows(ctx, job, input.reason)
        jobCancelled = true
      }
    }

    // One event, by the customer; its time is the day the visit was canceled (a visit has no `cancelled_at`).
    await recordChange(ctx, { customerId: visit.customerId, jobId: job.id, visitId: visit.id, kind: "visit-cancelled", detail: { name: visitName(visit.kind), reason: input.reason ?? null, day: visit.scheduledOn, ...(isPassVisit ? { skipped: true } : {}) } })

    const origin = readAppUrl()
    const [customer] = await ctx.db.select().from(s.customer).where(eq(s.customer.id, visit.customerId))
    if (customer) {
      await queueMessage(ctx.db, { organizationId: org, customerId: customer.id, visitId: visit.id, kind: "visit-cancelled", key: visit.id, data: { ...baseData(origin, customer), serviceName: kindName(visit.kind), address: row.address, day: visit.scheduledOn, paid: Math.max(held, 0), visitUrl: visitLinkUrl(origin, visit.id, visit.customerId) } })
    }
    await alertCustomerChange(ctx, visit, { change: "cancelled", from: visit.scheduledOn, hasPayment: held > 0 })
    return { id: visit.id, status, jobCancelled }
  },
})
