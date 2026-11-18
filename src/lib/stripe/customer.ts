import "server-only"
import { and, eq } from "drizzle-orm"
import type Stripe from "stripe"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"

/**
 * The Stripe customer behind one of ours, made on first need. The checkout makes it when the card is saved; a pass sold by the
 * office with no card yet has none, and the card link (the email at the sale, "Send card link" on the pass panel, "Add a card" on
 * the pass page) needs one to hang the card on.
 * `organizationId`, when the caller knows it, scopes the customer lookup to it.
 */
export async function ensureStripeCustomer(db: Database, stripe: Stripe, customerId: string, now = new Date(), organizationId?: string): Promise<string> {
  const [customer] = await db.select().from(s.customer).where(and(eq(s.customer.id, customerId), organizationId ? eq(s.customer.organizationId, organizationId) : undefined))
  if (!customer) throw new Error(`Customer ${customerId} not found`)
  if (customer.stripeCustomerId) return customer.stripeCustomerId
  const made = await stripe.customers.create({
    ...(customer.email ? { email: customer.email } : {}),
    name: [customer.firstName, customer.lastName].filter(Boolean).join(" "),
    metadata: { customerId: customer.id },
  })
  await db.update(s.customer).set({ stripeCustomerId: made.id, updatedAt: now }).where(and(eq(s.customer.id, customer.id), eq(s.customer.organizationId, customer.organizationId)))
  return made.id
}
