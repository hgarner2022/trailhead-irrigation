import "server-only"
import { and, desc, eq } from "drizzle-orm"
import type Stripe from "stripe"
import { emitEvent } from "@/api/v1/webhooks/deliver"
import * as s from "@/db/schema"
import { visitName } from "@/lib/events/names"
import { recordEventSafe } from "@/lib/events/record"
import type { Database } from "@/db/types"
import { chargeOffSession } from "@/lib/stripe/charge"
import { createCardUpdateSession } from "@/lib/stripe/card-update"
import { baseData, cardWords, jobAddress, receiptLines, receiptNumber, visitWhoDay } from "@/lib/messaging/data"
import { openInvoiceOf } from "@/api/v1/invoices/queries"
import { loadVisitPrice, paidDay, recordPaymentRow, visitBalance } from "@/lib/money/record"
import { isPaid } from "@/lib/money/words"
import { enqueue } from "@/lib/queue"
import { queueMessage, queueStaffMessage } from "@/lib/messaging/queue"
import { dollars, kindName, nextVisitLine } from "./messages"

export type ChargeVisitOutcome = "charged" | "already-charged" | "failed" | "waiting-for-card" | "cancelled-pass" | "no-card" | "nothing-owed" | "invoice-open"

/** A failed first attempt is tried once more this many days later, then it stops (a new card retries again on its own). */
export const RETRY_AFTER_DAYS = 3
/** The most attempts one visit gets without someone fixing the card: the first, the card update's, the day-3 retry. */
export const MAX_CHARGE_ATTEMPTS = 3

export interface ChargeVisitOptions {
  /** the site origin, for the card-update link in the failure message */
  origin: string
  /** true for the retry a card update queued: it may charge a visit whose last attempt failed */
  afterCardUpdate?: boolean
  /** true for the day-3 retry a failed first attempt queued: it may charge a visit whose last attempt failed, up to `MAX_CHARGE_ATTEMPTS` */
  retry?: boolean
  now?: Date
}

/**
 * Charges the customer's saved card for one completed visit of any job (a Season Pass or a one-off). Only ever called by a press:
 * the Charge button (`payments.chargeCard`), a Home row's button, or the retries a failure queues. Marking a visit done charges nothing. Idempotent: a visit already charged is done; a pending attempt
 * left by a crash is re-sent with the same idempotency key; a failed visit waits for a new card (`afterCardUpdate`)
 * and then gets attempt n+1. A cancelled job charges nothing (Home already shows the cancellation), and a customer with no card
 * is not a failure: nothing is written and the money is recorded another way. A first attempt that fails queues one more try after
 * three days and emails the customer the card link at once; a second failure stops there.
 */
export async function chargeVisit(db: Database, stripe: Stripe, visitId: string, opts: ChargeVisitOptions): Promise<ChargeVisitOutcome> {
  const now = opts.now ?? new Date()
  const [visit] = await db.select().from(s.visit).where(eq(s.visit.id, visitId))
  if (!visit) throw new Error(`Visit ${visitId} not found`)
  // What the visit costs is its own lines' total, read now so a line edited since the visit was done is charged at its new price.
  const price = await loadVisitPrice(db, visit.organizationId, visit.id)
  // Paid already means succeeded payment rows that reach the price (the card on file, or the office recording a check, Venmo or cash, or its share of an invoice paid on the pay page), never a stamp on the visit.
  const own = await db.select({ amount: s.charge.amount, status: s.charge.status }).from(s.charge).where(eq(s.charge.visitId, visit.id))
  if (isPaid(own, price)) return "already-charged"
  const balance = await visitBalance(db, visit.organizationId, visit)
  if (balance.price > 0 && balance.owed === 0) return "already-charged"
  // An invoice is out for the job: the customer pays it there, so the card is not also charged (cancel the invoice first).
  if (await openInvoiceOf(db, visit.organizationId, visit.jobId)) return "invoice-open"
  // A visit whose lines are all canceled (or priced at nothing) owes nothing: no Stripe call, no payment row, no email.
  if (price <= 0) return "nothing-owed"
  // A visit the office cancelled is never charged, even if a charge was queued before.
  if (visit.status === "cancelled" || visit.status === "skipped") return "cancelled-pass"
  // The job the visit is on: a Season Pass (it has a season) or a one-off.
  const [pass] = await db.select().from(s.job).where(eq(s.job.id, visit.jobId))
  if (!pass) throw new Error(`Job ${visit.jobId} not found`)
  if (pass.cancelledAt) return "cancelled-pass"
  const [customer] = await db.select().from(s.customer).where(eq(s.customer.id, pass.customerId))
  if (!customer) throw new Error(`Customer ${pass.customerId} not found`)
  const isPass = pass.season !== null
  const passNumber = pass.passNumber ?? ""
  // Only a card Stripe can charge counts here: a customer with just a last 4 (a fixture, an old import) never reaches Stripe and never records a failure.
  if (!customer.stripePaymentMethodId || !customer.stripeCustomerId) {
    // Never silent: Home gets a row with Send card link, and the visit stays Unpaid (its money reads "no card") until the money is recorded or a card is added.
    await db
      .insert(s.adminAlert)
      .values({ organizationId: visit.organizationId, kind: "no-card", key: visit.id, jobId: pass.id, message: `No card to charge for ${customer.firstName}'s ${kindName(visit.kind)}` })
      .onConflictDoNothing()
    return "no-card"
  }

  const [last] = await db.select().from(s.charge).where(eq(s.charge.visitId, visit.id)).orderBy(desc(s.charge.attempt)).limit(1)
  if (last?.status === "succeeded") return "already-charged"
  if (last?.status === "failed" && !opts.afterCardUpdate && !opts.retry) return "waiting-for-card"
  if (opts.retry && !opts.afterCardUpdate && last && last.attempt >= MAX_CHARGE_ATTEMPTS) return "waiting-for-card"
  const attempt = !last ? 1 : last.status === "pending" ? last.attempt : last.attempt + 1
  if (!last || last.status !== "pending") {
    await recordPaymentRow(db, { organizationId: visit.organizationId, jobId: visit.jobId, customerId: customer.id, visitId: visit.id, attempt, amount: price, method: "card_on_file", status: "pending", now })
  }

  // A charge that throws (Stripe down, a timeout) leaves its pending row; the queue resumes it with the same idempotency key in five minutes, so the visit is never stuck "charging".
  const resume = () => enqueue(db, visit.organizationId, "pass-charge", `${visit.id}:resume-${attempt}`, { visitId: visit.id, retry: true }, new Date(now.getTime() + 5 * 60_000))
  const result =
    customer.stripePaymentMethodId && customer.stripeCustomerId
      ? await chargeOffSession(stripe, {
          customerId: customer.stripeCustomerId,
          paymentMethodId: customer.stripePaymentMethodId,
          amount: price,
          visitId: visit.id,
          passId: pass.id,
          attempt,
          description: isPass ? `Season Pass ${passNumber}: ${kindName(visit.kind)}` : visitName(visit.kind),
        }).catch(async (error: unknown) => {
          await resume()
          throw error
        })
      : ({ ok: false, paymentIntentId: null, message: "No card is saved for this customer" } as const)

  const where = and(eq(s.charge.visitId, visit.id), eq(s.charge.attempt, attempt))
  const to = customer.email
  if (result.ok) {
    const [paid] = await db.update(s.charge).set({ status: "succeeded", jobId: visit.jobId, customerId: customer.id, paidOn: paidDay(now), stripePaymentIntentId: result.paymentIntentId, receiptUrl: result.receiptUrl, failureMessage: null, updatedAt: now }).where(where).returning({ id: s.charge.id })
    await db.update(s.customer).set({ cardFailedAt: null, updatedAt: now }).where(eq(s.customer.id, customer.id))
    if (to) {
      const visits = await db.select().from(s.visit).where(eq(s.visit.jobId, pass.id))
      await queueMessage(db, {
        organizationId: visit.organizationId, customerId: customer.id, visitId: visit.id, kind: "receipt", key: `visit-${visit.id}`,
        data: { ...baseData(opts.origin, customer), amount: price, serviceName: kindName(visit.kind), address: await jobAddress(db, visit.jobId), paidOn: paidDay(now), ...(await visitWhoDay(db, visit.id)), ...(await receiptLines(db, visit.organizationId, visit.jobId, visit.id)), ...(paid ? { number: receiptNumber(paid.id) } : {}), card: cardWords(customer), nextLine: nextVisitLine(visits.filter((v) => v.id !== visit.id)), receiptUrl: result.receiptUrl ?? null },
      })
    }
    await emitEvent(db, visit.organizationId, "charge.succeeded", { visitId: visit.id, passId: pass.id, amount: price, attempt })
    // The outbound name stays `charge.succeeded`; the story says `payment.succeeded`, about the payment row.
    if (paid) await recordEventSafe(db, { organizationId: visit.organizationId, about: "payment", aboutId: paid.id, customerId: customer.id, jobId: visit.jobId, visitId: visit.id, kind: "payment.succeeded", detail: { amount: price, method: "card_on_file", name: visitName(visit.kind) }, who: "system", at: now })
    return "charged"
  }

  const [failedRow] = await db.update(s.charge).set({ status: "failed", stripePaymentIntentId: result.paymentIntentId, failureMessage: result.message, updatedAt: now }).where(where).returning({ id: s.charge.id })
  await db.update(s.customer).set({ cardFailedAt: now, updatedAt: now }).where(eq(s.customer.id, customer.id))
  if (to) {
    const link = customer.stripeCustomerId ? (await createCardUpdateSession(stripe, { ...(isPass ? { passId: pass.id } : { appCustomerId: customer.id }), customerId: customer.stripeCustomerId, origin: opts.origin })).url : null
    await queueMessage(db, {
      organizationId: visit.organizationId, customerId: customer.id, visitId: visit.id, kind: "card-failed", key: `visit-${visit.id}-${attempt}`,
      data: { ...baseData(opts.origin, customer), amount: price, visitName: kindName(visit.kind), card: cardWords(customer), address: await jobAddress(db, visit.jobId), updateUrl: link },
    })
  }
  if (failedRow) await recordEventSafe(db, { organizationId: visit.organizationId, about: "payment", aboutId: failedRow.id, customerId: customer.id, jobId: visit.jobId, visitId: visit.id, kind: "payment.failed", detail: { amount: price, message: result.message, name: visitName(visit.kind) }, who: "system", at: now })
  await recordEventSafe(db, { organizationId: visit.organizationId, about: "customer", aboutId: customer.id, customerId: customer.id, kind: "card.failed", detail: { brand: customer.cardBrand, last4: customer.cardLast4 }, who: "system", at: now })
  await queueStaffMessage(db, visit.organizationId, "admin-alert", `card-failed:${visit.id}:${attempt}`, { origin: opts.origin, title: `Card declined for ${customer.firstName}`, detail: `${customer.firstName}'s card was declined for ${dollars(price)} after the ${kindName(visit.kind)}${isPass ? ` on Season Pass ${passNumber}` : ""}.`, path: `/admin/visits?visit=${encodeURIComponent(visit.id)}` })
  await emitEvent(db, visit.organizationId, "charge.failed", { visitId: visit.id, passId: pass.id, amount: price, attempt, message: result.message })
  // The first failure queues the one retry the design allows, three days on; a failure of that retry, or of a try after a card update, queues none.
  if (attempt === 1 && !opts.afterCardUpdate && !opts.retry) await enqueue(db, visit.organizationId, "pass-charge", `${visit.id}:retry`, { visitId: visit.id, retry: true }, new Date(now.getTime() + RETRY_AFTER_DAYS * 86_400_000))
  return "failed"
}
