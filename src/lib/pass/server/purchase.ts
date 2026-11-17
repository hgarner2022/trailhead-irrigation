import "server-only"
import { and, asc, eq, gte, isNull } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { enqueue } from "@/lib/queue"
import { baseData, loadVisitFacts } from "@/lib/messaging/data"
import { queueMessage, queueStaffMessage } from "@/lib/messaging/queue"
import { passImageUrl } from "@/lib/messaging/tokens"
import { filledLine } from "@/emails/format"
import { kindName } from "./messages"

export interface PurchaseConsent {
  marketingOptIn: boolean
  marketingChannels: ("email" | "sms")[]
  /** who recorded it: the checkout's card step, or the office reading the terms to the customer (`passes.sell`) */
  source?: "checkout" | "admin"
}

export interface PurchaseExtras {
  /** the fresh card link an office sale paid by card carries in its confirmation, so the customer adds the card from the email */
  cardUpdateUrl?: string | null
}

/**
 * Everything that follows a pass turning active (the checkout's card step, a renewal, an office sale), each step safe to repeat
 * (so a retry after a failure part-way repeats nothing): the consent row (terms as accepted now, marketing only for the ticked
 * channels, `sms` only with a phone), the `pass-onboard` task and the queued purchase confirmation. Sending is the messaging
 * layer's job (Phase 12); the email only records what must go.
 */
export async function recordPurchase(db: Database, passId: string, consent: PurchaseConsent | undefined, origin: string, now: Date, extras: PurchaseExtras = {}): Promise<void> {
  const [row] = await db
    .select({ pass: s.seasonPass, customer: s.customer, town: s.property.town })
    .from(s.seasonPass)
    .innerJoin(s.customer, eq(s.customer.id, s.seasonPass.customerId))
    .innerJoin(s.property, eq(s.property.id, s.seasonPass.propertyId))
    .where(eq(s.seasonPass.id, passId))
  if (!row) throw new Error(`Pass ${passId} not found`)
  const { pass, customer } = row
  const org = pass.organizationId

  if (consent) {
    const channels = consent.marketingChannels.filter((c) => c === "email" || (c === "sms" && Boolean(customer.phone)))
    const [terms] = await db.select({ v: s.organization.termsVersion }).from(s.organization).where(eq(s.organization.id, org))
    const source = consent.source ?? "checkout"
    // Safe to repeat: one purchase consent per pass, found by being recorded after the pass was made.
    const [already] = await db
      .select({ id: s.consent.id })
      .from(s.consent)
      .where(and(eq(s.consent.customerId, customer.id), eq(s.consent.source, source), gte(s.consent.recordedAt, pass.createdAt)))
      .limit(1)
    if (!already)
      await db.insert(s.consent).values({
        organizationId: org,
        customerId: customer.id,
        termsVersion: terms?.v,
        termsAcceptedAt: now,
        marketingOptIn: consent.marketingOptIn && channels.length > 0,
        marketingChannels: consent.marketingOptIn ? channels : [],
        source,
        recordedAt: now,
      })
  }

  await enqueue(db, org, "pass-onboard", pass.id, { passId: pass.id }, now)

  await queuePurchaseConfirmation(db, pass.id, origin, pass.id, extras)
  await queueStaffMessage(db, org, "admin-alert", `new-pass:${pass.id}`, { origin, title: `New Season Pass ${pass.number}`, detail: `${customer.firstName} in ${row.town} bought Season Pass ${pass.number}.`, path: "/admin/passes" })
}

/** The purchase confirmation for a pass, with whatever the pass holds today: each visit's day and calendar links, or its window wording, and how the money comes (the card on file, the link to add one, or at each visit). `key` makes it once per purchase; an admin's resend uses a new one. */
export async function queuePurchaseConfirmation(db: Database, passId: string, origin: string, key: string, extras: PurchaseExtras = {}): Promise<boolean> {
  const [row] = await db
    .select({ pass: s.seasonPass, customer: s.customer, town: s.property.town })
    .from(s.seasonPass)
    .innerJoin(s.customer, eq(s.customer.id, s.seasonPass.customerId))
    .innerJoin(s.property, eq(s.property.id, s.seasonPass.propertyId))
    .where(eq(s.seasonPass.id, passId))
  if (!row) throw new Error(`Pass ${passId} not found`)
  const { pass, customer } = row
  const org = pass.organizationId
  const visits = await db.select().from(s.visit).where(eq(s.visit.passId, pass.id))
  const ordered = (["turn-on", "inspection", "blowout"] as const).flatMap((k) => visits.filter((v) => v.kind === k))
  const filled = await db.select().from(s.passChange).where(and(eq(s.passChange.passId, pass.id), eq(s.passChange.kind, "day-filled")))
  const held = []
  for (const v of ordered) {
    const facts = v.scheduledOn ? await loadVisitFacts(db, v.id, origin) : null
    const moved = filled.find((c) => c.visitId === v.id)?.detail as { from?: string; to?: string } | undefined
    held.push({ kind: v.kind, name: kindName(v.kind), amount: v.amount, visit: facts, fallback: "Ryan sets the day and we text it to you.", ...(moved?.from && v.scheduledOn ? { note: filledLine(moved.from, v.scheduledOn) } : {}) })
  }
  // What was sold, from the pass job's lines (a pass bought before lines existed has none, and the email leaves the list out).
  const lineRows = await db.select().from(s.lineItem).where(and(eq(s.lineItem.jobId, pass.jobId), isNull(s.lineItem.cancelledAt))).orderBy(asc(s.lineItem.createdAt), asc(s.lineItem.id))
  const lines = lineRows.map((l) => ({ name: l.name, amount: l.quantity * l.unitPrice }))
  return queueMessage(db, {
    organizationId: org, customerId: customer.id, kind: "purchase-confirmation", key,
    data: { ...baseData(origin, customer), passNumber: pass.number, season: pass.season, town: row.town, passImageUrl: passImageUrl(origin, pass.id), visits: held, ...(lines.length ? { lines } : {}), cardLast4: customer.cardLast4, cardUpdateUrl: extras.cardUpdateUrl ?? null },
  })
}
