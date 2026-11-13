import "server-only"
import { and, desc, eq, isNull } from "drizzle-orm"
import type Stripe from "stripe"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { enqueue } from "@/lib/queue"
import { paymentMethodFromSession } from "./checkout"

/** The hosted setup session behind "update your card": saves a new card on the customer and returns to the card-updated page. Stripe keeps the link live for 24 hours. */
export async function createCardUpdateSession(stripe: Stripe, input: { passId: string; customerId: string; origin: string }): Promise<{ id: string; url: string }> {
  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    ui_mode: "hosted_page",
    customer: input.customerId,
    success_url: `${input.origin}/account/pass/card-updated`,
    metadata: { purpose: "card-update", passId: input.passId },
  })
  if (!session.url) throw new Error("Stripe returned no address for the card-update session")
  return { id: session.id, url: session.url }
}

/**
 * Stores the new card on the pass, makes it the customer's default, removes the old one and queues one retry for each
 * visit whose charge failed. Safe to run twice for one session: the second sees the card already stored and does nothing.
 */
export async function applyCardUpdate(db: Database, stripe: Stripe, sessionId: string, now = new Date()): Promise<"applied" | "already-applied"> {
  const card = await paymentMethodFromSession(stripe, sessionId)
  if (card.purpose !== "card-update" || !card.passId) throw new Error("This session is not a card update")
  const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, card.passId))
  if (!pass) throw new Error(`Pass ${card.passId} not found`)
  if (pass.stripePaymentMethodId === card.paymentMethodId) return "already-applied"
  const old = pass.stripePaymentMethodId
  await db
    .update(s.seasonPass)
    .set({ stripePaymentMethodId: card.paymentMethodId, cardBrand: card.brand, cardLast4: card.last4, cardExpires: card.expires, cardFailedAt: null, updatedAt: now })
    .where(eq(s.seasonPass.id, pass.id))
  await db.update(s.customer).set({ stripeCustomerId: card.customerId, updatedAt: now }).where(eq(s.customer.id, pass.customerId))
  await stripe.customers.update(card.customerId, { invoice_settings: { default_payment_method: card.paymentMethodId } })
  if (old) await stripe.paymentMethods.detach(old).catch(() => undefined)
  const failed = await db
    .select({ visitId: s.charge.visitId })
    .from(s.charge)
    .innerJoin(s.visit, eq(s.visit.id, s.charge.visitId))
    .where(and(eq(s.charge.passId, pass.id), eq(s.charge.status, "failed"), isNull(s.visit.chargedAt)))
    .orderBy(desc(s.charge.createdAt))
  for (const visitId of new Set(failed.map((f) => f.visitId))) {
    await enqueue(db, pass.organizationId, "pass-charge", `${visitId}:card-${sessionId}`, { visitId, afterCardUpdate: true })
  }
  return "applied"
}
