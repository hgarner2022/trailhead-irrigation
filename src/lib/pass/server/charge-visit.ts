import "server-only"
import { and, desc, eq } from "drizzle-orm"
import type Stripe from "stripe"
import { emitEvent } from "@/api/v1/webhooks/deliver"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { chargeOffSession } from "@/lib/stripe/charge"
import { createCardUpdateSession } from "@/lib/stripe/card-update"
import { baseData } from "@/lib/messaging/data"
import { queueMessage, queueStaffMessage } from "@/lib/messaging/queue"
import { dollars, kindName, nextVisitLine } from "./messages"

export type ChargeVisitOutcome = "charged" | "already-charged" | "failed" | "waiting-for-card" | "cancelled-pass" | "not-a-pass-visit"

export interface ChargeVisitOptions {
  /** the site origin, for the card-update link in the failure message */
  origin: string
  /** true for the retry a card update queued: it may charge a visit whose last attempt failed */
  afterCardUpdate?: boolean
  now?: Date
}

/**
 * Charges the pass's saved card for one completed visit. Idempotent: a visit already charged is done; a pending attempt
 * left by a crash is re-sent with the same idempotency key; a failed visit waits for a new card (`afterCardUpdate`)
 * and then gets attempt n+1. A cancelled pass charges nothing (Home already shows the cancellation).
 */
export async function chargeVisit(db: Database, stripe: Stripe, visitId: string, opts: ChargeVisitOptions): Promise<ChargeVisitOutcome> {
  const now = opts.now ?? new Date()
  const [visit] = await db.select().from(s.visit).where(eq(s.visit.id, visitId))
  if (!visit) throw new Error(`Visit ${visitId} not found`)
  if (visit.chargedAt) return "already-charged"
  if (!visit.passId) return "not-a-pass-visit"
  const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, visit.passId))
  if (!pass) throw new Error(`Pass ${visit.passId} not found`)
  if (pass.status === "cancelled") return "cancelled-pass"
  const [customer] = await db.select().from(s.customer).where(eq(s.customer.id, pass.customerId))
  if (!customer) throw new Error(`Customer ${pass.customerId} not found`)

  const [last] = await db.select().from(s.charge).where(eq(s.charge.visitId, visit.id)).orderBy(desc(s.charge.attempt)).limit(1)
  if (last?.status === "succeeded") return "already-charged"
  if (last?.status === "failed" && !opts.afterCardUpdate) return "waiting-for-card"
  const attempt = !last ? 1 : last.status === "pending" ? last.attempt : last.attempt + 1
  if (!last || last.status !== "pending") {
    await db.insert(s.charge).values({ organizationId: visit.organizationId, passId: pass.id, visitId: visit.id, attempt, amount: visit.amount, status: "pending" }).onConflictDoNothing()
  }

  const result =
    pass.stripePaymentMethodId && customer.stripeCustomerId
      ? await chargeOffSession(stripe, {
          customerId: customer.stripeCustomerId,
          paymentMethodId: pass.stripePaymentMethodId,
          amount: visit.amount,
          visitId: visit.id,
          passId: pass.id,
          attempt,
          description: `Season Pass ${pass.number}: ${kindName(visit.kind)}`,
        })
      : ({ ok: false, paymentIntentId: null, message: "No card is saved on this pass" } as const)

  const where = and(eq(s.charge.visitId, visit.id), eq(s.charge.attempt, attempt))
  const to = customer.email
  if (result.ok) {
    await db.update(s.charge).set({ status: "succeeded", stripePaymentIntentId: result.paymentIntentId, receiptUrl: result.receiptUrl, failureMessage: null, updatedAt: now }).where(where)
    await db.update(s.visit).set({ chargedAt: now, stripePaymentIntentId: result.paymentIntentId, updatedAt: now }).where(eq(s.visit.id, visit.id))
    await db.update(s.seasonPass).set({ cardFailedAt: null, updatedAt: now }).where(eq(s.seasonPass.id, pass.id))
    if (to) {
      const visits = await db.select().from(s.visit).where(eq(s.visit.passId, pass.id))
      const card = pass.cardBrand && pass.cardLast4 ? `${pass.cardBrand} card ending ${pass.cardLast4}` : ""
      await queueMessage(db, {
        organizationId: visit.organizationId, customerId: customer.id, visitId: visit.id, kind: "receipt", key: `visit-${visit.id}`,
        data: { ...baseData(opts.origin, customer), passNumber: pass.number, amount: visit.amount, visitName: kindName(visit.kind), card: card || null, nextLine: nextVisitLine(visits.filter((v) => v.id !== visit.id)), receiptUrl: result.receiptUrl ?? null },
      })
    }
    await emitEvent(db, visit.organizationId, "charge.succeeded", { visitId: visit.id, passId: pass.id, amount: visit.amount, attempt })
    return "charged"
  }

  await db.update(s.charge).set({ status: "failed", stripePaymentIntentId: result.paymentIntentId, failureMessage: result.message, updatedAt: now }).where(where)
  await db.update(s.seasonPass).set({ cardFailedAt: now, updatedAt: now }).where(eq(s.seasonPass.id, pass.id))
  if (to) {
    const link = customer.stripeCustomerId ? (await createCardUpdateSession(stripe, { passId: pass.id, customerId: customer.stripeCustomerId, origin: opts.origin })).url : null
    await queueMessage(db, {
      organizationId: visit.organizationId, customerId: customer.id, visitId: visit.id, kind: "card-failed", key: `visit-${visit.id}-${attempt}`,
      data: { ...baseData(opts.origin, customer), passNumber: pass.number, amount: visit.amount, visitName: kindName(visit.kind), updateUrl: link },
    })
  }
  await queueStaffMessage(db, visit.organizationId, "admin-alert", `card-failed:${visit.id}:${attempt}`, { origin: opts.origin, title: `Card declined for ${customer.firstName}`, detail: `${customer.firstName}'s card was declined for ${dollars(visit.amount)} after the ${kindName(visit.kind)} on Season Pass ${pass.number}.`, path: "/admin/passes" })
  await emitEvent(db, visit.organizationId, "charge.failed", { visitId: visit.id, passId: pass.id, amount: visit.amount, attempt, message: result.message })
  return "failed"
}
