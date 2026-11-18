import "server-only"
import { and, eq, isNull } from "drizzle-orm"
import type Stripe from "stripe"
import { emitEvent } from "@/api/v1/webhooks/deliver"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { cardColumns } from "@/lib/customer/card"
import { recordEventSafe } from "@/lib/events/record"
import { baseData } from "@/lib/messaging/data"
import { queueMessage } from "@/lib/messaging/queue"
import { paidDay, recordPaymentRow } from "@/lib/money/record"

export type InvoicePaymentResult = "recorded" | "already-recorded" | "ignored"

/** "Visa ending 4242" from a Stripe card, the way the receipts say it. */
const cardWords = (card: { brand: string; last4: string }) => `${card.brand.charAt(0).toUpperCase()}${card.brand.slice(1)} ending ${card.last4}`

/**
 * A bill's Checkout Session completed: writes the payment, marks the bill paid, keeps the card on the customer and queues the receipt.
 * Safe to run any number of times for the same payment (a redelivered event, a second event for one session, a retry after a crash
 * half way): the payment row is unique on its Stripe payment intent, so only the run that inserts it emits `payment.succeeded`, and every
 * later step is a no-op the second time (the card already stored, the visits already stamped, the receipt keyed by the payment row,
 * the bill's update only while it is unpaid). The database handle has no transactions, so the order is the guarantee: every Stripe call
 * first, then the payment row, then the event, then the steps that follow from the row, and the bill's paid day last, so a retry after a
 * crash finds the bill unpaid and finishes the work. A bill cancelled before the money arrived still gets the payment row (the money
 * is real and the customer is owed a receipt) and is left cancelled: nothing reopens it.
 */
export async function applyInvoicePayment(db: Database, stripe: Stripe, organizationId: string, session: Stripe.Checkout.Session, origin: string, now = new Date()): Promise<InvoicePaymentResult> {
  const invoiceId = session.metadata?.invoiceId
  if (!invoiceId || session.metadata?.purpose !== "invoice" || session.payment_status !== "paid") return "ignored"
  const [invoice] = await db.select().from(s.invoice).where(and(eq(s.invoice.id, invoiceId), eq(s.invoice.organizationId, organizationId)))
  const intentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id
  if (!invoice || !intentId) return "ignored"
  const [taken] = await db.select({ id: s.charge.id }).from(s.charge).where(and(eq(s.charge.stripePaymentIntentId, intentId), eq(s.charge.organizationId, organizationId)))
  // Settled already: the row is there and the bill is marked (or was cancelled and is left alone).
  if (taken && (invoice.paidOn || invoice.cancelledAt)) return "already-recorded"

  const intent = await stripe.paymentIntents.retrieve(intentId, { expand: ["latest_charge", "payment_method"] })
  const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null
  const method = typeof intent.payment_method === "object" ? intent.payment_method : null
  const receiptUrl = charge?.receipt_url ?? null

  const inserted = await recordPaymentRow(db, {
    organizationId, jobId: invoice.jobId, visitId: null, customerId: invoice.customerId, amount: invoice.total, method: "card_now", status: "succeeded",
    stripePaymentIntentId: intentId, receiptUrl, now,
  })
  const [row] = inserted ? [inserted] : await db.select().from(s.charge).where(and(eq(s.charge.stripePaymentIntentId, intentId), eq(s.charge.organizationId, organizationId)))
  if (!row) return "ignored"
  if (inserted) await emitEvent(db, organizationId, "payment.succeeded", { paymentId: row.id, jobId: invoice.jobId, invoiceId: invoice.id, amount: row.amount, method: "card_now" }, {
      about: "payment", aboutId: row.id, customerId: invoice.customerId, jobId: invoice.jobId, who: "system", at: now,
      detail: { amount: row.amount, method: "card_now", invoiceNumber: invoice.number },
    })

  const [customer] = await db.select().from(s.customer).where(and(eq(s.customer.id, invoice.customerId), eq(s.customer.organizationId, organizationId)))
  // Keep the card: the customer's one card is the one just paid with (the pay page says so), on the pass aliases too.
  if (customer && method?.card && customer.stripePaymentMethodId !== method.id) {
    const columns = cardColumns({ paymentMethodId: method.id, brand: method.card.brand, last4: method.card.last4, expires: `${method.card.exp_year}-${String(method.card.exp_month).padStart(2, "0")}` })
    const stripeCustomerId = customer.stripeCustomerId ?? (typeof session.customer === "string" ? session.customer : session.customer?.id ?? null)
    await db.update(s.customer).set({ ...(stripeCustomerId ? { stripeCustomerId } : {}), ...columns, updatedAt: now }).where(and(eq(s.customer.id, customer.id), eq(s.customer.organizationId, organizationId)))
    await db.update(s.seasonPass).set({ ...columns, updatedAt: now }).where(and(eq(s.seasonPass.customerId, customer.id), eq(s.seasonPass.organizationId, organizationId)))
    await recordEventSafe(db, { organizationId, about: "customer", aboutId: customer.id, customerId: customer.id, kind: "card.saved", detail: { brand: method.card.brand, last4: method.card.last4 }, who: "system", at: now })
    if (stripeCustomerId) await stripe.customers.update(stripeCustomerId, { invoice_settings: { default_payment_method: method.id } })
    if (customer.stripePaymentMethodId) await stripe.paymentMethods.detach(customer.stripePaymentMethodId).catch(() => undefined)
  }
  // The legacy alias: the job's done visits read as charged until step 6 drops the column (the screens read the payment rows).
  await db.update(s.visit).set({ chargedAt: now, updatedAt: now }).where(and(eq(s.visit.jobId, invoice.jobId), eq(s.visit.organizationId, organizationId), eq(s.visit.status, "completed"), isNull(s.visit.chargedAt)))
  if (customer) {
    await queueMessage(db, {
      organizationId, customerId: customer.id, kind: "receipt", key: `payment-${row.id}`,
      data: {
        ...baseData(origin, customer), passNumber: null, amount: row.amount, invoiceNumber: invoice.number, lines: invoice.lines.map((l) => ({ name: l.name, amount: l.quantity * l.unitPrice })),
        tax: invoice.tax, total: invoice.total, card: method?.card ? cardWords(method.card) : null, nextLine: "", receiptUrl,
      },
    })
  }
  if (!invoice.cancelledAt) {
    // Only the run that marks the bill paid writes `invoice.paid`, so a redelivered event adds none.
    const settled = await db.update(s.invoice).set({ paidOn: paidDay(now), paymentId: row.id, stripePaymentIntentId: intentId, updatedAt: now }).where(and(eq(s.invoice.id, invoice.id), eq(s.invoice.organizationId, organizationId), isNull(s.invoice.paidOn), isNull(s.invoice.cancelledAt))).returning({ id: s.invoice.id })
    if (settled.length) await recordEventSafe(db, { organizationId, about: "invoice", aboutId: invoice.id, customerId: invoice.customerId, jobId: invoice.jobId, kind: "invoice.paid", detail: { number: invoice.number, total: invoice.total, how: "card_now" }, who: "system", at: now })
  }
  return inserted ? "recorded" : "already-recorded"
}
