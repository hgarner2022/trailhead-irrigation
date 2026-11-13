import "server-only"
import { desc, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"

const STOP_WORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"])
const START_WORDS = new Set(["START", "YES", "UNSTOP"])

export type InboundOutcome = "stop" | "start" | "ignored"

/**
 * Messages are one-way: the only inbound words the app acts on are STOP and START (Twilio's own Advanced Opt-Out sends
 * the reply). Each appends one `consent` row (`source: reply`) for every customer with that phone number; anything else
 * is ignored. A repeat of the same word adds nothing.
 */
export async function handleInboundText(db: Database, from: string, body: string, now = new Date()): Promise<InboundOutcome> {
  const word = body.trim().toUpperCase().replace(/[^A-Z]/g, "")
  const outcome: InboundOutcome = STOP_WORDS.has(word) ? "stop" : START_WORDS.has(word) ? "start" : "ignored"
  if (outcome === "ignored") return outcome
  const label = outcome === "stop" ? "STOP" : "START"
  for (const customer of await db.select().from(s.customer).where(eq(s.customer.phone, from))) {
    const [newest] = await db.select().from(s.consent).where(eq(s.consent.customerId, customer.id)).orderBy(desc(s.consent.recordedAt), desc(s.consent.id)).limit(1)
    const [lastReply] = (await db.select().from(s.consent).where(eq(s.consent.customerId, customer.id)).orderBy(desc(s.consent.recordedAt), desc(s.consent.id))).filter((c) => c.source === "reply")
    if ((lastReply?.note ?? "START") === label) continue
    const channels = (newest?.marketingChannels ?? []).filter((c) => outcome === "start" || c !== "sms")
    await db.insert(s.consent).values({
      organizationId: customer.organizationId, customerId: customer.id, termsVersion: newest?.termsVersion ?? null, termsAcceptedAt: newest?.termsAcceptedAt ?? null,
      marketingOptIn: channels.length > 0 && (newest?.marketingOptIn ?? false), marketingChannels: channels, source: "reply", note: label, recordedAt: now,
    })
  }
  return outcome
}
