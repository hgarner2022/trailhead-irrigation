// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "@/api/core/call"
import { passesCreate } from "@/api/v1/passes/handlers"
import { apiDb, ctxFor, writeKey } from "@/api/test-helpers"
import { applyCardUpdate } from "@/lib/stripe/card-update"
import { completeSession, declined, stubStripe } from "@/lib/stripe/test-stripe"
import { chargeVisit } from "./charge-visit"

let db: TestDb
beforeAll(async () => { db = await apiDb() })
afterAll(() => db.close())
const NOW = new Date("2027-05-06T18:00:00Z")
const opts = { origin: "https://site.test", now: NOW }

let n = 0
/** A new active pass with a saved card; returns the pass id and its two visit ids. */
async function activePass() {
  n++
  const pass = await callApi(ctxFor(db, writeKey, "2026-12-01T17:00:00Z"), passesCreate, {
    customer: { firstName: "Maya", lastName: "Tester", email: `maya${n}@example.com` }, property: { address: `${n} Elm St`, town: "Erie" }, zones: 8, consent: { termsAccepted: true },
  })
  await db.update(s.seasonPass).set({ status: "active", stripePaymentMethodId: "pm_old", cardBrand: "visa", cardLast4: "4242", cardExpires: "2030-08" }).where(eq(s.seasonPass.id, pass.id))
  await db.update(s.customer).set({ stripeCustomerId: "cus_1" }).where(eq(s.customer.id, pass.customer!.id))
  const visit = (kind: string) => pass.visits.find((v) => v.kind === kind)!.id
  return { passId: pass.id, customerId: pass.customer!.id, turnOn: visit("turn-on"), blowout: visit("blowout") }
}
const messages = (customerId: string) => db.select().from(s.messageLog).where(eq(s.messageLog.customerId, customerId))

describe("chargeVisit", () => {
  it("charges the card, marks the visit, and queues a receipt naming the next visit and its preference words", async () => {
    const p = await activePass()
    const { stripe, calls } = stubStripe()
    expect(await chargeVisit(db, stripe, p.turnOn, opts)).toBe("charged")
    expect(calls.paymentIntentsCreate.mock.calls[0]![0]).toMatchObject({ amount: 14500, customer: "cus_1", payment_method: "pm_old" })
    const [visit] = await db.select().from(s.visit).where(eq(s.visit.id, p.turnOn))
    expect(visit!.stripePaymentIntentId).toMatch(/^pi_ok_/)
    expect(visit!.chargedAt).toEqual(NOW)
    const [charge] = await db.select().from(s.charge).where(eq(s.charge.visitId, p.turnOn))
    expect(charge).toMatchObject({ attempt: 1, status: "succeeded", amount: 145, receiptUrl: "https://pay.stripe.test/receipt/1" })
    const [mail] = await messages(p.customerId)
    expect(mail).toMatchObject({ kind: "receipt", channel: "email", status: "queued", visitId: p.turnOn })
    expect(mail!.to).toMatch(/^maya\d+@example.com$/)
    expect(mail!.body).toContain("$145")
    expect(mail!.body).toContain("visa card ending 4242")
    expect(mail!.body).toContain("Your fall blowout is planned for mid October")
  })

  it("is done when already charged: no second charge, no second receipt", async () => {
    const p = await activePass()
    const { stripe, calls } = stubStripe()
    await chargeVisit(db, stripe, p.turnOn, opts)
    expect(await chargeVisit(db, stripe, p.turnOn, opts)).toBe("already-charged")
    expect(calls.paymentIntentsCreate).toHaveBeenCalledTimes(1)
    expect(await messages(p.customerId)).toHaveLength(1)
  })

  it("records a decline, queues card-failed with the update link, flags the pass, and does not retry until the card changes", async () => {
    const p = await activePass()
    const { stripe, calls } = stubStripe({ charge: () => { throw declined("pi_bad") } })
    expect(await chargeVisit(db, stripe, p.turnOn, opts)).toBe("failed")
    const [charge] = await db.select().from(s.charge).where(eq(s.charge.visitId, p.turnOn))
    expect(charge).toMatchObject({ attempt: 1, status: "failed", failureMessage: "Your card was declined.", stripePaymentIntentId: "pi_bad" })
    const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, p.passId))
    expect(pass!.cardFailedAt).toEqual(NOW)
    const [mail] = await messages(p.customerId)
    expect(mail).toMatchObject({ kind: "card-failed", status: "queued" })
    expect(mail!.body).toContain("https://checkout.stripe.test/c/pay")
    expect(calls.sessionCreate.mock.calls[0]![0]).toMatchObject({ mode: "setup", customer: "cus_1", success_url: "https://site.test/account/pass/card-updated", metadata: { purpose: "card-update", passId: p.passId } })
    expect(await chargeVisit(db, stripe, p.turnOn, opts)).toBe("waiting-for-card")
    expect(calls.paymentIntentsCreate).toHaveBeenCalledTimes(1)
  })

  it("charges nothing on a cancelled pass and nothing for a booking visit", async () => {
    const p = await activePass()
    await db.update(s.seasonPass).set({ status: "cancelled" }).where(eq(s.seasonPass.id, p.passId))
    const { stripe, calls } = stubStripe()
    expect(await chargeVisit(db, stripe, p.turnOn, opts)).toBe("cancelled-pass")
    expect(calls.paymentIntentsCreate).not.toHaveBeenCalled()
  })

  it("sends the same idempotency key when a crash left the attempt pending", async () => {
    const p = await activePass()
    await db.insert(s.charge).values({ organizationId: (await db.select().from(s.visit).where(eq(s.visit.id, p.turnOn)))[0]!.organizationId, passId: p.passId, visitId: p.turnOn, attempt: 1, amount: 145, status: "pending" })
    const { stripe, calls } = stubStripe()
    await chargeVisit(db, stripe, p.turnOn, opts)
    expect(calls.paymentIntentsCreate.mock.calls[0]![1].idempotencyKey).toBe(`visit-${p.turnOn}-1`)
    expect(await db.select().from(s.charge).where(eq(s.charge.visitId, p.turnOn))).toHaveLength(1)
  })
})

describe("applyCardUpdate", () => {
  it("stores the new card, detaches the old, clears the flag and retries the failed visit once as attempt 2", async () => {
    const p = await activePass()
    const failing = stubStripe({ charge: () => { throw declined() } })
    await chargeVisit(db, failing.stripe, p.turnOn, opts)
    const sessions = { cs_up: completeSession("cs_up", { purpose: "card-update", passId: p.passId }, { pm: "pm_new", last4: "1111", expYear: 2031, expMonth: 1 }) }
    const { stripe, calls } = stubStripe({ sessions })
    expect(await applyCardUpdate(db, stripe, "cs_up", NOW)).toBe("applied")
    expect(await applyCardUpdate(db, stripe, "cs_up", NOW)).toBe("already-applied")
    expect(calls.detach).toHaveBeenCalledWith("pm_old")
    expect(calls.customersUpdate).toHaveBeenCalledTimes(1)
    const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, p.passId))
    expect(pass).toMatchObject({ stripePaymentMethodId: "pm_new", cardLast4: "1111", cardExpires: "2031-01", cardFailedAt: null })
    const queued = await db.select().from(s.queueItem).where(and(eq(s.queueItem.kind, "pass-charge"), eq(s.queueItem.key, `${p.turnOn}:card-cs_up`)))
    expect(queued).toHaveLength(1)
    const retry = stubStripe()
    expect(await chargeVisit(db, retry.stripe, p.turnOn, { ...opts, afterCardUpdate: true })).toBe("charged")
    const charges = await db.select().from(s.charge).where(eq(s.charge.visitId, p.turnOn))
    expect(charges.map((c) => [c.attempt, c.status]).sort()).toEqual([[1, "failed"], [2, "succeeded"]])
    expect(retry.calls.paymentIntentsCreate.mock.calls[0]![1].idempotencyKey).toBe(`visit-${p.turnOn}-2`)
  })
  it("refuses a session that is not a card update", async () => {
    const p = await activePass()
    const { stripe } = stubStripe({ sessions: { cs_x: completeSession("cs_x", { purpose: "pass-setup", passId: p.passId }) } })
    await expect(applyCardUpdate(db, stripe, "cs_x", NOW)).rejects.toThrow("not a card update")
  })
})
