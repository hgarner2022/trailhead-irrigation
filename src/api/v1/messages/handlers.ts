import "server-only"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { notImplemented } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { afterTimeCursor, cursorPage, page, pageInput, timeCursor } from "../../core/pagination"
import { canSeeContact, Channel, Id, Iso } from "../shared"

export const MESSAGE_KINDS = ["purchase-confirmation", "date-set", "date-moved", "day-before", "receipt", "card-failed", "cancelled", "renewal"] as const

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
  summary: "Send one of the app's messages to a customer, on the channel its kind uses; marketing needs the customer's opt-in. Needs the messaging layer (Phase 12); not implemented yet.",
  input: z.object({ customerId: Id, kind: z.enum(MESSAGE_KINDS), visitId: Id.optional() }),
  output: MessageOut,
  async run() {
    throw notImplemented("messages.send")
  },
})
