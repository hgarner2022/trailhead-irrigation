import type * as s from "@/db/schema"
import type { PaymentOutType } from "./schemas"

/** A payment row as the API shows it. */
export function paymentOut(r: typeof s.charge.$inferSelect): PaymentOutType {
  return {
    id: r.id, jobId: r.jobId, visitId: r.visitId, customerId: r.customerId, amount: r.amount, method: r.method, reference: r.reference,
    status: r.status, paidOn: r.paidOn, receiptUrl: r.receiptUrl, refundsPaymentId: r.refundsPaymentId, createdAt: r.createdAt.toISOString(),
  }
}
