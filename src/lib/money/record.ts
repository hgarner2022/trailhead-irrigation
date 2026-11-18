import "server-only"
import { and, desc, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"

type PaymentRow = typeof s.charge.$inferSelect

const denver = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" })
/** The Mountain calendar day of an instant, YYYY-MM-DD: the `paid_on` a payment takes unless it says otherwise. */
export const paidDay = (at: Date) => denver.format(at)

export interface PaymentRowInput {
  organizationId: string
  jobId: string
  visitId?: string | null
  customerId: string
  /** whole dollars; negative for a refund */
  amount: number
  method: PaymentRow["method"]
  reference?: string | null
  /** the Mountain day the money arrived; today when left out */
  paidOn?: string
  status: PaymentRow["status"]
  stripePaymentIntentId?: string | null
  receiptUrl?: string | null
  passId?: string | null
  /** the payment a refund row reverses */
  refundsPaymentId?: string | null
  failureMessage?: string | null
  /** the visit's attempt number; the next one when left out */
  attempt?: number
  now?: Date
}

/**
 * The one writer of a payment row (task 4.1): the office's check, Venmo and cash, a refund, the saved card's charge and
 * the bill's payment all insert here, so every row carries its job, customer and the day the money arrived. A visit's
 * rows are numbered by attempt. Returns the row, or undefined when the (visit, attempt) pair or the Stripe payment
 * intent already has one.
 */
export async function recordPaymentRow(db: Database, input: PaymentRowInput): Promise<PaymentRow | undefined> {
  let attempt = input.attempt
  if (attempt === undefined) {
    if (input.visitId) {
      const [last] = await db.select({ attempt: s.charge.attempt }).from(s.charge).where(eq(s.charge.visitId, input.visitId)).orderBy(desc(s.charge.attempt)).limit(1)
      attempt = (last?.attempt ?? 0) + 1
    } else attempt = 1
  }
  const [row] = await db
    .insert(s.charge)
    .values({
      organizationId: input.organizationId,
      jobId: input.jobId,
      visitId: input.visitId ?? null,
      customerId: input.customerId,
      passId: input.passId ?? null,
      attempt,
      amount: input.amount,
      status: input.status,
      method: input.method,
      reference: input.reference || null,
      paidOn: input.paidOn ?? paidDay(input.now ?? new Date()),
      stripePaymentIntentId: input.stripePaymentIntentId ?? null,
      receiptUrl: input.receiptUrl ?? null,
      refundsPaymentId: input.refundsPaymentId ?? null,
      failureMessage: input.failureMessage ?? null,
    })
    .onConflictDoNothing()
    .returning()
  return row
}

/** A job's payment rows, oldest first. */
export async function paymentsOfJob(db: Database, organizationId: string, jobId: string): Promise<PaymentRow[]> {
  return db.select().from(s.charge).where(and(eq(s.charge.organizationId, organizationId), eq(s.charge.jobId, jobId))).orderBy(s.charge.createdAt, s.charge.id)
}
