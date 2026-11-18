import "server-only"
import { and, eq } from "drizzle-orm"
import type Stripe from "stripe"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { BUSINESS } from "@/emails/format"
import { signToken, verifyToken } from "@/lib/messaging/tokens"
import { invoiceStatus } from "@/lib/money/invoice"
import { paidDay } from "@/lib/money/record"
import { jobOwed } from "@/lib/money/words"
import { toCents } from "./client"
import { ensureStripeCustomer } from "./customer"

export type StartBillPayment = { ok: true; url: string } | { ok: false; message: string }

const NO_FORM = `We couldn't open the card form. Try again, or call Ryan at ${BUSINESS.phone}.`

/**
 * The pay page's button: opens a Stripe Checkout Session in payment mode for the bill's total and returns the address to send the
 * customer to. The token is checked here again (the action is reachable by anyone). A bill that is paid or cancelled, or whose job
 * was paid by check, Venmo or cash in the meantime, opens nothing. The session keeps the card for later (`setup_future_usage`), and
 * both it and its payment intent carry the invoice id so the webhook finds the bill. The session's id is stored on the bill.
 */
export async function startBillPayment(db: Database, stripe: Stripe, input: { invoiceId: string; token: string | null; origin: string; now?: Date }): Promise<StartBillPayment> {
  const now = input.now ?? new Date()
  if (!verifyToken("invoice-pay", input.invoiceId, input.token)) return { ok: false, message: "This link didn't work. Use the link in your text or email." }
  const [invoice] = await db.select().from(s.invoice).where(eq(s.invoice.id, input.invoiceId))
  if (!invoice) return { ok: false, message: `We couldn't find this bill. Call Ryan at ${BUSINESS.phone}.` }
  const status = invoiceStatus(invoice, paidDay(now))
  if (status === "paid") return { ok: false, message: "This bill is already paid." }
  if (status === "cancelled") return { ok: false, message: "This bill was cancelled." }
  const org = invoice.organizationId
  const [lines, payments] = await Promise.all([
    db.select().from(s.lineItem).where(and(eq(s.lineItem.jobId, invoice.jobId), eq(s.lineItem.organizationId, org))),
    db.select().from(s.charge).where(and(eq(s.charge.jobId, invoice.jobId), eq(s.charge.organizationId, org))),
  ])
  // Money that arrived another way (a check, Venmo or cash) while the page was open: nothing owed is a paid bill, and less owed than the bill asks needs a new amount from the office.
  const owed = jobOwed(lines.filter((l) => !l.cancelledAt), payments)
  if (owed <= 0) return { ok: false, message: "This bill is already paid." }
  if (owed < invoice.total) return { ok: false, message: "Part of this bill was paid another way. Please call us for the new amount." }
  if (invoice.total <= 0) return { ok: false, message: "There is nothing to pay on this bill." }
  try {
    const customer = await ensureStripeCustomer(db, stripe, invoice.customerId, now, org)
    const metadata = { purpose: "invoice", invoiceId: invoice.id }
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer,
        // Only a card: the page says the card is kept for the visits after this one, and a bank debit could not be charged off-session.
        allowed_payment_method_types: ["card"],
        line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: toCents(invoice.total), product_data: { name: `Trailhead bill ${invoice.number}` } } }],
        payment_intent_data: { setup_future_usage: "off_session", metadata },
        metadata,
        success_url: `${input.origin}/pay/${invoice.id}/paid`,
        cancel_url: `${input.origin}/pay/${invoice.id}?token=${signToken("invoice-pay", invoice.id)}`,
      },
      // Two presses of the button in one minute open one session.
      { idempotencyKey: `bill-${invoice.id}-${Math.floor(now.getTime() / 60_000)}` },
    )
    if (!session.url) return { ok: false, message: NO_FORM }
    await db.update(s.invoice).set({ stripeCheckoutSessionId: session.id, updatedAt: now }).where(and(eq(s.invoice.id, invoice.id), eq(s.invoice.organizationId, org)))
    return { ok: true, url: session.url }
  } catch (error) {
    console.error("Could not open the card form for a bill", error instanceof Error ? error.message : "unknown error")
    return { ok: false, message: NO_FORM }
  }
}
