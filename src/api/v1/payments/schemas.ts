import { z } from "zod"
import { Day, Id, Iso } from "../shared"

/** One dollar movement on a job. A refund is a negative amount pointing at the payment it reverses. */
export const PaymentOut = z.object({
  id: Id,
  jobId: Id.nullable().describe("The job the money belongs to; every payment has one."),
  visitId: Id.nullable().describe("The visit it covers; null for a payment on the job as a whole."),
  customerId: Id.nullable(),
  amount: z.number().int().describe("Whole dollars; negative for a refund."),
  method: z.enum(["card_on_file", "card_now", "check", "venmo", "cash", "bill"]),
  reference: z.string().nullable().describe("A check number or a Venmo handle."),
  status: z.enum(["pending", "succeeded", "failed", "refunded"]),
  paidOn: Day.nullable().describe("The Mountain day the money arrived."),
  receiptUrl: z.string().nullable(),
  refundsPaymentId: Id.nullable().describe("For a refund row, the payment it reverses."),
  createdAt: Iso,
})
export type PaymentOutType = z.infer<typeof PaymentOut>
