import "server-only"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { renderEmail } from "@/emails/render"
import { enqueue, MAX_ATTEMPTS } from "@/lib/queue"
import { currentConsent, mayMessage } from "./consent"
import { sendEmailLogged, type LoggedEmailSender } from "./resend"
import { readTwilioEnv, sendTextNow, type TextSender } from "./twilio"

export type MessageRow = typeof s.messageLog.$inferSelect

export interface SendDeps {
  email: LoggedEmailSender
  sms: TextSender
  /** whether a text can go at all; false until Twilio's registration is done */
  smsConfigured: () => boolean
}

export const defaultDeps: SendDeps = { email: sendEmailLogged, sms: sendTextNow, smsConfigured: () => readTwilioEnv() !== null }

export type SendOutcome = "sent" | "skipped" | "gone"

const skip = (db: Database, row: MessageRow, reason: string) =>
  db.update(s.messageLog).set({ status: "skipped", error: reason, updatedAt: new Date() }).where(eq(s.messageLog.id, row.id))

/** A text that cannot go becomes the same message by email, once: key `<key>~email`, so a replay adds nothing. */
async function emailInstead(db: Database, row: MessageRow, customer: typeof s.customer.$inferSelect): Promise<void> {
  if (!customer.email) return
  const rendered = renderEmail(row.kind, row.data)
  const added = await db
    .insert(s.messageLog)
    .values({ organizationId: row.organizationId, customerId: row.customerId, visitId: row.visitId, channel: "email", kind: row.kind, key: `${row.key}~email`, to: customer.email, subject: rendered?.subject ?? row.subject ?? "A message from Trailhead", body: row.body, data: row.data, status: "queued" })
    .onConflictDoNothing()
    .returning({ id: s.messageLog.id })
  if (added[0]) await enqueue(db, row.organizationId, "message", added[0].id, { messageId: added[0].id })
}

/**
 * Sends one `message_log` row: through Resend for email or Twilio for sms, checked once more against the customer's consent.
 * Stores the provider id on success. A provider error is stored on the row and thrown so the queue retries; `final` marks
 * the row `failed` on the last attempt. A text with no Twilio sender is `skipped` with reason `no-sms-sender` and goes by email.
 */
export async function sendMessageRow(db: Database, messageId: string, opts: { deps?: SendDeps; final?: boolean; now?: Date } = {}): Promise<SendOutcome> {
  const deps = opts.deps ?? defaultDeps
  const now = opts.now ?? new Date()
  const [row] = await db.select().from(s.messageLog).where(eq(s.messageLog.id, messageId))
  if (!row || row.status !== "queued") return "gone"
  const [customer] = await db.select().from(s.customer).where(eq(s.customer.id, row.customerId))
  if (!customer) { await skip(db, row, "no-customer"); return "skipped" }

  const consent = await currentConsent(db, customer.id)
  if (!mayMessage(consent, row.kind, row.channel, Boolean(customer.phone))) {
    await skip(db, row, "no-consent")
    if (row.channel === "sms" && !consent.smsStopped) await emailInstead(db, row, customer)
    return "skipped"
  }
  if (row.channel === "sms" && !deps.smsConfigured()) {
    await skip(db, row, "no-sms-sender")
    await emailInstead(db, row, customer)
    return "skipped"
  }

  try {
    let providerId: string | null
    if (row.channel === "sms") providerId = (await deps.sms({ to: row.to, body: row.body })).id
    else {
      const rendered = renderEmail(row.kind, row.data)
      providerId = (await deps.email({ to: row.to, subject: rendered?.subject ?? row.subject ?? "A message from Trailhead", text: rendered?.text ?? row.body, html: rendered?.html })).id
    }
    await db.update(s.messageLog).set({ status: "sent", providerId, error: null, sentAt: now, updatedAt: now }).where(eq(s.messageLog.id, row.id))
    return "sent"
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await db.update(s.messageLog).set({ status: opts.final ? "failed" : "queued", error: message.slice(0, 500), updatedAt: now }).where(eq(s.messageLog.id, row.id))
    throw error
  }
}

/** Sends a staff note (see `queueStaffMessage`): rendered from its kind and data, straight through the email sender. */
export async function sendStaffMessage(payload: { kind: string; to: string; data: Record<string, unknown> }, deps: SendDeps = defaultDeps): Promise<void> {
  const rendered = renderEmail(payload.kind, payload.data)
  if (!rendered) throw new Error(`No email template for ${payload.kind}`)
  await deps.email({ to: payload.to, subject: rendered.subject, text: rendered.text, html: rendered.html })
}

export { MAX_ATTEMPTS }
