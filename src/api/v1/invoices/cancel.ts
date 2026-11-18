import "server-only"
import { and, eq, isNull } from "drizzle-orm"
import * as s from "@/db/schema"
import { recordEvent, whoOf } from "@/lib/events/record"
import { getStripe } from "@/lib/stripe/client"
import type { Ctx } from "../../core/context"
import type { InvoiceRow } from "./queries"

/**
 * Closes the card form an invoice opened on Stripe, so a customer holding the page cannot pay an invoice that is gone. Best effort: a
 * session already completed or expired, a missing Stripe key or a network fault never stops the cancel (the webhook still records
 * any money that does arrive, on a canceled invoice, as a payment row).
 */
export async function expireCheckoutSession(sessionId: string | null | undefined): Promise<void> {
  if (!sessionId) return
  try {
    await getStripe().checkout.sessions.expire(sessionId)
  } catch (error) {
    console.error("Could not expire the invoice's Checkout session", error instanceof Error ? error.message : "unknown error")
  }
}

/**
 * Cancels an invoice that is still open: it stays on record marked canceled and its Checkout session is closed. Returns the row, or
 * undefined when it was paid or canceled a moment ago (nothing changed).
 */
export async function cancelOpenBill(ctx: Ctx, row: InvoiceRow): Promise<InvoiceRow | undefined> {
  const [updated] = await ctx.db
    .update(s.invoice)
    .set({ cancelledAt: ctx.now, updatedAt: ctx.now })
    .where(and(eq(s.invoice.id, row.id), eq(s.invoice.organizationId, ctx.organizationId), isNull(s.invoice.paidOn), isNull(s.invoice.cancelledAt)))
    .returning()
  if (updated) {
    await expireCheckoutSession(updated.stripeCheckoutSessionId)
    await recordEvent(ctx.db, { organizationId: ctx.organizationId, about: "invoice", aboutId: updated.id, customerId: updated.customerId, jobId: updated.jobId, kind: "invoice.cancelled", detail: { number: updated.number, total: updated.total }, who: whoOf(ctx), at: ctx.now })
  }
  return updated
}
