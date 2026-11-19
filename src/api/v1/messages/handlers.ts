import "server-only"
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm"
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
import { canSeeContact, Channel, Id, Iso, today } from "../shared"

export const MESSAGE_KINDS = ["purchase-confirmation", "date-set", "date-moved", "day-before", "on-the-way", "receipt", "card-failed", "cancelled", "renewal", "note"] as const

const MessageOut = z.object({
  id: Id, customerId: Id, visitId: Id.nullable(), jobId: Id.nullable().optional().describe("The job an invoice message is about (an invoice text is queued on the job, not a visit); null for any other message."), channel: Channel, kind: z.string(), subject: z.string().nullable(), body: z.string(),
  status: z.enum(["queued", "sent", "delivered", "failed", "bounced", "skipped"]), sentAt: Iso.nullable(), createdAt: Iso,
  deliveryStatus: z.string().nullable().optional().describe("Twilio's last delivery report for a text (queued, sending, sent, delivered, undelivered, failed); null until one arrives and for an email."),
  deliveryError: z.string().nullable().optional().describe("Twilio's error code when the report is undelivered or failed. Only for callers with the write scope."),
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
    // An invoice text is queued on the job (its key is invoice-<id>, with a day on a reminder), so the job comes from the invoice.
    const invoiceKinds = result.data.filter((m) => m.kind === "invoice" || m.kind === "invoice-reminder")
    const invoices = invoiceKinds.length ? await ctx.db.select({ id: s.invoice.id, jobId: s.invoice.jobId }).from(s.invoice).where(and(eq(s.invoice.organizationId, ctx.organizationId), inArray(s.invoice.customerId, [...new Set(invoiceKinds.map((m) => m.customerId))]))) : []
    const jobOf = (m: { kind: string; key: string }) => (m.kind === "invoice" || m.kind === "invoice-reminder" ? (invoices.find((i) => m.key === `invoice-${i.id}` || m.key.startsWith(`invoice-${i.id}-`))?.jobId ?? null) : null)
    return {
      next_cursor: result.next_cursor,
      data: result.data.map((m) => ({
        id: m.id, customerId: m.customerId, visitId: m.visitId, jobId: jobOf(m), channel: m.channel, kind: m.kind, subject: m.subject, body: m.body, status: m.status,
        sentAt: m.sentAt?.toISOString() ?? null, createdAt: m.createdAt.toISOString(), deliveryStatus: m.deliveryStatus, ...(canSeeContact(ctx) ? { to: m.to, deliveryError: m.deliveryError } : {}),
      })),
    }
  },
})

export const messagesSend = defineHandler({
  name: "messages.send", method: "POST", path: "/messages", scope: "write", status: 201,
  summary: "Send one of the app's messages to a customer (on-the-way is a text only, for a scheduled visit that is today, once per visit per day), on the channel its kind uses, through the same consent gate as every automatic message: transactional kinds by email always and by text when there is a mobile and no STOP, renewal only with the opt-in. Receipts and card messages go out on their own events and are not sent here.",
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
    } else if (input.kind === "date-set" || input.kind === "date-moved" || input.kind === "day-before" || input.kind === "on-the-way") {
      if (!input.visitId) throw new ApiError("invalid", "A visit is needed for this message")
      const [visit] = await ctx.db.select({ id: s.visit.id, customerId: s.visit.customerId, status: s.visit.status }).from(s.visit).where(and(eq(s.visit.id, input.visitId), eq(s.visit.organizationId, ctx.organizationId)))
      if (!visit || visit.customerId !== customer.id) throw new ApiError("not_found", "Visit not found")
      // On my way names the person (and any window) itself: it is the moment Ryan tells the customer who is coming.
      const facts = await loadVisitFacts(ctx.db, visit.id, origin, undefined, { told: input.kind === "on-the-way" })
      if (!facts) throw new ApiError("unprocessable", "That visit has no day yet")
      if (input.kind === "on-the-way") {
        // The "On my way" button: only for a visit that is today, and once per visit per day.
        if (visit.status !== "scheduled") throw new ApiError("unprocessable", "On my way is for a visit that is scheduled, not one that is done or canceled")
        if (facts.day !== today(ctx)) throw new ApiError("unprocessable", "On my way is for a visit that is today")
        const sentKey = `on-the-way-${visit.id}-${facts.day}`
        const [already] = await ctx.db.select({ id: s.messageLog.id }).from(s.messageLog).where(and(eq(s.messageLog.customerId, customer.id), eq(s.messageLog.key, sentKey)))
        if (already) throw new ApiError("conflict", "This customer was already told you are on the way today")
        const sentNow = await queueMessage(ctx.db, { ...base, key: sentKey, visitId: visit.id, kind: input.kind, data: { ...baseData(origin, customer), visit: facts } })
        if (!sentNow) {
          const [raced] = await ctx.db.select({ id: s.messageLog.id }).from(s.messageLog).where(and(eq(s.messageLog.customerId, customer.id), eq(s.messageLog.key, sentKey)))
          throw raced ? new ApiError("conflict", "This customer was already told you are on the way today") : new ApiError("unprocessable", "This customer has no mobile to text, or replied STOP")
        }
        const [row] = await ctx.db.select().from(s.messageLog).where(and(eq(s.messageLog.customerId, customer.id), eq(s.messageLog.key, sentKey)))
        return { id: row!.id, customerId: row!.customerId, visitId: row!.visitId, channel: row!.channel, kind: row!.kind, subject: row!.subject, body: row!.body, status: row!.status, sentAt: row!.sentAt?.toISOString() ?? null, createdAt: row!.createdAt.toISOString(), ...(canSeeContact(ctx) ? { to: row!.to } : {}) }
      }
      queued = await queueMessage(ctx.db, { ...base, visitId: visit.id, kind: input.kind, data: { ...baseData(origin, customer), visit: facts } })
    } else {
      const passes = await ctx.db
        .select({ job: s.job })
        .from(s.job)
        .where(and(eq(s.job.customerId, customer.id), eq(s.job.organizationId, ctx.organizationId), isNotNull(s.job.season)))
        .orderBy(desc(s.job.season))
      // A pass that is not pending (sold or canceled) speaks for the customer; a canceled message needs the canceled one.
      const found = passes.find((p) => (input.kind === "cancelled" ? p.job.cancelledAt !== null : p.job.soldOn !== null || p.job.cancelledAt !== null))
      const pass = found?.job
      if (input.kind === "purchase-confirmation" || input.kind === "cancelled" || input.kind === "renewal") {
        if (!pass) throw new ApiError("unprocessable", "This customer has no pass for that message")
        if (input.kind === "purchase-confirmation") queued = await queuePurchaseConfirmation(ctx.db, pass.id, origin, key, { organizationId: ctx.organizationId })
        else if (input.kind === "cancelled") queued = await queueMessage(ctx.db, { ...base, kind: "cancelled", data: { ...baseData(origin, customer), season: pass.season } })
        else {
          const [prop] = await ctx.db.select({ town: s.property.town }).from(s.property).where(eq(s.property.id, pass.propertyId))
          queued = await queueMessage(ctx.db, { ...base, kind: "renewal", data: { ...baseData(origin, customer), season: (pass.season ?? 0) + 1, town: prop?.town ?? "your home", buyUrl: renewUrl(origin, pass.id) } })
        }
      } else throw new ApiError("unprocessable", "That message goes out on its own event: a receipt after a visit is charged, a card message when a card fails or is removed")
    }
    if (!queued) throw new ApiError("unprocessable", "The customer has not agreed to that message, or has no address or number for it")
    const [row] = await ctx.db.select().from(s.messageLog).where(and(eq(s.messageLog.customerId, customer.id), eq(s.messageLog.key, key)))
    return { id: row!.id, customerId: row!.customerId, visitId: row!.visitId, channel: row!.channel, kind: row!.kind, subject: row!.subject, body: row!.body, status: row!.status, sentAt: row!.sentAt?.toISOString() ?? null, createdAt: row!.createdAt.toISOString(), ...(canSeeContact(ctx) ? { to: row!.to } : {}) }
  },
})
