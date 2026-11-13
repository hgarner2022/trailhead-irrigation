import "server-only"
import { eq } from "drizzle-orm"
import type Stripe from "stripe"
import { emitEvent } from "@/api/v1/webhooks/deliver"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { paymentMethodFromSession } from "@/lib/stripe/checkout"

/**
 * Stores the card a finished setup session saved, makes it the customer's default and turns the pending pass active.
 * Running it twice for one session changes nothing the second time (the webhook and the page both call it).
 */
export async function activatePass(db: Database, stripe: Stripe, passId: string, setupSessionId: string, now = new Date()): Promise<"activated" | "already-active"> {
  const card = await paymentMethodFromSession(stripe, setupSessionId)
  if (card.passId !== passId) throw new Error("This card step belongs to a different pass")
  const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, passId))
  if (!pass) throw new Error(`Pass ${passId} not found`)
  if (pass.status === "active" && pass.stripePaymentMethodId === card.paymentMethodId) return "already-active"
  if (pass.status === "cancelled") throw new Error("This pass was cancelled")
  await db.update(s.customer).set({ stripeCustomerId: card.customerId, updatedAt: now }).where(eq(s.customer.id, pass.customerId))
  await stripe.customers.update(card.customerId, { invoice_settings: { default_payment_method: card.paymentMethodId } })
  await db
    .update(s.seasonPass)
    .set({ status: "active", stripePaymentMethodId: card.paymentMethodId, cardBrand: card.brand, cardLast4: card.last4, cardExpires: card.expires, cardFailedAt: null, updatedAt: now })
    .where(eq(s.seasonPass.id, passId))
  await emitEvent(db, pass.organizationId, "pass.bought", { passId, number: pass.number })
  return "activated"
}
