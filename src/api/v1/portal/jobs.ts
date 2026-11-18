import "server-only"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { ApiError, notFound } from "../../core/errors"
import type { Ctx } from "../../core/context"
import { defineHandler } from "../../core/handler"
import { assertOwnsCustomer, Id, idInput } from "../shared"
import { loadPortalJobs } from "./load"
import { PortalJob } from "./schemas"

/** The signed-in customer's id, or null for anyone else (a key, an admin). */
export function selfCustomerId(ctx: Ctx): string | null {
  const p = ctx.principal
  return p.kind === "person" && p.type === "customer" && p.customerId ? p.customerId : null
}

export const jobsList = defineHandler({
  name: "jobs.list",
  method: "GET",
  path: "/jobs",
  scope: "read",
  customerSelf: true,
  summary: "A customer's sold jobs, newest first, each with its lines, visits, payments and invoices, as the customer's own account shows them: no notes, no events, a person by first name, no voided invoice. A signed-in customer reads only their own; a key says whose with `customerId`.",
  input: z.object({ customerId: Id.optional() }),
  output: z.object({ data: z.array(PortalJob) }),
  async run(ctx, input) {
    const own = selfCustomerId(ctx)
    const customerId = own ?? input.customerId
    if (!customerId) throw new ApiError("invalid", "Give a customerId", [{ path: "customerId", message: "Say whose jobs" }])
    assertOwnsCustomer(ctx, customerId)
    return { data: await loadPortalJobs(ctx, customerId) }
  },
})

export const jobsGet = defineHandler({
  name: "jobs.get",
  method: "GET",
  path: "/jobs/{id}",
  scope: "read",
  customerSelf: true,
  summary: "One sold job with its lines, visits, payments and invoices, as its customer's account shows it. A customer asks only about their own job.",
  input: idInput,
  output: PortalJob,
  async run(ctx, input) {
    const [row] = await ctx.db.select({ customerId: s.job.customerId }).from(s.job).where(and(eq(s.job.id, input.id), eq(s.job.organizationId, ctx.organizationId)))
    if (!row) throw notFound("Job")
    assertOwnsCustomer(ctx, row.customerId)
    const [job] = await loadPortalJobs(ctx, row.customerId, input.id)
    if (!job) throw notFound("Job")
    return job
  },
})
