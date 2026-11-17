import "server-only"
import { syncPassJob } from "./job"
import { eq } from "drizzle-orm"
import type Stripe from "stripe"
import { emitEvent } from "@/api/v1/webhooks/deliver"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { cardColumns } from "@/lib/customer/card"
import { paymentMethodFromSession, type SavedCard } from "@/lib/stripe/checkout"

async function jobCancelled(db: Database, jobId: string): Promise<boolean> {
  const [job] = await db.select({ status: s.job.status, cancelledAt: s.job.cancelledAt }).from(s.job).where(eq(s.job.id, jobId))
  return job?.status === "cancelled" || !!job?.cancelledAt
}

/**
 * Turns a pass active, with the card it was bought on when there is one (the checkout) or none (an office sale that pays at
 * each visit, or by a card link later). The job follows the pass and `pass.bought` goes out. The part of activation that has
 * nothing to do with Stripe, so the checkout and `passes.sell` share it.
 */
export async function markPassActive(db: Database, pass: typeof s.seasonPass.$inferSelect, card: SavedCard | null, now = new Date()): Promise<void> {
  if (pass.status === "cancelled" || (await jobCancelled(db, pass.jobId))) throw new Error("This pass was cancelled")
  // The job first, the pass alias second (`syncPassJob` below copies the rest).
  await db.update(s.job).set({ status: "active", updatedAt: now }).where(eq(s.job.id, pass.jobId))
  // The card lives on the customer; the pass gets the same columns as an alias until step 6.
  if (card) {
    const columns = cardColumns(card)
    await db.update(s.customer).set({ ...columns, updatedAt: now }).where(eq(s.customer.id, pass.customerId))
    await db.update(s.seasonPass).set({ status: "active", ...columns, updatedAt: now }).where(eq(s.seasonPass.id, pass.id))
  } else {
    await db.update(s.seasonPass).set({ status: "active", updatedAt: now }).where(eq(s.seasonPass.id, pass.id))
  }
  await syncPassJob(db, pass.id)
  await emitEvent(db, pass.organizationId, "pass.bought", { passId: pass.id, number: pass.number })
}

/**
 * Stores the card a finished setup session saved, makes it the customer's default and turns the pending pass active.
 * Running it twice for one session changes nothing the second time (the webhook and the page both call it).
 */
export async function activatePass(db: Database, stripe: Stripe, passId: string, setupSessionId: string, now = new Date()): Promise<"activated" | "already-active"> {
  const card = await paymentMethodFromSession(stripe, setupSessionId)
  if (card.passId !== passId) throw new Error("This card step belongs to a different pass")
  const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, passId))
  if (!pass) throw new Error(`Pass ${passId} not found`)
  const [owner] = await db.select({ method: s.customer.stripePaymentMethodId }).from(s.customer).where(eq(s.customer.id, pass.customerId))
  if (pass.status === "active" && (owner?.method ?? pass.stripePaymentMethodId) === card.paymentMethodId) return "already-active"
  if (pass.status === "cancelled") throw new Error("This pass was cancelled")
  await db.update(s.customer).set({ stripeCustomerId: card.customerId, updatedAt: now }).where(eq(s.customer.id, pass.customerId))
  await stripe.customers.update(card.customerId, { invoice_settings: { default_payment_method: card.paymentMethodId } })
  await markPassActive(db, pass, card, now)
  return "activated"
}
