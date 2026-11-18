import "server-only"
import { and, eq, isNotNull, isNull, ne, or } from "drizzle-orm"
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
 * Saves the card on the customer and writes the `card.saved` event, once: the update runs only where the customer's saved card is
 * not already this one (or is marked failed), so a retry, the loser of the claim and a racing call write one event between them.
 */
async function saveCard(db: Database, pass: PassRecord, card: SavedCard, now: Date, who: string): Promise<void> {
  const saved = await db
    .update(s.customer)
    .set({ ...cardColumns(card), updatedAt: now })
    .where(and(eq(s.customer.id, pass.customerId), or(isNull(s.customer.stripePaymentMethodId), ne(s.customer.stripePaymentMethodId, card.paymentMethodId), isNotNull(s.customer.cardFailedAt))))
    .returning({ id: s.customer.id })
  // A card saved at the checkout is the customer's event; an office sale (no card) writes none.
  if (saved.length > 0) await recordEvent(db, { organizationId: pass.organizationId, about: "customer", aboutId: pass.customerId, customerId: pass.customerId, kind: "card.saved", detail: { brand: card.brand, last4: card.last4 }, who, at: now })
}

/**
 * Turns a pending pass sold: claims the sale with one atomic update (`sold_on` is set only where it is still empty), so a page and
 * Stripe's webhook racing to activate one pass produce one winner. Only the winner sends `pass.bought` and gets `true`; a canceled
 * pass is refused. Saving the card is safe to repeat and runs for the loser too: if the process died after the claim, the retry
 * loses the claim and must still finish the card. The part of activation that has nothing to do with Stripe, so the checkout shares
 * it with anything that activates a held pass.
 */
export async function markPassActive(db: Database, pass: PassRecord, card: SavedCard | null, now = new Date(), who = "system"): Promise<boolean> {
  if (pass.cancelledAt) throw new Error("This pass was canceled")
  const claimed = await db
    .update(s.job)
    .set({ soldOn: mountainDay(now), updatedAt: now })
    .where(and(eq(s.job.id, pass.jobId), isNull(s.job.soldOn), isNull(s.job.cancelledAt)))
    .returning({ id: s.job.id })
  if (claimed.length === 0) {
    const [job] = await db.select({ cancelledAt: s.job.cancelledAt }).from(s.job).where(eq(s.job.id, pass.jobId))
    if (job?.cancelledAt) throw new Error("This pass was canceled")
    // The claim was made before (a crash after it, or a racing call): finish what the winner may not have.
    if (card) await saveCard(db, pass, card, now, who)
    return false
  }
  // The card lives on the customer.
  if (card) await saveCard(db, pass, card, now, who)
  await emitEvent(db, pass.organizationId, "pass.bought", { passId: pass.id, number: pass.number })
  return true
}

const hasSaleEvent = async (db: Database, pass: PassRecord) =>
  Boolean((await db.select({ id: s.event.id }).from(s.event).where(and(eq(s.event.organizationId, pass.organizationId), eq(s.event.jobId, pass.jobId), eq(s.event.kind, "job.sold"))).limit(1))[0])

/** The checkout's sale event, once per job: written when the job has none, under a fixed id so two racing calls write one. */
async function recordCheckoutSale(db: Database, pass: PassRecord, now: Date, who: string): Promise<void> {
  if (await hasSaleEvent(db, pass)) return
  await recordEvent(db, { id: `evt_sold_${pass.jobId}`, organizationId: pass.organizationId, about: "job", aboutId: pass.jobId, customerId: pass.customerId, jobId: pass.jobId, kind: "job.sold", detail: { source: "website", name: "Season Pass", passNumber: pass.number }, who, at: now })
}

/**
 * Stores the card a finished setup session saved, makes it the customer's default and turns the pending pass sold.
 * Running it twice for one session changes nothing the second time (the webhook and the page both call it), and two calls
 * racing at once write one sale: the atomic claim in `markPassActive` has one winner. Every completion step (the card, the sale
 * event) is idempotent and runs on a lost claim too, so a retry after a crash between the claim and the rest finishes the job.
 * The onboarding task is queued by `recordPurchase`, which the caller runs after every call and which dedupes on the job id.
 */
export async function activatePass(db: Database, stripe: Stripe, passId: string, setupSessionId: string, now = new Date(), who = "system", organizationId?: string): Promise<"activated" | "already-active"> {
  const card = await paymentMethodFromSession(stripe, setupSessionId)
  const pass = await loadPassRecord(db, passId, organizationId)
  if (!pass) throw new Error(`Pass ${passId} not found`)
  // The session's metadata may still carry an old pass id; both name the same job when this is the right card step.
  const named = card.passId ? await resolvePassJobAnywhere(db, card.passId) : null
  if (!named || named.id !== pass.jobId) throw new Error("This card step belongs to a different pass")
  if (pass.cancelledAt) throw new Error("This pass was canceled")
  const [owner] = await db.select({ method: s.customer.stripePaymentMethodId }).from(s.customer).where(eq(s.customer.id, pass.customerId))
  if (pass.soldOn && owner?.method === card.paymentMethodId && (await hasSaleEvent(db, pass))) return "already-active"
  await db.update(s.customer).set({ stripeCustomerId: card.customerId, updatedAt: now }).where(eq(s.customer.id, pass.customerId))
  await stripe.customers.update(card.customerId, { invoice_settings: { default_payment_method: card.paymentMethodId } })
  const won = await markPassActive(db, pass, card, now, who)
  // The checkout's sale is written here; `passes.sell` and the renewal write their own `job.sold` through `recordChange`.
  await recordCheckoutSale(db, pass, now, who)
  return won ? "activated" : "already-active"
}
