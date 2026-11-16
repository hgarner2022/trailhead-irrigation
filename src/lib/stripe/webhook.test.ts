// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import type Stripe from "stripe"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "@/api/core/call"
import { passesCreate } from "@/api/v1/passes/handlers"
import { apiDb, ctxFor, writeKey } from "@/api/test-helpers"
import { drain } from "@/lib/queue"
import { handleStripeEvent, receiveStripeEvent } from "./webhook"
import { completeSession, signer, stubStripe, WEBHOOK_SECRET } from "./test-stripe"

const { getStripe } = vi.hoisted(() => ({ getStripe: vi.fn() }))
vi.mock("./client", async (original) => ({ ...(await original<typeof import("./client")>()), getStripe }))

let db: TestDb
beforeAll(async () => { db = await apiDb() })
afterAll(() => db.close())

const event = (id: string, type: string, object: Record<string, unknown>) => ({ id, type, object: "event", data: { object } })
const send = (stripe: Stripe, e: unknown, secret = WEBHOOK_SECRET) => {
  const body = JSON.stringify(e)
  return receiveStripeEvent(db, stripe, WEBHOOK_SECRET, body, signer.generateTestHeaderString({ payload: body, secret }))
}

let n = 0
async function pendingPass() {
  n++
  const pass = await callApi(ctxFor(db, writeKey, "2026-12-01T17:00:00Z"), passesCreate, {
    customer: { firstName: "Wes", lastName: "Tester", email: `wes${n}@example.com` }, property: { address: `${n} Oak St`, town: "Erie" }, zones: 8, consent: { termsAccepted: true },
  })
  return { passId: pass.id, customerId: pass.customer!.id }
}

describe("receiveStripeEvent", () => {
  it("answers 503 webhook not configured when the secret is unset, without reading the body", async () => {
    const { stripe } = stubStripe()
    await expect(receiveStripeEvent(db, stripe, undefined, "{}", "t=1,v1=x")).resolves.toEqual({ status: 503, error: "webhook not configured" })
    await expect(receiveStripeEvent(db, stripe, "", "{}", null)).resolves.toMatchObject({ status: 503 })
  })
  it("rejects a bad or missing signature with 400 and queues nothing", async () => {
    const { stripe } = stubStripe()
    const p = await pendingPass()
    const e = event("evt_bad", "checkout.session.completed", { id: "cs_1", metadata: { purpose: "pass-setup", passId: p.passId } })
    expect(await send(stripe, e, "whsec_wrong")).toMatchObject({ status: 400 })
    expect(await receiveStripeEvent(db, stripe, WEBHOOK_SECRET, JSON.stringify(e), null)).toMatchObject({ status: 400 })
    expect(await db.select().from(s.queueItem).where(eq(s.queueItem.key, "evt_bad"))).toHaveLength(0)
  })
  it("queues a verified event once on its id; a replay is a no-op", async () => {
    const { stripe } = stubStripe()
    const p = await pendingPass()
    const e = event("evt_once", "checkout.session.completed", { id: "cs_1", metadata: { purpose: "pass-setup", passId: p.passId } })
    expect(await send(stripe, e)).toEqual({ status: 200, queued: true })
    expect(await send(stripe, e)).toEqual({ status: 200, queued: false })
    expect(await db.select().from(s.queueItem).where(eq(s.queueItem.key, "evt_once"))).toHaveLength(1)
  })
  it("answers 200 and queues nothing for an event of no interest", async () => {
    const { stripe } = stubStripe()
    expect(await send(stripe, event("evt_other", "customer.created", { id: "cus_x" }))).toEqual({ status: 200, queued: false })
  })
})

describe("handleStripeEvent", () => {
  it("activates a pass on checkout.session.completed through passes.activate, drained from the queue", async () => {
    const p = await pendingPass()
    const { stripe: st } = stubStripe({ sessions: { cs_act: completeSession("cs_act", { purpose: "pass-setup", passId: p.passId }, { customer: "cus_w" }) } })
    getStripe.mockReturnValue(st)
    const e = event("evt_act", "checkout.session.completed", { id: "cs_act", metadata: { purpose: "pass-setup", passId: p.passId } })
    await send(st, e)
    await drain(db, { "stripe-webhook": (d, item) => handleStripeEvent(d, st, item.organizationId, (item.payload as { event: Stripe.Event }).event, "https://site.test") })
    const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, p.passId))
    expect(pass).toMatchObject({ status: "active", stripePaymentMethodId: "pm_new" })
  })

  it("on payment_method.detached clears the card and queues card-expiring; a replaced card is ignored", async () => {
    const p = await pendingPass()
    await db.update(s.seasonPass).set({ status: "active", stripePaymentMethodId: "pm_gone", cardLast4: "4242" }).where(eq(s.seasonPass.id, p.passId))
    await db.update(s.customer).set({ stripeCustomerId: "cus_gone" }).where(eq(s.customer.id, p.customerId))
    const { stripe } = stubStripe()
    const detached = (id: string, pm: string) => event(id, "payment_method.detached", { id: pm }) as unknown as Stripe.Event
    await handleStripeEvent(db, stripe, (await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, p.passId)))[0]!.organizationId, detached("evt_d1", "pm_gone"), "https://site.test")
    const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, p.passId))
    expect(pass).toMatchObject({ stripePaymentMethodId: null, cardLast4: null })
    const rows = await db.select().from(s.messageLog).where(eq(s.messageLog.customerId, p.customerId))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ kind: "card-expiring", channel: "email", status: "queued" })
    await handleStripeEvent(db, stripe, pass!.organizationId, detached("evt_d2", "pm_gone"), "https://site.test")
    expect(await db.select().from(s.messageLog).where(eq(s.messageLog.customerId, p.customerId))).toHaveLength(1)
  })

  it("reconciles a payment_intent.succeeded for a charge that was left pending", async () => {
    const p = await pendingPass()
    const [v] = await db.select().from(s.visit).where(eq(s.visit.passId, p.passId))
    await db.insert(s.charge).values({ organizationId: v!.organizationId, passId: p.passId, visitId: v!.id, attempt: 1, amount: v!.amount, status: "pending", stripePaymentIntentId: "pi_late" })
    const { stripe } = stubStripe()
    await handleStripeEvent(db, stripe, v!.organizationId, event("evt_pi", "payment_intent.succeeded", { id: "pi_late" }) as unknown as Stripe.Event, "https://site.test")
    const [c] = await db.select().from(s.charge).where(eq(s.charge.stripePaymentIntentId, "pi_late"))
    expect(c!.status).toBe("succeeded")
    const [after] = await db.select().from(s.visit).where(eq(s.visit.id, v!.id))
    expect(after!.chargedAt).not.toBeNull()
  })
})
