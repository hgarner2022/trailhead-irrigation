// @vitest-environment node
import { NO_TAX } from "@/lib/jobs/tax"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import type Stripe from "stripe"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "@/api/core/call"
import { invoicesCancel, invoicesSend } from "@/api/v1/invoices/handlers"
import { passesCreate } from "@/api/v1/passes/handlers"
import { visitsGet } from "@/api/v1/visits/handlers"
import { visitsCreate } from "@/api/v1/visits/office"
import { adminKey, apiDb, ctxFor, eventsOf, linesOfJob, ORG, passJobOf, passViewOf, setPass, writeKey } from "@/api/test-helpers"
import { linesOfVisit, visitPrice } from "@/lib/jobs/lines"
import { drain } from "@/lib/queue"
import { handleStripeEvent, organizationOfEvent, receiveStripeEvent } from "./webhook"
import { completeSession, paidIntent, signer, stubStripe, WEBHOOK_SECRET } from "./test-stripe"

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

/** What a visit costs: its own lines' total. */
const priceOf = async (v: { id: string; jobId: string }) => visitPrice(linesOfVisit(await linesOfJob(db, v.jobId), v.id), NO_TAX)

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
    expect(await passViewOf(db, p.passId)).toMatchObject({ status: "active", soldOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })
    // The card lands on the customer.
    const [owner] = await db.select().from(s.customer).where(eq(s.customer.id, p.customerId))
    expect(owner).toMatchObject({ stripePaymentMethodId: "pm_new", stripeCustomerId: "cus_w" })
  })

  it("activates a pass whose Stripe session names the old pass id, and finds its organization by it", async () => {
    const p = await pendingPass()
    const old = `old-${p.passId}`
    await db.update(s.job).set({ legacyPassId: old }).where(eq(s.job.id, p.passId))
    const { stripe: st } = stubStripe({ sessions: { cs_old: completeSession("cs_old", { purpose: "pass-setup", passId: old }, { customer: "cus_old" }) } })
    getStripe.mockReturnValue(st)
    const e = event("evt_old", "checkout.session.completed", { id: "cs_old", metadata: { purpose: "pass-setup", passId: old } })
    expect(await organizationOfEvent(db, e as unknown as Stripe.Event)).toBe(ORG)
    expect(await send(st, e)).toEqual({ status: 200, queued: true })
    await drain(db, { "stripe-webhook": (d, item) => handleStripeEvent(d, st, item.organizationId, (item.payload as { event: Stripe.Event }).event, "https://site.test") })
    expect(await passViewOf(db, p.passId)).toMatchObject({ status: "active" })
    expect(await eventsOf(db, { kind: "job.sold", jobId: p.passId })).toHaveLength(1)
  })

  it("on payment_method.detached clears the card and queues card-expiring; a replaced card is ignored", async () => {
    const p = await pendingPass()
    // The email goes about the customer's newest active pass, and a pass is active when its job is sold and not canceled.
    await setPass(db, p.passId, { status: "active" })
    await db.update(s.customer).set({ stripeCustomerId: "cus_gone", stripePaymentMethodId: "pm_gone", cardLast4: "4242", cardBrand: "visa", cardExpires: "2030-08" }).where(eq(s.customer.id, p.customerId))
    const { stripe } = stubStripe()
    const detached = (id: string, pm: string) => event(id, "payment_method.detached", { id: pm }) as unknown as Stripe.Event
    const org = (await passJobOf(db, p.passId)).organizationId
    await handleStripeEvent(db, stripe, org, detached("evt_d1", "pm_gone"), "https://site.test")
    const [owner] = await db.select().from(s.customer).where(eq(s.customer.id, p.customerId))
    expect(owner).toMatchObject({ stripePaymentMethodId: null, cardLast4: null, cardBrand: null, cardExpires: null })
    const rows = await db.select().from(s.messageLog).where(eq(s.messageLog.customerId, p.customerId))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ kind: "card-expiring", channel: "email", status: "queued" })
    await handleStripeEvent(db, stripe, org, detached("evt_d2", "pm_gone"), "https://site.test")
    expect(await db.select().from(s.messageLog).where(eq(s.messageLog.customerId, p.customerId))).toHaveLength(1)
    // One `card.removed` about the customer, by the system; the repeat finds no card and adds none.
    expect(await eventsOf(db, { kind: "card.removed", customerId: p.customerId })).toMatchObject([{ about: "customer", aboutId: p.customerId, jobId: null, who: "system", detail: { brand: "visa", last4: "4242" } }])
  })

  it("finds the customer by their payment method, which only the customer holds", async () => {
    const p = await pendingPass()
    await setPass(db, p.passId, { status: "active" })
    await db.update(s.customer).set({ stripePaymentMethodId: "pm_only_customer", cardLast4: "1111" }).where(eq(s.customer.id, p.customerId))
    const { stripe } = stubStripe()
    const org = (await passJobOf(db, p.passId)).organizationId
    const detached = (id: string, pm: string) => event(id, "payment_method.detached", { id: pm }) as unknown as Stripe.Event
    expect(await send(stripe, detached("evt_c1", "pm_only_customer"))).toEqual({ status: 200, queued: true })
    await handleStripeEvent(db, stripe, org, detached("evt_c1", "pm_only_customer"), "https://site.test")
    expect((await db.select().from(s.customer).where(eq(s.customer.id, p.customerId)))[0]).toMatchObject({ stripePaymentMethodId: null, cardLast4: null })
    // A method nobody holds is no one's: the event is answered and queues nothing.
    expect(await send(stripe, detached("evt_c2", "pm_nobody"))).toEqual({ status: 200, queued: false })
  })

  it("a detach of the old card after an update leaves the customer's new card and sends nothing", async () => {
    const p = await pendingPass()
    await setPass(db, p.passId, { status: "active" })
    await db.update(s.customer).set({ stripeCustomerId: "cus_n", stripePaymentMethodId: "pm_fresh", cardLast4: "1111", cardBrand: "visa", cardExpires: "2031-01" }).where(eq(s.customer.id, p.customerId))
    const { stripe } = stubStripe()
    const org = (await passJobOf(db, p.passId)).organizationId
    await handleStripeEvent(db, stripe, org, event("evt_stale", "payment_method.detached", { id: "pm_stale" }) as unknown as Stripe.Event, "https://site.test")
    expect((await db.select().from(s.customer).where(eq(s.customer.id, p.customerId)))[0]).toMatchObject({ stripePaymentMethodId: "pm_fresh", cardLast4: "1111", cardBrand: "visa", cardExpires: "2031-01" })
    expect(await db.select().from(s.messageLog).where(eq(s.messageLog.customerId, p.customerId))).toHaveLength(0)
    expect(await eventsOf(db, { kind: "card.removed", customerId: p.customerId })).toEqual([])
  })

  it("on payment_intent.payment_failed marks a pending charge failed and writes payment.failed once, however often it is delivered", async () => {
    const p = await pendingPass()
    const [v] = await db.select().from(s.visit).where(eq(s.visit.jobId, p.passId))
    await db.insert(s.charge).values({ organizationId: v!.organizationId, jobId: v!.jobId, customerId: p.customerId, visitId: v!.id, attempt: 1, amount: await priceOf(v!), status: "pending", stripePaymentIntentId: "pi_declined" })
    const { stripe } = stubStripe()
    const failed = event("evt_pf", "payment_intent.payment_failed", { id: "pi_declined", last_payment_error: { message: "Your card was declined." } }) as unknown as Stripe.Event
    await handleStripeEvent(db, stripe, v!.organizationId, failed, "https://site.test")
    await handleStripeEvent(db, stripe, v!.organizationId, failed, "https://site.test")
    const [c] = await db.select().from(s.charge).where(eq(s.charge.stripePaymentIntentId, "pi_declined"))
    expect(c).toMatchObject({ status: "failed", failureMessage: "Your card was declined." })
    expect(await eventsOf(db, { kind: "payment.failed", jobId: v!.jobId })).toMatchObject([{ about: "payment", aboutId: c!.id, customerId: p.customerId, visitId: v!.id, who: "system", detail: { amount: await priceOf(v!), message: "Your card was declined.", name: "Spring turn-on" } }])
  })

  it("reconciles a payment_intent.succeeded for a charge that was left pending", async () => {
    const p = await pendingPass()
    const [v] = await db.select().from(s.visit).where(eq(s.visit.jobId, p.passId))
    await db.insert(s.charge).values({ organizationId: v!.organizationId, jobId: v!.jobId, visitId: v!.id, attempt: 1, amount: await priceOf(v!), status: "pending", stripePaymentIntentId: "pi_late" })
    const { stripe } = stubStripe()
    await handleStripeEvent(db, stripe, v!.organizationId, event("evt_pi", "payment_intent.succeeded", { id: "pi_late" }) as unknown as Stripe.Event, "https://site.test")
    const [c] = await db.select().from(s.charge).where(eq(s.charge.stripePaymentIntentId, "pi_late"))
    expect(c!.status).toBe("succeeded")
    // the visit reads as charged from the payment row that now went through (derived, no column)
    expect((await callApi(ctxFor(db, adminKey), visitsGet, { id: v!.id })).chargedAt).not.toBeNull()
    // Completing the pending row writes payment.succeeded once; a redelivery finds it succeeded and adds none.
    expect(await eventsOf(db, { kind: "payment.succeeded", visitId: v!.id })).toMatchObject([{ about: "payment", aboutId: c!.id, visitId: v!.id, who: "system", detail: { amount: await priceOf(v!), name: "Spring turn-on" } }])
    await handleStripeEvent(db, stripe, v!.organizationId, event("evt_pi", "payment_intent.succeeded", { id: "pi_late" }) as unknown as Stripe.Event, "https://site.test")
    expect(await eventsOf(db, { kind: "payment.succeeded", visitId: v!.id })).toHaveLength(1)
  })
})

describe("an invoice's Checkout Session completed", () => {
  const NOW = "2027-05-10T18:00:00Z"
  let day = new Date("2027-06-01T12:00:00Z")
  const nextWeekday = () => {
    do day = new Date(day.getTime() + 86_400_000)
    while ([0, 6].includes(day.getUTCDay()))
    return day.toISOString().slice(0, 10)
  }
  /** A repair for Dana that is done and invoiced: the sent invoice. */
  async function sentBill() {
    const v = await callApi(ctxFor(db, writeKey, "2027-05-07T20:00:00Z"), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: nextWeekday(), price: 145 })
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-05-07" }).where(eq(s.visit.id, v.id))
    const invoice = await callApi(ctxFor(db, writeKey, "2027-05-07T20:00:00Z"), invoicesSend, { jobId: v.jobId })
    return { visit: v, invoice }
  }
  const session = (id: string, invoiceId: string, intent: string, over: Record<string, unknown> = {}) => ({ id, payment_status: "paid", payment_intent: intent, customer: "cus_dana", metadata: { purpose: "invoice", invoiceId }, ...over })
  const completed = (evt: string, sess: Record<string, unknown>) => event(evt, "checkout.session.completed", sess) as unknown as Stripe.Event
  const rowsOf = (jobId: string) => db.select().from(s.charge).where(eq(s.charge.jobId, jobId))
  const receipts = async (customerId: string, invoiceNumber: string) => (await db.select().from(s.messageLog).where(eq(s.messageLog.customerId, customerId))).filter((m) => m.kind === "receipt" && (m.data as { invoiceNumber?: string } | null)?.invoiceNumber === invoiceNumber)
  const paidEvents = async (invoiceId: string) => (await db.select().from(s.outboundEvent)).filter((e) => e.event === "payment.succeeded" && (e.payload as { invoiceId?: string }).invoiceId === invoiceId)

  beforeAll(async () => {
    vi.stubEnv("APP_URL", "https://site.test")
    await db.update(s.customer).set({ email: "dana@example.com", stripeCustomerId: "cus_dana" }).where(eq(s.customer.id, "c100"))
    await db.insert(s.webhookEndpoint).values({ id: "wh-pay", organizationId: ORG, url: "https://hooks.test/pay", secret: "shh", events: ["payment.succeeded"] })
  })

  it("writes the payment, marks the invoice paid, keeps the card on the customer, stamps the visits and queues the receipt", async () => {
    const { visit, invoice } = await sentBill()
    const { stripe, calls } = stubStripe({ intents: { pi_bill_a: paidIntent("pi_bill_a", { pm: "pm_bill_a", customer: "cus_dana" }, "https://pay.stripe.test/receipt/a") } })
    await handleStripeEvent(db, stripe, ORG, completed("evt_bill_a", session("cs_bill_a", invoice.id, "pi_bill_a")), "https://site.test", new Date(NOW))

    const [row, ...rest] = await rowsOf(visit.jobId)
    expect(rest).toEqual([])
    expect(row).toMatchObject({ organizationId: ORG, jobId: visit.jobId, customerId: "c100", visitId: null, amount: 145, method: "card_now", status: "succeeded", paidOn: "2027-05-10", stripePaymentIntentId: "pi_bill_a", receiptUrl: "https://pay.stripe.test/receipt/a" })
    const [paid] = await db.select().from(s.invoice).where(eq(s.invoice.id, invoice.id))
    expect(paid).toMatchObject({ paidOn: "2027-05-10", paymentId: row!.id, stripePaymentIntentId: "pi_bill_a", cancelledAt: null })
    const [owner] = await db.select().from(s.customer).where(eq(s.customer.id, "c100"))
    expect(owner).toMatchObject({ stripePaymentMethodId: "pm_bill_a", cardBrand: "visa", cardLast4: "4242", cardExpires: "2030-08", cardFailedAt: null })
    expect(calls.customersUpdate).toHaveBeenCalledWith("cus_dana", { invoice_settings: { default_payment_method: "pm_bill_a" } })
    // the job's done visit reads as paid from the invoice's payment, with no stamp on the visit
    expect((await callApi(ctxFor(db, adminKey), visitsGet, { id: visit.id })).paymentStatus).toBe("paid")
    const [receipt, ...more] = await receipts("c100", invoice.number)
    expect(more).toEqual([])
    expect(receipt).toMatchObject({ channel: "email", to: "dana@example.com", key: `payment-${row!.id}`, status: "queued", subject: `Receipt: $145 for your invoice ${invoice.number}` })
    expect(receipt!.body).toContain("Visa ending 4242")
    expect(receipt!.body).toContain("Repair: $145")
    expect(await paidEvents(invoice.id)).toHaveLength(1)
    // The story of the payment: the payment row, the invoice it settled, and the card it kept, each by the system.
    expect(await eventsOf(db, { kind: "payment.succeeded", jobId: visit.jobId })).toMatchObject([{ about: "payment", aboutId: row!.id, customerId: "c100", visitId: null, who: "system", detail: { amount: 145, method: "card_now", invoiceNumber: invoice.number } }])
    expect(await eventsOf(db, { kind: "invoice.paid", jobId: visit.jobId })).toMatchObject([{ about: "invoice", aboutId: invoice.id, customerId: "c100", who: "system", detail: { number: invoice.number, total: 145, how: "card_now" } }])
    expect((await eventsOf(db, { kind: "card.saved", customerId: "c100" })).filter((e) => (e.detail as { last4: string }).last4 === "4242").length).toBeGreaterThan(0)
  })

  it("adds nothing when the same event, or another event for the same session, arrives again", async () => {
    const { visit, invoice } = await sentBill()
    const { stripe } = stubStripe({ intents: { pi_bill_b: paidIntent("pi_bill_b", { pm: "pm_bill_b", customer: "cus_dana" }) } })
    const sess = session("cs_bill_b", invoice.id, "pi_bill_b")
    await handleStripeEvent(db, stripe, ORG, completed("evt_bill_b", sess), "https://site.test", new Date(NOW))
    await handleStripeEvent(db, stripe, ORG, completed("evt_bill_b", sess), "https://site.test", new Date("2027-05-11T18:00:00Z"))
    await handleStripeEvent(db, stripe, ORG, completed("evt_bill_b2", sess), "https://site.test", new Date("2027-05-12T18:00:00Z"))
    expect(await rowsOf(visit.jobId)).toHaveLength(1)
    expect(await receipts("c100", invoice.number)).toHaveLength(1)
    expect(await paidEvents(invoice.id)).toHaveLength(1)
    expect((await db.select().from(s.invoice).where(eq(s.invoice.id, invoice.id)))[0]!.paidOn).toBe("2027-05-10")
    // The queue route: the same event delivered twice queues one task, and draining it still adds nothing.
    const e = completed("evt_bill_b3", sess)
    expect(await send(stripe, e)).toEqual({ status: 200, queued: true })
    expect(await send(stripe, e)).toEqual({ status: 200, queued: false })
    await drain(db, { "stripe-webhook": (d, item) => handleStripeEvent(d, stripe, item.organizationId, (item.payload as { event: Stripe.Event }).event, "https://site.test") })
    expect(await rowsOf(visit.jobId)).toHaveLength(1)
    expect(await receipts("c100", invoice.number)).toHaveLength(1)
    // A redelivered Stripe event adds no second event of any kind.
    expect(await eventsOf(db, { kind: "payment.succeeded", jobId: visit.jobId })).toHaveLength(1)
    expect(await eventsOf(db, { kind: "invoice.paid", jobId: visit.jobId })).toHaveLength(1)
    expect(await eventsOf(db, { jobId: visit.jobId, about: "invoice" }).then((r) => r.map((e) => e.kind).sort())).toEqual(["invoice.paid", "invoice.sent"])
  })

  it("finishes a half-done run: a payment row with the invoice still unpaid gets the rest, once", async () => {
    const { visit, invoice } = await sentBill()
    await db.insert(s.charge).values({ organizationId: ORG, jobId: visit.jobId, customerId: "c100", visitId: null, amount: 145, status: "succeeded", method: "card_now", stripePaymentIntentId: "pi_bill_c", paidOn: "2027-05-10" })
    const { stripe } = stubStripe({ intents: { pi_bill_c: paidIntent("pi_bill_c", { pm: "pm_bill_c", customer: "cus_dana" }) } })
    await handleStripeEvent(db, stripe, ORG, completed("evt_bill_c", session("cs_bill_c", invoice.id, "pi_bill_c")), "https://site.test", new Date(NOW))
    expect(await rowsOf(visit.jobId)).toHaveLength(1)
    expect((await db.select().from(s.invoice).where(eq(s.invoice.id, invoice.id)))[0]!.paidOn).toBe("2027-05-10")
    expect(await receipts("c100", invoice.number)).toHaveLength(1)
    // No second payment.succeeded: the run that wrote the row owns that event.
    expect(await paidEvents(invoice.id)).toHaveLength(0)
    expect(await eventsOf(db, { kind: "payment.succeeded", jobId: visit.jobId })).toEqual([])
    expect(await eventsOf(db, { kind: "invoice.paid", jobId: visit.jobId })).toHaveLength(1)
  })

  it("records a payment that arrives for a canceled invoice, leaves the invoice canceled and never twice", async () => {
    const { visit, invoice } = await sentBill()
    await callApi(ctxFor(db, adminKey, NOW), invoicesCancel, { id: invoice.id })
    const { stripe } = stubStripe({ intents: { pi_bill_d: paidIntent("pi_bill_d", { pm: "pm_bill_d", customer: "cus_dana" }) } })
    const e = completed("evt_bill_d", session("cs_bill_d", invoice.id, "pi_bill_d"))
    await handleStripeEvent(db, stripe, ORG, e, "https://site.test", new Date(NOW))
    await handleStripeEvent(db, stripe, ORG, e, "https://site.test", new Date(NOW))
    expect(await rowsOf(visit.jobId)).toHaveLength(1)
    const [after] = await db.select().from(s.invoice).where(eq(s.invoice.id, invoice.id))
    expect(after!.cancelledAt).not.toBeNull()
    expect(after).toMatchObject({ paidOn: null, paymentId: null })
    expect(await receipts("c100", invoice.number)).toHaveLength(1)
    // The money is real, so the payment is in the story; the invoice was canceled and is never reported paid.
    expect(await eventsOf(db, { kind: "payment.succeeded", jobId: visit.jobId })).toHaveLength(1)
    expect(await eventsOf(db, { kind: "invoice.paid", jobId: visit.jobId })).toEqual([])
    expect(await eventsOf(db, { kind: "invoice.cancelled", jobId: visit.jobId })).toHaveLength(1)
  })

  it("ignores a session that is not paid, one with no invoice, and another organization's bill", async () => {
    const { visit, invoice } = await sentBill()
    const { stripe } = stubStripe({ intents: { pi_bill_e: paidIntent("pi_bill_e") } })
    await handleStripeEvent(db, stripe, ORG, completed("evt_e1", session("cs_e1", invoice.id, "pi_bill_e", { payment_status: "unpaid" })), "https://site.test", new Date(NOW))
    await handleStripeEvent(db, stripe, ORG, completed("evt_e2", session("cs_e2", "no-such-bill", "pi_bill_e")), "https://site.test", new Date(NOW))
    await handleStripeEvent(db, stripe, "another-org", completed("evt_e3", session("cs_e3", invoice.id, "pi_bill_e")), "https://site.test", new Date(NOW))
    expect(await rowsOf(visit.jobId)).toHaveLength(0)
    expect((await db.select().from(s.invoice).where(eq(s.invoice.id, invoice.id)))[0]!.paidOn).toBeNull()
    expect(await eventsOf(db, { jobId: visit.jobId, about: "payment" })).toEqual([])
  })

  it("keeps the card the customer holds when it is the one just used, and replaces and detaches an old one", async () => {
    await db.update(s.customer).set({ stripePaymentMethodId: "pm_same", cardLast4: "4242" }).where(eq(s.customer.id, "c100"))
    const a = await sentBill()
    const same = stubStripe({ intents: { pi_same: paidIntent("pi_same", { pm: "pm_same", customer: "cus_dana" }) } })
    await handleStripeEvent(db, same.stripe, ORG, completed("evt_same", session("cs_same", a.invoice.id, "pi_same")), "https://site.test", new Date(NOW))
    expect(same.calls.customersUpdate).not.toHaveBeenCalled()
    expect(same.calls.detach).not.toHaveBeenCalled()
    const b = await sentBill()
    const fresh = stubStripe({ intents: { pi_fresh: paidIntent("pi_fresh", { pm: "pm_fresh", last4: "1111", customer: "cus_dana" }) } })
    await handleStripeEvent(db, fresh.stripe, ORG, completed("evt_fresh", session("cs_fresh", b.invoice.id, "pi_fresh")), "https://site.test", new Date(NOW))
    expect(fresh.calls.detach).toHaveBeenCalledWith("pm_same")
    expect((await db.select().from(s.customer).where(eq(s.customer.id, "c100")))[0]).toMatchObject({ stripePaymentMethodId: "pm_fresh", cardLast4: "1111" })
  })

  it("finds the organization from the invoice on both the session and its payment intent, and changes nothing for an attempt that did not go through", async () => {
    const { visit, invoice } = await sentBill()
    const { stripe } = stubStripe()
    expect(await organizationOfEvent(db, completed("evt_o1", session("cs_o1", invoice.id, "pi_o1")))).toBe(ORG)
    const failed = event("evt_o2", "payment_intent.payment_failed", { id: "pi_o2", metadata: { purpose: "invoice", invoiceId: invoice.id }, last_payment_error: { message: "Your card was declined." } }) as unknown as Stripe.Event
    expect(await organizationOfEvent(db, failed)).toBe(ORG)
    expect(await organizationOfEvent(db, completed("evt_o3", session("cs_o3", "no-such-bill", "pi_o3")))).toBeNull()
    await handleStripeEvent(db, stripe, ORG, failed, "https://site.test", new Date(NOW))
    expect(await rowsOf(visit.jobId)).toHaveLength(0)
    expect((await db.select().from(s.invoice).where(eq(s.invoice.id, invoice.id)))[0]).toMatchObject({ paidOn: null, paymentId: null })
  })
})
