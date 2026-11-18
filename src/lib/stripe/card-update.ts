import "server-only"
import { and, desc, eq, inArray, isNull } from "drizzle-orm"
import type Stripe from "stripe"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { cardColumns } from "@/lib/customer/card"
import { recordEventSafe } from "@/lib/events/record"
import { enqueue } from "@/lib/queue"
import { paymentMethodFromSession } from "./checkout"

/** The hosted setup session behind "update your card": saves a new card on the customer and returns to the card-updated page. Stripe keeps the link live for 24 hours. */
export async function createCardUpdateSession(stripe: Stripe, input: { passId: string; customerId: string; origin: string }): Promise<{ id: string; url: string }> {
  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    // The 2026 API versions want a currency and a method type even in setup mode; only a card can be charged off-session later.
    currency: "usd",
    allowed_payment_method_types: ["card"],
    ui_mode: "hosted_page",
    customer: input.customerId,
    success_url: `${input.origin}/account/pass/card-updated`,
    metadata: { purpose: "card-update", passId: input.passId },
  })
  if (!session.url) throw new Error("Stripe returned no address for the card-update session")
  return { id: session.id, url: session.url }
}

/**
 * Stores the new card on the customer and on every pass of that customer (the alias), makes it the customer's default, removes the old
 * one and queues one retry for each visit whose charge failed on any of their passes. Safe to run twice for one session: the second
 * sees the card already stored and does nothing.
 */
export async function applyCardUpdate(db: Database, stripe: Stripe, sessionId: string, now = new Date()): Promise<"applied" | "already-applied"> {
  const card = await paymentMethodFromSession(stripe, sessionId)
  if (card.purpose !== "card-update" || !card.passId) throw new Error("This session is not a card update")
  const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, card.passId))
  if (!pass) throw new Error(`Pass ${card.passId} not found`)
  const org = pass.organizationId
  const mineOf = (customerId: string) => and(eq(s.seasonPass.customerId, customerId), eq(s.seasonPass.organizationId, org))
  const [owner] = await db.select({ method: s.customer.stripePaymentMethodId }).from(s.customer).where(and(eq(s.customer.id, pass.customerId), eq(s.customer.organizationId, org)))
  const current = owner?.method ?? pass.stripePaymentMethodId
  if (current === card.paymentMethodId) return "already-applied"
  const columns = cardColumns(card)
  await db.update(s.customer).set({ stripeCustomerId: card.customerId, ...columns, updatedAt: now }).where(and(eq(s.customer.id, pass.customerId), eq(s.customer.organizationId, org)))
  await db.update(s.seasonPass).set({ ...columns, updatedAt: now }).where(mineOf(pass.customerId))
  // Written after the "already stored" check above, so a second delivery for the same session adds none.
  await recordEventSafe(db, { organizationId: org, about: "customer", aboutId: pass.customerId, customerId: pass.customerId, kind: "card.saved", detail: { brand: card.brand, last4: card.last4 }, who: "system", at: now })
  await stripe.customers.update(card.customerId, { invoice_settings: { default_payment_method: card.paymentMethodId } })
  if (current) await stripe.paymentMethods.detach(current).catch(() => undefined)
  const passIds = (await db.select({ id: s.seasonPass.id }).from(s.seasonPass).where(mineOf(pass.customerId))).map((p) => p.id)
  const failed = await db
    .select({ visitId: s.charge.visitId })
    .from(s.charge)
    .innerJoin(s.visit, eq(s.visit.id, s.charge.visitId))
    .where(and(inArray(s.charge.passId, passIds), eq(s.charge.status, "failed"), isNull(s.visit.chargedAt)))
    .orderBy(desc(s.charge.createdAt))
  for (const visitId of new Set(failed.map((f) => f.visitId))) {
    await enqueue(db, org, "pass-charge", `${visitId}:card-${sessionId}`, { visitId, afterCardUpdate: true })
  }
  return "applied"
}
