import "server-only"
import { and, eq, inArray, isNotNull } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { renderEmail } from "@/emails/render"
import { SMS_TEMPLATES, type SmsKind } from "@/sms/texts"
import { enqueue } from "@/lib/queue"
import { currentConsent, mayMessage } from "./consent"

export type MessageKind = "purchase-confirmation" | "booking-confirmation" | "date-set" | "date-moved" | "day-before" | "date-confirm" | "receipt" | "card-failed" | "card-expiring" | "cancelled" | "renewal" | "note" | "invoice" | "invoice-reminder"

/** The kinds that go by text: one channel each, the customer's mobile, and by email instead when there is none or texts are off. */
const BY_TEXT = new Set<string>(Object.keys(SMS_TEMPLATES))

export interface MessageRequest {
  organizationId: string
  customerId: string
  visitId?: string | null
  kind: MessageKind
  /** with `kind` and the customer, makes the row unique: a repeat of the same event adds nothing */
  key: string
  /** the template's arguments (see `src/emails/types.ts`); stored on the row so the HTML is built when it is sent */
  data: Record<string, unknown>
}

/**
 * The channel a kind of message would go by for this customer, or null when it cannot reach them: a text kind goes to the
 * mobile unless there is none or the customer sent STOP, then by email; a customer with neither gets nothing. The one rule
 * `queueMessage` sends by and `invoices.send` checks before it writes an invoice.
 */
export async function messageChannel(db: Database, customer: Pick<typeof s.customer.$inferSelect, "id" | "phone" | "email">, kind: string): Promise<"sms" | "email" | null> {
  const consent = await currentConsent(db, customer.id)
  const hasPhone = Boolean(customer.phone)
  if (BY_TEXT.has(kind) && customer.phone && mayMessage(consent, kind, "sms", hasPhone)) return "sms"
  if (customer.email && mayMessage(consent, kind, "email", hasPhone)) return "email"
  return null
}

/**
 * Records one message for a customer on the channel its kind uses, through the consent gate, and queues the send. A text kind
 * goes to the customer's mobile; with no mobile, or after a STOP, the same message goes by email. Returns whether a row was added.
 */
export async function queueMessage(db: Database, req: MessageRequest): Promise<boolean> {
  const [customer] = await db.select().from(s.customer).where(eq(s.customer.id, req.customerId))
  if (!customer || customer.organizationId !== req.organizationId) return false
  const channel = await messageChannel(db, customer, req.kind)
  const common = { organizationId: req.organizationId, customerId: customer.id, visitId: req.visitId ?? null, kind: req.kind, key: req.key, data: req.data, status: "queued" as const }

  let values: typeof s.messageLog.$inferInsert | null = null
  if (channel === "sms") {
    values = { ...common, channel: "sms", to: customer.phone!, subject: null, body: SMS_TEMPLATES[req.kind as SmsKind](req.data as never) }
  } else if (channel === "email") {
    const rendered = renderEmail(req.kind, req.data)
    if (!rendered) throw new Error(`No email template for ${req.kind}`)
    values = { ...common, channel: "email", to: customer.email!, subject: rendered.subject, body: rendered.text }
  }
  if (!values) return false
  const [added] = await db.insert(s.messageLog).values(values).onConflictDoNothing().returning({ id: s.messageLog.id })
  if (!added) return false
  await enqueue(db, req.organizationId, "message", added.id, { messageId: added.id })
  return true
}

export type StaffKind = "admin-alert" | "not-closed-crew"

/**
 * A note to the office: one `message` queue item per active owner or admin with an email (the `person` table; a tech never
 * gets one), sent as the kind's email with no `message_log` row (it is not a customer message and needs no consent). `key`
 * makes it once per event and person.
 */
export async function queueStaffMessage(db: Database, organizationId: string, kind: StaffKind, key: string, data: Record<string, unknown>): Promise<number> {
  const staff = await db
    .select({ email: s.person.email })
    .from(s.person)
    // Owner and admin run the office, so they hear about passes, charges and unclosed days (and the crew summary, which goes to the same two roles); a tech hears nothing from the office yet.
    .where(and(eq(s.person.organizationId, organizationId), inArray(s.person.role, ["owner", "admin"]), isNotNull(s.person.email), eq(s.person.active, true)))
  let queued = 0
  for (const p of staff) {
    if (!p.email) continue
    if (await enqueue(db, organizationId, "message", `${kind}:${key}:${p.email}`, { staff: true, kind, to: p.email, data })) queued++
  }
  return queued
}

export const NOTE_MAX = 320

/**
 * A one-off text from the office: free text, transactional, to the customer's mobile only (never by email), through the same
 * consent check as every text. Answers why it was refused instead of falling back to email.
 */
export async function queueNote(db: Database, req: { organizationId: string; customerId: string; visitId?: string | null; text: string; key: string }): Promise<{ ok: true; id: string } | { ok: false; reason: "no-phone" | "stopped" | "no-customer" }> {
  const [customer] = await db.select().from(s.customer).where(eq(s.customer.id, req.customerId))
  if (!customer || customer.organizationId !== req.organizationId) return { ok: false, reason: "no-customer" }
  if (!customer.phone) return { ok: false, reason: "no-phone" }
  const consent = await currentConsent(db, customer.id)
  if (!mayMessage(consent, "note", "sms", true)) return { ok: false, reason: "stopped" }
  const body = `Trailhead: ${req.text.trim()} Reply STOP to opt out.`
  const [added] = await db
    .insert(s.messageLog)
    .values({ organizationId: req.organizationId, customerId: customer.id, visitId: req.visitId ?? null, channel: "sms", kind: "note", key: req.key, to: customer.phone, subject: null, body, data: null, status: "queued" })
    .returning({ id: s.messageLog.id })
  await enqueue(db, req.organizationId, "message", added!.id, { messageId: added!.id })
  return { ok: true, id: added!.id }
}
