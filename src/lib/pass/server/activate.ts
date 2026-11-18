import "server-only"
import { and, eq, isNull } from "drizzle-orm"
import type Stripe from "stripe"
import { mountainDay } from "@/api/v1/shared"
import { emitEvent } from "@/api/v1/webhooks/deliver"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { cardColumns } from "@/lib/customer/card"
import { recordEvent } from "@/lib/events/record"
import { paymentMethodFromSession, type SavedCard } from "@/lib/stripe/checkout"
import { loadPassRecord, type PassRecord } from "./record"
import { resolvePassJobAnywhere } from "./resolve"

/**
 * Turns a pending pass sold: claims the sale with one atomic update (`sold_on` is set only where it is still empty), so a page and
 * Stripe's webhook racing to activate one pass produce one winner. Only the winner saves the card on the customer, writes its
 * event and sends `pass.bought`; the loser changes nothing and gets `false`. A cancelled pass is refused. The part of activation
 * that has nothing to do with Stripe, so the checkout shares it with anything that activates a held pass.
 */
export async function markPassActive(db: Database, pass: PassRecord, card: SavedCard | null, now = new Date(), who = "system"): Promise<boolean> {
  if (pass.cancelledAt) throw new Error("This pass was cancelled")
  const claimed = await db
    .update(s.job)
    .set({ soldOn: mountainDay(now), updatedAt: now })
    .where(and(eq(s.job.id, pass.jobId), isNull(s.job.soldOn), isNull(s.job.cancelledAt)))
    .returning({ id: s.job.id })
  if (claimed.length === 0) {
    const [job] = await db.select({ cancelledAt: s.job.cancelledAt }).from(s.job).where(eq(s.job.id, pass.jobId))
    if (job?.cancelledAt) throw new Error("This pass was cancelled")
    return false
  }
  // The card lives on the customer.
  if (card) {
    await db.update(s.customer).set({ ...cardColumns(card), updatedAt: now }).where(eq(s.customer.id, pass.customerId))
    // A card saved at the checkout is the customer's event; an office sale (no card) writes none.
    await recordEvent(db, { organizationId: pass.organizationId, about: "customer", aboutId: pass.customerId, customerId: pass.customerId, kind: "card.saved", detail: { brand: card.brand, last4: card.last4 }, who, at: now })
  }
  await emitEvent(db, pass.organizationId, "pass.bought", { passId: pass.id, number: pass.number })
  return true
}

/**
 * Stores the card a finished setup session saved, makes it the customer's default and turns the pending pass sold.
 * Running it twice for one session changes nothing the second time (the webhook and the page both call it), and two calls
 * racing at once write one sale: the atomic claim in `markPassActive` has one winner.
 */
export async function activatePass(db: Database, stripe: Stripe, passId: string, setupSessionId: string, now = new Date(), who = "system"): Promise<"activated" | "already-active"> {
  const card = await paymentMethodFromSession(stripe, setupSessionId)
  const pass = await loadPassRecord(db, passId)
  if (!pass) throw new Error(`Pass ${passId} not found`)
  // The session's metadata may still carry an old pass id; both name the same job when this is the right card step.
  const named = card.passId ? await resolvePassJobAnywhere(db, card.passId) : null
  if (!named || named.id !== pass.jobId) throw new Error("This card step belongs to a different pass")
  const [owner] = await db.select({ method: s.customer.stripePaymentMethodId }).from(s.customer).where(eq(s.customer.id, pass.customerId))
  if (pass.soldOn && !pass.cancelledAt && owner?.method === card.paymentMethodId) return "already-active"
  if (pass.cancelledAt) throw new Error("This pass was cancelled")
  await db.update(s.customer).set({ stripeCustomerId: card.customerId, updatedAt: now }).where(eq(s.customer.id, pass.customerId))
  await stripe.customers.update(card.customerId, { invoice_settings: { default_payment_method: card.paymentMethodId } })
  const won = await markPassActive(db, pass, card, now, who)
  if (!won) return "already-active"
  // The checkout's sale is written here, once, by the call that claimed it; `passes.sell` and the renewal write their own `job.sold` through `recordChange`.
  await recordEvent(db, { organizationId: pass.organizationId, about: "job", aboutId: pass.jobId, customerId: pass.customerId, jobId: pass.jobId, kind: "job.sold", detail: { source: "website", name: "Season Pass", passNumber: pass.number }, who, at: now })
  return "activated"
}
