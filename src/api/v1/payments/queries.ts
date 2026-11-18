import type * as s from "@/db/schema"
import type { Ctx } from "../../core/context"
import { canSeeContact } from "../shared"
import type { PaymentOutType } from "./schemas"

/** A payment row as the API shows it. The reference (a check number, a Venmo handle) and the receipt link are for people and keys that may write; a read key sees null. */
export function paymentOut(ctx: Ctx, r: typeof s.charge.$inferSelect): PaymentOutType {
  const seeNotes = canSeeContact(ctx)
  return {
    id: r.id, jobId: r.jobId, visitId: r.visitId, customerId: r.customerId, amount: r.amount, method: r.method, reference: seeNotes ? r.reference : null,
    status: r.status, paidOn: r.paidOn, receiptUrl: seeNotes ? r.receiptUrl : null, refundsPaymentId: r.refundsPaymentId, createdAt: r.createdAt.toISOString(),
  }
}
