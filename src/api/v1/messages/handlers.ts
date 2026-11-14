import "server-only"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { randomUUID } from "node:crypto"
import { readAppUrl } from "@/lib/env"
import { baseData, loadVisitFacts } from "@/lib/messaging/data"
import { NOTE_MAX, queueMessage, queueNote } from "@/lib/messaging/queue"
import { renewUrl } from "@/lib/messaging/tokens"
import { queuePurchaseConfirmation } from "@/lib/pass/server/purchase"
import { ApiError } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { afterTimeCursor, cursorPage, page, pageInput, timeCursor } from "../../core/pagination"
import { canSeeContact, Channel, Id, Iso } from "../shared"

export const MESSAGE_KINDS = ["purchase-confirmation", "date-set", "date-moved", "day-before", "receipt", "card-failed", "cancelled", "renewal", "note"] as const

const MessageOut = z.object({
  id: Id, customerId: Id, visitId: Id.nullable(), channel: Channel, kind: z.string(), subject: z.string().nullable(), body: z.string(),
  status: z.enum(["queued", "sent", "delivered", "failed", "bounced", "skipped"]), sentAt: Iso.nullable(), createdAt: Iso,
  to: z.string().optional().describe("The address or number it went to. Only for callers with the write scope."),
})

export const messagesList = defineHandler({
  name: "messages.list", method: "GET", path: "/messages", scope: "read",
  summary: "The messages the app sent, newest first. Every message is outbound; filter by customer or visit.",
  input: z.object({ customerId: Id.optional(), visitId: Id.optional(), ...pageInput }), output: page(MessageOut),
  async run(ctx, input) {
    const rows = await ctx.db
      .select()
      .from(s.messageLog)
      .where(and(eq(s.messageLog.organizationId, ctx.organizationId), input.customerId ? eq(s.messageLog.customerId, input.customerId) : undefined, input.visitId ? eq(s.messageLog.visitId, input.visitId) : undefined, afterTimeCursor(s.messageLog.createdAt, s.messageLog.id, input.cursor)))
      .orderBy(desc(s.messageLog.createdAt), desc(s.messageLog.id))
      .limit(input.limit + 1)
    const result = cursorPage(rows, input.limit, timeCursor)
    return {
      next_cursor: result.next_cursor,
      data: result.data.map((m) => ({
        id: m.id, customerId: m.customerId, visitId: m.visitId, channel: m.channel, kind: m.kind, subject: m.subject, body: m.body, status: m.status,
        sentAt: m.sentAt?.toISOString() ?? null, createdAt: m.createdAt.toISOString(), ...(canSeeContact(ctx) ? { to: m.to } : {}),
      })),
    }
  },
})

export const messagesSend = defineHandler({
  name: "messages.send", method: "POST", path: "/messages", scope: "write", status: 201,
  summary: "Send one of the app's messages to a customer, on the channel its kind uses, through the same consent gate as every automatic message: transactional kinds by email always and by text when there is a mobile and no STOP, renewal only with the opt-in. Receipts and card messages go out on their own events and are not sent here.",
  input: z.object({ customerId: Id, kind: z.enum(MESSAGE_KINDS), visitId: Id.optional(), text: z.string().trim().min(1).max(NOTE_MAX).optional().describe("The words of a note: a free-text text to the customer's mobile, up to 320 characters.") }),
  output: MessageOut,
  async run(ctx, input) {
    const [customer] = await ctx.db.select().from(s.customer).where(and(eq(s.customer.id, input.customerId), eq(s.customer.organizationId, ctx.organizationId)))
    if (!customer) throw new ApiError("not_found", "Customer not found")
    const origin = readAppUrl()
    const key = `admin-${randomUUID()}`
    const base = { organizationId: ctx.organizationId, customerId: customer.id, key }
    let queued: boolean
    if (input.kind === "note") {
      if (!input.text) throw new ApiError("invalid", "Write the text to send")
      if (input.visitId) {
        const [v] = await ctx.db.select({ customerId: s.visit.customerId }).from(s.visit).where(and(eq(s.visit.id, input.visitId), eq(s.visit.organizationId, ctx.organizationId)))
        if (!v || v.customerId !== customer.id) throw new ApiError("not_found", "Visit not found")
      }
      const note = await queueNote(ctx.db, { organizationId: ctx.organizationId, customerId: customer.id, visitId: input.visitId, text: input.text, key })
      if (!note.ok) throw new ApiError("unprocessable", note.reason === "no-phone" ? "This customer has no mobile number to text." : "This customer replied STOP, so no texts can go until they reply START.")
      queued = true
    } else if (input.kind === "date-set" || input.kind === "date-moved" || input.kind === "day-before") {
      if (!input.visitId) throw new ApiError("invalid", "A visit is needed for this message")
      const [visit] = await ctx.db.select({ id: s.visit.id, customerId: s.visit.customerId }).from(s.visit).where(and(eq(s.visit.id, input.visitId), eq(s.visit.organizationId, ctx.organizationId)))
      if (!visit || visit.customerId !== customer.id) throw new ApiError("not_found", "Visit not found")
      const facts = await loadVisitFacts(ctx.db, visit.id, origin)
      if (!facts) throw new ApiError("unprocessable", "That visit has no day yet")
      queued = await queueMessage(ctx.db, { ...base, visitId: visit.id, kind: input.kind, data: { ...baseData(origin, customer), visit: facts } })
    } else {
      const passes = await ctx.db.select().from(s.seasonPass).where(and(eq(s.seasonPass.customerId, customer.id), eq(s.seasonPass.organizationId, ctx.organizationId))).orderBy(desc(s.seasonPass.season))
      const pass = passes.find((p) => (input.kind === "cancelled" ? p.status === "cancelled" : p.status !== "pending"))
      if (input.kind === "purchase-confirmation" || input.kind === "cancelled" || input.kind === "renewal") {
        if (!pass) throw new ApiError("unprocessable", "This customer has no pass for that message")
        if (input.kind === "purchase-confirmation") queued = await queuePurchaseConfirmation(ctx.db, pass.id, origin, key)
        else if (input.kind === "cancelled") queued = await queueMessage(ctx.db, { ...base, kind: "cancelled", data: { ...baseData(origin, customer), passNumber: pass.number } })
        else {
          const [prop] = await ctx.db.select({ town: s.property.town }).from(s.property).where(eq(s.property.id, pass.propertyId))
          queued = await queueMessage(ctx.db, { ...base, kind: "renewal", data: { ...baseData(origin, customer), season: pass.season + 1, town: prop?.town ?? "your home", buyUrl: renewUrl(origin, pass.id) } })
        }
      } else throw new ApiError("unprocessable", "That message goes out on its own event: a receipt after a visit is charged, a card message when a card fails or is removed")
    }
    if (!queued) throw new ApiError("unprocessable", "The customer has not agreed to that message, or has no address or number for it")
    const [row] = await ctx.db.select().from(s.messageLog).where(and(eq(s.messageLog.customerId, customer.id), eq(s.messageLog.key, key)))
    return { id: row!.id, customerId: row!.customerId, visitId: row!.visitId, channel: row!.channel, kind: row!.kind, subject: row!.subject, body: row!.body, status: row!.status, sentAt: row!.sentAt?.toISOString() ?? null, createdAt: row!.createdAt.toISOString(), ...(canSeeContact(ctx) ? { to: row!.to } : {}) }
  },
})
