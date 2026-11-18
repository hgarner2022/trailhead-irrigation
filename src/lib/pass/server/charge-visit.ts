import "server-only"
import { and, desc, eq, isNotNull } from "drizzle-orm"
import type Stripe from "stripe"
import { emitEvent } from "@/api/v1/webhooks/deliver"
import * as s from "@/db/schema"
import { visitName } from "@/lib/events/names"
import { recordEventSafe } from "@/lib/events/record"
import type { Database } from "@/db/types"
import { chargeOffSession } from "@/lib/stripe/charge"
import { createCardUpdateSession } from "@/lib/stripe/card-update"
import { baseData } from "@/lib/messaging/data"
import { loadVisitPrice, paidDay, recordPaymentRow } from "@/lib/money/record"
import { isPaid } from "@/lib/money/words"
import { queueMessage, queueStaffMessage } from "@/lib/messaging/queue"
import { dollars, kindName, nextVisitLine } from "./messages"

export type ChargeVisitOutcome = "charged" | "already-charged" | "failed" | "waiting-for-card" | "cancelled-pass" | "not-a-pass-visit" | "no-card" | "nothing-owed"

export interface ChargeVisitOptions {
  /** the site origin, for the card-update link in the failure message */
  origin: string
  /** true for the retry a card update queued: it may charge a visit whose last attempt failed */
  afterCardUpdate?: boolean
  now?: Date
}

/**
 * Charges the customer's saved card for one completed visit. Idempotent: a visit already charged is done; a pending attempt
 * left by a crash is re-sent with the same idempotency key; a failed visit waits for a new card (`afterCardUpdate`)
 * and then gets attempt n+1. A cancelled pass charges nothing (Home already shows the cancellation), and a pass with no card
 * (sold by the office, paid at each visit) is not a failure: nothing is written and the visit's money is recorded at Done.
 */
export async function chargeVisit(db: Database, stripe: Stripe, visitId: string, opts: ChargeVisitOptions): Promise<ChargeVisitOutcome> {
  const now = opts.now ?? new Date()
  const [visit] = await db.select().from(s.visit).where(eq(s.visit.id, visitId))
  if (!visit) throw new Error(`Visit ${visitId} not found`)
  // What the visit costs is its own lines' total, read now so a line edited since the visit was done is charged at its new price.
  const price = await loadVisitPrice(db, visit.organizationId, visit.id)
  // Paid already means succeeded payment rows that reach the price (the card on file, or the office recording a check, Venmo or cash), never a stamp on the visit.
  const own = await db.select({ amount: s.charge.amount, status: s.charge.status }).from(s.charge).where(eq(s.charge.visitId, visit.id))
  if (isPaid(own, price)) return "already-charged"
  // A visit whose lines are all cancelled (or priced at nothing) owes nothing: no Stripe call, no payment row, no email.
  if (price <= 0) return "nothing-owed"
  // A visit the office cancelled is never charged, even if a charge was queued before.
  if (visit.status === "cancelled" || visit.status === "skipped") return "cancelled-pass"
  // Only a Season Pass's visits are charged here: the pass is the job, and the job has a season.
  const [pass] = await db.select().from(s.job).where(and(eq(s.job.id, visit.jobId), isNotNull(s.job.season)))
  if (!pass) return "not-a-pass-visit"
  if (pass.cancelledAt) return "cancelled-pass"
  const [customer] = await db.select().from(s.customer).where(eq(s.customer.id, pass.customerId))
  if (!customer) throw new Error(`Customer ${pass.customerId} not found`)
  const passNumber = pass.passNumber ?? ""
  // Only a card Stripe can charge counts here: a customer with just a last 4 (a fixture, an old import) never reaches Stripe and never records a failure.
  if (!customer.stripePaymentMethodId || !customer.stripeCustomerId) {
    // Never silent: Home gets a row with Send card link, and the visit stays Owed (its money reads "no card") until the money is recorded or a card is added.
    await db
      .insert(s.adminAlert)
      .values({ organizationId: visit.organizationId, kind: "no-card", key: visit.id, jobId: pass.id, message: `No card to charge for ${customer.firstName}'s ${kindName(visit.kind)}` })
      .onConflictDoNothing()
    return "no-card"
  }

  const [last] = await db.select().from(s.charge).where(eq(s.charge.visitId, visit.id)).orderBy(desc(s.charge.attempt)).limit(1)
  if (last?.status === "succeeded") return "already-charged"
  if (last?.status === "failed" && !opts.afterCardUpdate) return "waiting-for-card"
  const attempt = !last ? 1 : last.status === "pending" ? last.attempt : last.attempt + 1
  if (!last || last.status !== "pending") {
    await recordPaymentRow(db, { organizationId: visit.organizationId, jobId: visit.jobId, customerId: customer.id, visitId: visit.id, attempt, amount: price, method: "card_on_file", status: "pending", now })
  }

  const result =
    customer.stripePaymentMethodId && customer.stripeCustomerId
      ? await chargeOffSession(stripe, {
          customerId: customer.stripeCustomerId,
          paymentMethodId: customer.stripePaymentMethodId,
          amount: price,
          visitId: visit.id,
          passId: pass.id,
          attempt,
          description: `Season Pass ${passNumber}: ${kindName(visit.kind)}`,
        })
      : ({ ok: false, paymentIntentId: null, message: "No card is saved for this customer" } as const)

  const where = and(eq(s.charge.visitId, visit.id), eq(s.charge.attempt, attempt))
  const to = customer.email
  if (result.ok) {
    const [paid] = await db.update(s.charge).set({ status: "succeeded", jobId: visit.jobId, customerId: customer.id, paidOn: paidDay(now), stripePaymentIntentId: result.paymentIntentId, receiptUrl: result.receiptUrl, failureMessage: null, updatedAt: now }).where(where).returning({ id: s.charge.id })
    await db.update(s.customer).set({ cardFailedAt: null, updatedAt: now }).where(eq(s.customer.id, customer.id))
    if (to) {
      const visits = await db.select().from(s.visit).where(eq(s.visit.jobId, pass.id))
      const card = customer.cardBrand && customer.cardLast4 ? `${customer.cardBrand} card ending ${customer.cardLast4}` : ""
      await queueMessage(db, {
        organizationId: visit.organizationId, customerId: customer.id, visitId: visit.id, kind: "receipt", key: `visit-${visit.id}`,
        data: { ...baseData(opts.origin, customer), passNumber, amount: price, visitName: kindName(visit.kind), card: card || null, nextLine: nextVisitLine(visits.filter((v) => v.id !== visit.id)), receiptUrl: result.receiptUrl ?? null },
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
    const link = customer.stripeCustomerId ? (await createCardUpdateSession(stripe, { passId: pass.id, customerId: customer.stripeCustomerId, origin: opts.origin })).url : null
    await queueMessage(db, {
      organizationId: visit.organizationId, customerId: customer.id, visitId: visit.id, kind: "card-failed", key: `visit-${visit.id}-${attempt}`,
      data: { ...baseData(opts.origin, customer), passNumber, amount: price, visitName: kindName(visit.kind), updateUrl: link },
    })
  }
  if (failedRow) await recordEventSafe(db, { organizationId: visit.organizationId, about: "payment", aboutId: failedRow.id, customerId: customer.id, jobId: visit.jobId, visitId: visit.id, kind: "payment.failed", detail: { amount: price, message: result.message, name: visitName(visit.kind) }, who: "system", at: now })
  await recordEventSafe(db, { organizationId: visit.organizationId, about: "customer", aboutId: customer.id, customerId: customer.id, kind: "card.failed", detail: { brand: customer.cardBrand, last4: customer.cardLast4 }, who: "system", at: now })
  await queueStaffMessage(db, visit.organizationId, "admin-alert", `card-failed:${visit.id}:${attempt}`, { origin: opts.origin, title: `Card declined for ${customer.firstName}`, detail: `${customer.firstName}'s card was declined for ${dollars(price)} after the ${kindName(visit.kind)} on Season Pass ${passNumber}.`, path: `/admin/visits?visit=${encodeURIComponent(visit.id)}` })
  await emitEvent(db, visit.organizationId, "charge.failed", { visitId: visit.id, passId: pass.id, amount: price, attempt, message: result.message })
  return "failed"
}
