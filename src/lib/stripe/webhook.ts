import "server-only"
import { eq } from "drizzle-orm"
import type Stripe from "stripe"
import { callApi } from "@/api/core/call"
import { passesActivate } from "@/api/v1/passes/handlers"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { ctxForJob } from "@/lib/admin/api-ctx"
import { baseData } from "@/lib/messaging/data"
import { queueMessage } from "@/lib/messaging/queue"
import { enqueue } from "@/lib/queue"
import { applyCardUpdate, createCardUpdateSession } from "./card-update"

export type ReceiveResult = { status: 200; queued: boolean } | { status: 400 | 503; error: string }

export const WEBHOOK_NOT_CONFIGURED = "webhook not configured"

/** The organization an event belongs to, read from the pass, payment method or charge it names; null for an event we do not act on. */
export async function organizationOfEvent(db: Database, event: Stripe.Event): Promise<string | null> {
  const obj = event.data.object as unknown as { id?: string; metadata?: Record<string, string> | null }
  const passId = obj.metadata?.passId
  if (event.type === "checkout.session.completed" || event.type.startsWith("payment_intent.")) {
    if (passId) {
      const [pass] = await db.select({ org: s.seasonPass.organizationId }).from(s.seasonPass).where(eq(s.seasonPass.id, passId))
      if (pass) return pass.org
    }
    if (event.type.startsWith("payment_intent.") && obj.id) {
      const [c] = await db.select({ org: s.charge.organizationId }).from(s.charge).where(eq(s.charge.stripePaymentIntentId, obj.id))
      if (c) return c.org
    }
    return null
  }
  if (event.type === "payment_method.detached" && obj.id) {
    const [pass] = await db.select({ org: s.seasonPass.organizationId }).from(s.seasonPass).where(eq(s.seasonPass.stripePaymentMethodId, obj.id))
    return pass?.org ?? null
  }
  return null
}

/**
 * The webhook route's work: verify the signature on the raw body, then queue the event on its id. A replayed event
 * finds its id taken and queues nothing. An event of a kind we do not use, or for a pass we do not know, is answered 200.
 */
export async function receiveStripeEvent(db: Database, stripe: Stripe, secret: string | undefined, body: string, signature: string | null): Promise<ReceiveResult> {
  if (!secret) return { status: 503, error: WEBHOOK_NOT_CONFIGURED }
  let event: Stripe.Event
  try {
    if (!signature) throw new Error("No Stripe-Signature header")
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch (error) {
    return { status: 400, error: error instanceof Error ? error.message : "Bad signature" }
  }
  const organizationId = await organizationOfEvent(db, event)
  if (!organizationId) return { status: 200, queued: false }
  return { status: 200, queued: await enqueue(db, organizationId, "stripe-webhook", event.id, { event: event as unknown as Record<string, unknown> }) }
}

/** The `stripe-webhook` queue handler body: one verified event, by type. Each branch is safe to run twice. */
export async function handleStripeEvent(db: Database, stripe: Stripe, organizationId: string, event: Stripe.Event, origin: string, now = new Date()): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object
      if (session.metadata?.purpose === "card-update") await applyCardUpdate(db, stripe, session.id, now)
      else if (session.metadata?.purpose === "pass-setup" && session.metadata.passId) {
        const ctx = await ctxForJob(organizationId, { database: () => db, now: () => now })
        await callApi(ctx, passesActivate, { id: session.metadata.passId, setupSessionId: session.id })
      }
      return
    }
    case "payment_intent.succeeded":
    case "payment_intent.payment_failed": {
      const intent = event.data.object
      const [charge] = await db.select().from(s.charge).where(eq(s.charge.stripePaymentIntentId, intent.id))
      if (!charge) return
      if (event.type === "payment_intent.succeeded" && charge.status !== "succeeded") {
        await db.update(s.charge).set({ status: "succeeded", failureMessage: null, updatedAt: now }).where(eq(s.charge.id, charge.id))
        await db.update(s.visit).set({ chargedAt: now, stripePaymentIntentId: intent.id, updatedAt: now }).where(eq(s.visit.id, charge.visitId))
      } else if (event.type === "payment_intent.payment_failed" && charge.status === "pending") {
        await db.update(s.charge).set({ status: "failed", failureMessage: intent.last_payment_error?.message ?? "The payment failed", updatedAt: now }).where(eq(s.charge.id, charge.id))
      }
      return
    }
    case "payment_method.detached": {
      const method = event.data.object
      const [row] = await db
        .select({ pass: s.seasonPass, customer: s.customer })
        .from(s.seasonPass)
        .innerJoin(s.customer, eq(s.customer.id, s.seasonPass.customerId))
        .where(eq(s.seasonPass.stripePaymentMethodId, method.id))
      if (!row) return
      await db.update(s.seasonPass).set({ stripePaymentMethodId: null, cardBrand: null, cardLast4: null, cardExpires: null, updatedAt: now }).where(eq(s.seasonPass.id, row.pass.id))
      if (row.customer.email) {
        const link = row.customer.stripeCustomerId ? (await createCardUpdateSession(stripe, { passId: row.pass.id, customerId: row.customer.stripeCustomerId, origin })).url : null
        const owed = await db.select({ amount: s.visit.amount, status: s.visit.status }).from(s.visit).where(eq(s.visit.passId, row.pass.id))
        const left = owed.filter((v) => !["completed", "cancelled", "skipped"].includes(v.status)).reduce((sum, v) => sum + v.amount, 0)
        await queueMessage(db, {
          organizationId, customerId: row.customer.id, kind: "card-expiring", key: `pm-${method.id}`,
          data: { ...baseData(origin, row.customer), passNumber: row.pass.number, cardState: "was removed or has expired", left, updateUrl: link },
        })
      }
      return
    }
    default:
      return
  }
}
