import "server-only"
import { randomBytes } from "node:crypto"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { ApiError, notFound } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { Id, idInput, Iso, okOutput, OK } from "../shared"
import { deliverEvent, EVENTS } from "./deliver"

const Event = z.enum(EVENTS)
const EndpointOut = z.object({ id: Id, url: z.string(), events: z.array(Event), active: z.boolean(), createdAt: Iso })
type Ctx = { db: import("@/db/types").Database; organizationId: string }

async function load(ctx: Ctx, id: string) {
  const [row] = await ctx.db.select().from(s.webhookEndpoint).where(and(eq(s.webhookEndpoint.id, id), eq(s.webhookEndpoint.organizationId, ctx.organizationId)))
  if (!row) throw notFound("Webhook")
  return row
}
const out = (r: typeof s.webhookEndpoint.$inferSelect) => ({ id: r.id, url: r.url, events: r.events as (typeof EVENTS)[number][], active: r.active, createdAt: r.createdAt.toISOString() })

export const webhooksList = defineHandler({
  name: "webhooks.list", method: "GET", path: "/webhooks", scope: "admin", summary: "List webhook endpoints. The signing secret is shown once, when the endpoint is created.",
  input: z.object({}), output: z.object({ data: z.array(EndpointOut) }),
  async run(ctx) {
    const rows = await ctx.db.select().from(s.webhookEndpoint).where(eq(s.webhookEndpoint.organizationId, ctx.organizationId)).orderBy(desc(s.webhookEndpoint.createdAt))
    return { data: rows.map(out) }
  },
})

export const webhooksCreate = defineHandler({
  name: "webhooks.create", method: "POST", path: "/webhooks", scope: "admin", status: 201, returnsSecret: true,
  summary: "Subscribe an HTTPS URL to events. Each delivery is signed: `X-Trailhead-Signature` is the base64 HMAC-SHA256 of the body with the returned secret.",
  input: z.object({ url: z.url().refine((u) => u.startsWith("https://"), "Use an https:// URL"), events: z.array(Event).min(1) }),
  output: EndpointOut.extend({ secret: z.string().describe("Shown once; store it now.") }),
  async run(ctx, input) {
    const secret = `whsec_${randomBytes(24).toString("base64url")}`
    const [row] = await ctx.db.insert(s.webhookEndpoint).values({ organizationId: ctx.organizationId, url: input.url, events: [...new Set(input.events)], secret }).returning()
    return { ...out(row!), secret }
  },
})

export const webhooksDelete = defineHandler({
  name: "webhooks.delete", method: "DELETE", path: "/webhooks/{id}", scope: "admin", summary: "Stop an endpoint receiving events. Its past deliveries are kept.",
  input: idInput, output: okOutput,
  async run(ctx, input) {
    await load(ctx, input.id)
    await ctx.db.update(s.webhookEndpoint).set({ active: false }).where(eq(s.webhookEndpoint.id, input.id))
    return OK
  },
})

export const webhooksTest = defineHandler({
  name: "webhooks.test", method: "POST", path: "/webhooks/{id}/test", scope: "admin",
  summary: "Send a signed `webhook.test` event to the endpoint now and report how it answered.",
  input: idInput, output: z.object({ delivered: z.boolean(), status: z.number().int().optional(), error: z.string().optional() }),
  async run(ctx, input) {
    const endpoint = await load(ctx, input.id)
    if (!endpoint.active) throw new ApiError("unprocessable", "This endpoint is deleted")
    const [event] = await ctx.db.insert(s.outboundEvent).values({ organizationId: ctx.organizationId, endpointId: endpoint.id, event: "webhook.test", payload: { message: "Test delivery from Trailhead" } }).returning({ id: s.outboundEvent.id })
    return deliverEvent(ctx.db, event!.id)
  },
})
