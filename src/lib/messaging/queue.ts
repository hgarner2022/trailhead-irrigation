import "server-only"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { renderEmail } from "@/emails/render"
import { SMS_TEMPLATES, type SmsKind } from "@/sms/texts"
import { enqueue } from "@/lib/queue"
import { currentConsent, mayMessage } from "./consent"

export type MessageKind = "purchase-confirmation" | "booking-confirmation" | "date-set" | "date-moved" | "day-before" | "date-confirm" | "receipt" | "card-failed" | "card-expiring" | "cancelled" | "renewal"

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
 * Records one message for a customer on the channel its kind uses, through the consent gate, and queues the send. A text kind
 * goes to the customer's mobile; with no mobile, or after a STOP, the same message goes by email. Returns whether a row was added.
 */
export async function queueMessage(db: Database, req: MessageRequest): Promise<boolean> {
  const [customer] = await db.select().from(s.customer).where(eq(s.customer.id, req.customerId))
  if (!customer || customer.organizationId !== req.organizationId) return false
  const consent = await currentConsent(db, customer.id)
  const hasPhone = Boolean(customer.phone)
  const common = { organizationId: req.organizationId, customerId: customer.id, visitId: req.visitId ?? null, kind: req.kind, key: req.key, data: req.data, status: "queued" as const }

  let values: typeof s.messageLog.$inferInsert | null = null
  if (BY_TEXT.has(req.kind) && customer.phone && mayMessage(consent, req.kind, "sms", hasPhone)) {
    values = { ...common, channel: "sms", to: customer.phone, subject: null, body: SMS_TEMPLATES[req.kind as SmsKind](req.data as never) }
  } else if (customer.email && mayMessage(consent, req.kind, "email", hasPhone)) {
    const rendered = renderEmail(req.kind, req.data)
    if (!rendered) throw new Error(`No email template for ${req.kind}`)
    values = { ...common, channel: "email", to: customer.email, subject: rendered.subject, body: rendered.text }
  }
  if (!values) return false
  const [added] = await db.insert(s.messageLog).values(values).onConflictDoNothing().returning({ id: s.messageLog.id })
  if (!added) return false
  await enqueue(db, req.organizationId, "message", added.id, { messageId: added.id })
  return true
}

export type StaffKind = "admin-alert" | "not-closed-crew"

/**
 * A note to the office: one `message` queue item per admin, sent as the kind's email with no `message_log` row (it is not a
 * customer message and needs no consent). `key` makes it once per event and admin.
 */
export async function queueStaffMessage(db: Database, organizationId: string, kind: StaffKind, key: string, data: Record<string, unknown>): Promise<number> {
  const admins = await db.select({ email: s.adminUser.email }).from(s.adminUser).where(eq(s.adminUser.organizationId, organizationId))
  let queued = 0
  for (const a of admins) if (await enqueue(db, organizationId, "message", `${kind}:${key}:${a.email}`, { staff: true, kind, to: a.email, data })) queued++
  return queued
}
