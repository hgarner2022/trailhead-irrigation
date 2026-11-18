import "server-only"
import { and, eq, isNull } from "drizzle-orm"
import * as s from "@/db/schema"
import { getStripe } from "@/lib/stripe/client"
import type { Ctx } from "../../core/context"
import type { InvoiceRow } from "./queries"

/**
 * Closes the card form a bill opened on Stripe, so a customer holding the page cannot pay a bill that is gone. Best effort: a
 * session already completed or expired, a missing Stripe key or a network fault never stops the cancel (the webhook still records
 * any money that does arrive, on a cancelled bill, as a payment row).
 */
export async function expireCheckoutSession(sessionId: string | null | undefined): Promise<void> {
  if (!sessionId) return
  try {
    await getStripe().checkout.sessions.expire(sessionId)
  } catch (error) {
    console.error("Could not expire the bill's Checkout session", error instanceof Error ? error.message : "unknown error")
  }
}

/**
 * Cancels a bill that is still open: it stays on record marked cancelled and its Checkout session is closed. Returns the row, or
 * undefined when it was paid or cancelled a moment ago (nothing changed).
 */
export async function cancelOpenBill(ctx: Ctx, row: InvoiceRow): Promise<InvoiceRow | undefined> {
  const [updated] = await ctx.db
    .update(s.invoice)
    .set({ cancelledAt: ctx.now, updatedAt: ctx.now })
    .where(and(eq(s.invoice.id, row.id), eq(s.invoice.organizationId, ctx.organizationId), isNull(s.invoice.paidOn), isNull(s.invoice.cancelledAt)))
    .returning()
  if (updated) await expireCheckoutSession(updated.stripeCheckoutSessionId)
  return updated
}
