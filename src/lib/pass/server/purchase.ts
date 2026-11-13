import "server-only"
import { and, eq, gte } from "drizzle-orm"
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
}

/**
 * Everything that follows a card being saved on a pending pass, each step safe to repeat (so a retry after a failure part-way repeats nothing): the consent row (terms as accepted
 * now, marketing only for the ticked channels, `sms` only with a phone), the `pass-onboard` task and the queued
 * purchase confirmation. Sending is the messaging layer's job (Phase 12); the email only records what must go.
 */
export async function recordPurchase(db: Database, passId: string, consent: PurchaseConsent | undefined, origin: string, now: Date): Promise<void> {
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
    // Safe to repeat: one checkout consent per pass, found by being recorded after the pass was made.
    const [already] = await db
      .select({ id: s.consent.id })
      .from(s.consent)
      .where(and(eq(s.consent.customerId, customer.id), eq(s.consent.source, "checkout"), gte(s.consent.recordedAt, pass.createdAt)))
      .limit(1)
    if (!already)
      await db.insert(s.consent).values({
        organizationId: org,
        customerId: customer.id,
        termsVersion: terms?.v,
        termsAcceptedAt: now,
        marketingOptIn: consent.marketingOptIn && channels.length > 0,
        marketingChannels: consent.marketingOptIn ? channels : [],
        source: "checkout",
        recordedAt: now,
      })
  }

  await enqueue(db, org, "pass-onboard", pass.id, { passId: pass.id }, now)

  await queuePurchaseConfirmation(db, pass.id, origin, pass.id)
  await queueStaffMessage(db, org, "admin-alert", `new-pass:${pass.id}`, { origin, title: `New Season Pass ${pass.number}`, detail: `${customer.firstName} in ${row.town} bought Season Pass ${pass.number}.`, path: "/admin/passes" })
}

/** The purchase confirmation for a pass, with whatever the pass holds today: each visit's day and calendar links, or its window wording. `key` makes it once per purchase; an admin's resend uses a new one. */
export async function queuePurchaseConfirmation(db: Database, passId: string, origin: string, key: string): Promise<boolean> {
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
  return queueMessage(db, {
    organizationId: org, customerId: customer.id, kind: "purchase-confirmation", key,
    data: { ...baseData(origin, customer), passNumber: pass.number, season: pass.season, town: row.town, passImageUrl: passImageUrl(origin, pass.id), visits: held, cardLast4: pass.cardLast4 },
  })
}
