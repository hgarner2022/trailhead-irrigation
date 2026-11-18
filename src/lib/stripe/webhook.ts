import "server-only"
import { and, desc, eq, isNull } from "drizzle-orm"
import type Stripe from "stripe"
import { callApi } from "@/api/core/call"
import { passesActivate } from "@/api/v1/passes/handlers"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { ctxForJob } from "@/lib/admin/api-ctx"
import { clearedCardColumns } from "@/lib/customer/card"
import { visitName } from "@/lib/events/names"
import { recordEvent } from "@/lib/events/record"
import { paidDay } from "@/lib/money/record"
import { baseData } from "@/lib/messaging/data"
import { queueMessage } from "@/lib/messaging/queue"
import { enqueue } from "@/lib/queue"
import { applyCardUpdate, createCardUpdateSession } from "./card-update"
import { applyInvoicePayment } from "./invoice-payment"

export type ReceiveResult = { status: 200; queued: boolean } | { status: 400 | 503; error: string }

export const WEBHOOK_NOT_CONFIGURED = "webhook not configured"

/** The organization an event belongs to, read from the pass, payment method or charge it names; null for an event we do not act on. */
export async function organizationOfEvent(db: Database, event: Stripe.Event): Promise<string | null> {
  const obj = event.data.object as unknown as { id?: string; metadata?: Record<string, string> | null }
  const passId = obj.metadata?.passId
  const invoiceId = obj.metadata?.invoiceId
  if (event.type === "checkout.session.completed" || event.type.startsWith("payment_intent.")) {
    // A bill's session and its payment intent both carry the invoice id (the pay page sets it on each).
    if (invoiceId) {
      const [bill] = await db.select({ org: s.invoice.organizationId }).from(s.invoice).where(eq(s.invoice.id, invoiceId))
      if (bill) return bill.org
    }
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
    const [owner] = await db.select({ org: s.customer.organizationId }).from(s.customer).where(eq(s.customer.stripePaymentMethodId, obj.id))
    if (owner) return owner.org
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
      else if (session.metadata?.purpose === "invoice") await applyInvoicePayment(db, stripe, organizationId, session, origin, now)
      else if (session.metadata?.purpose === "pass-setup" && session.metadata.passId) {
        const ctx = await ctxForJob(organizationId, { database: () => db, now: () => now })
        await callApi(ctx, passesActivate, { id: session.metadata.passId, setupSessionId: session.id })
      }
      return
    }
    case "payment_intent.succeeded":
    case "payment_intent.payment_failed": {
      const intent = event.data.object
      const [charge] = await db.select().from(s.charge).where(and(eq(s.charge.stripePaymentIntentId, intent.id), eq(s.charge.organizationId, organizationId)))
      if (!charge) return
      if (event.type === "payment_intent.succeeded" && charge.status !== "succeeded") {
        // A row written before payments carried their job (a pending attempt from the old charge) is completed from its visit; paid_on is the day the money arrived.
        const [visit] = charge.visitId ? await db.select({ jobId: s.visit.jobId, customerId: s.visit.customerId }).from(s.visit).where(eq(s.visit.id, charge.visitId)) : []
        await db
          .update(s.charge)
          .set({ status: "succeeded", failureMessage: null, paidOn: paidDay(now), jobId: charge.jobId ?? visit?.jobId ?? null, customerId: charge.customerId ?? visit?.customerId ?? null, updatedAt: now })
          .where(eq(s.charge.id, charge.id))
        if (charge.visitId) await db.update(s.visit).set({ chargedAt: now, stripePaymentIntentId: intent.id, updatedAt: now }).where(eq(s.visit.id, charge.visitId))
      } else if (event.type === "payment_intent.payment_failed" && charge.status === "pending") {
        const message = intent.last_payment_error?.message ?? "The payment failed"
        await db.update(s.charge).set({ status: "failed", failureMessage: message, updatedAt: now }).where(eq(s.charge.id, charge.id))
        // Only the run that moves the payment from pending to failed writes the event, so a redelivery adds none.
        const [owner] = charge.visitId ? await db.select({ kind: s.visit.kind, jobId: s.visit.jobId, customerId: s.visit.customerId }).from(s.visit).where(eq(s.visit.id, charge.visitId)) : []
        await recordEvent(db, { organizationId, about: "payment", aboutId: charge.id, customerId: charge.customerId ?? owner?.customerId, jobId: charge.jobId ?? owner?.jobId, visitId: charge.visitId, kind: "payment.failed", detail: { amount: charge.amount, message, ...(owner ? { name: visitName(owner.kind) } : {}) }, who: "system", at: now })
      }
      return
    }
    case "payment_method.detached": {
      const method = event.data.object
      const ofOrg = eq(s.customer.organizationId, organizationId)
      // The customer holds the card; a pass still carrying it as the alias (the old column) finds the customer too.
      const [byCustomer] = await db.select().from(s.customer).where(and(eq(s.customer.stripePaymentMethodId, method.id), ofOrg))
      let customer = byCustomer
      if (!customer) {
        const [alias] = await db
          .select({ customer: s.customer })
          .from(s.seasonPass)
          .innerJoin(s.customer, eq(s.customer.id, s.seasonPass.customerId))
          .where(and(eq(s.seasonPass.stripePaymentMethodId, method.id), eq(s.seasonPass.organizationId, organizationId), ofOrg))
        customer = alias?.customer
      }
      if (!customer) return
      const aliasOfMethod = and(eq(s.seasonPass.customerId, customer.id), eq(s.seasonPass.stripePaymentMethodId, method.id))
      // The customer already holds a newer card (a card update detaches the old one): only the stale pass aliases go, and nobody is told.
      if (customer.stripePaymentMethodId && customer.stripePaymentMethodId !== method.id) {
        await db.update(s.seasonPass).set({ ...clearedCardColumns, updatedAt: now }).where(aliasOfMethod)
        return
      }
      await db.update(s.customer).set({ ...clearedCardColumns, updatedAt: now }).where(and(eq(s.customer.id, customer.id), ofOrg))
      await db.update(s.seasonPass).set({ ...clearedCardColumns, updatedAt: now }).where(aliasOfMethod)
      await recordEvent(db, { organizationId, about: "customer", aboutId: customer.id, customerId: customer.id, kind: "card.removed", detail: { brand: customer.cardBrand, last4: customer.cardLast4 }, who: "system", at: now })
      // The pass that speaks for the customer is their newest active one.
      const [row] = await db
        .select({ pass: s.seasonPass, number: s.job.passNumber })
        .from(s.seasonPass)
        .innerJoin(s.job, eq(s.job.id, s.seasonPass.jobId))
        .where(and(eq(s.seasonPass.customerId, customer.id), eq(s.job.kind, "pass"), eq(s.job.status, "active"), isNull(s.job.cancelledAt)))
        .orderBy(desc(s.seasonPass.createdAt))
        .limit(1)
      if (!row || !customer.email) return
      const link = customer.stripeCustomerId ? (await createCardUpdateSession(stripe, { passId: row.pass.id, customerId: customer.stripeCustomerId, origin })).url : null
      const owed = await db.select({ amount: s.visit.amount, status: s.visit.status }).from(s.visit).where(eq(s.visit.passId, row.pass.id))
      const left = owed.filter((v) => !["completed", "cancelled", "skipped"].includes(v.status)).reduce((sum, v) => sum + v.amount, 0)
      await queueMessage(db, {
        organizationId, customerId: customer.id, kind: "card-expiring", key: `pm-${method.id}`,
        data: { ...baseData(origin, customer), passNumber: row.number ?? row.pass.number, cardState: "was removed or has expired", left, updateUrl: link },
      })
      return
    }
    default:
      return
  }
}
