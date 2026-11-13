import "server-only"
import { and, asc, eq, gte } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { enqueue } from "@/lib/queue"
import { dollars, kindName, nextVisitLine, queueEmail } from "./messages"

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

  if (customer.email) {
    const visits = await db.select().from(s.visit).where(eq(s.visit.passId, pass.id)).orderBy(asc(s.visit.amount))
    const list = ["turn-on", "inspection", "blowout"].flatMap((k) => visits.filter((v) => v.kind === k)).map((v) => `${kindName(v.kind)}, ${dollars(v.amount)}`).join("; ")
    await queueEmail(db, {
      organizationId: org,
      customerId: customer.id,
      kind: "purchase-confirmation",
      key: pass.id,
      to: customer.email,
      subject: `Your Trailhead Season Pass ${pass.number}`,
      body: [
        `Hi ${customer.firstName}, your Season Pass ${pass.number} is reserved for ${row.town}. Nothing was charged today.`,
        `Visits: ${list}. Each is charged to the saved card after the visit, at the price shown.`,
        nextVisitLine(visits.map((v) => ({ kind: v.kind, status: v.status, scheduledOn: v.scheduledOn, preference: v.preference }))),
        `Your pass, with a button to save it as an image: ${origin}/account/pass`,
      ].join("\n\n"),
    })
  }
}
