// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { stubStripe } from "@/lib/stripe/test-stripe"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, eventsOf, key, ORG, readKey, writeKey } from "../../test-helpers"
import { customersGet } from "../customers/handlers"
import { visitsCreate } from "../visits/office"
import { visitsGet, visitsMove } from "../visits/handlers"
import { visitsMarkClosed } from "../visits/money"
import { paymentsList, paymentsRecord, paymentsRefund } from "./handlers"

const { getStripe } = vi.hoisted(() => ({ getStripe: vi.fn() }))
vi.mock("@/lib/stripe/client", async (original) => ({ ...(await original<typeof import("@/lib/stripe/client")>()), getStripe }))

let db: TestDb
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  await db.update(s.customer).set({ email: "dana@example.com" }).where(eq(s.customer.id, "c100"))
})
afterAll(() => db.close())

const as = (p = adminKey) => ctxFor(db, p, "2027-05-07T20:00:00Z")
// One weekday per visit from 2027-06-01 (a Tuesday), so no day is ever full.
let n = 0
const nextDay = () => {
  const d = new Date(Date.UTC(2027, 5, 1 + n++ + Math.floor(n / 5) * 2))
  return d.toISOString().slice(0, 10)
}
const repair = (price = 145) => callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: nextDay(), price })

let stripe: ReturnType<typeof stubStripe>
beforeEach(() => {
  stripe = stubStripe()
  getStripe.mockReturnValue(stripe.stripe)
})

describe("payments.record", () => {
  it("writes a succeeded row on the job with the day it arrived, the visit's charged_at alias and the receipt, and lists it by job and by customer", async () => {
    const v = await repair()
    const row = await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 145, method: "check", reference: "1042" })
    expect(row).toMatchObject({ jobId: v.jobId, visitId: v.id, customerId: "c100", amount: 145, method: "check", reference: "1042", status: "succeeded", paidOn: "2027-05-07", refundsPaymentId: null })
    expect((await db.select().from(s.visit).where(eq(s.visit.id, v.id)))[0]!.chargedAt).toBeInstanceOf(Date)
    const receipts = (await db.select().from(s.messageLog)).filter((m) => m.visitId === v.id && m.kind === "receipt")
    expect(receipts).toHaveLength(1)
    expect(receipts[0]!.body).toContain("check")
    // a read key sees the money but not the check number or a receipt link
    const asRead = { ...row, reference: null, receiptUrl: null }
    expect((await callApi(as(readKey), paymentsList, { jobId: v.jobId })).data).toEqual([asRead])
    expect((await callApi(as(writeKey), paymentsList, { jobId: v.jobId })).data).toEqual([row])
    expect((await callApi(as(readKey), paymentsList, { customerId: "c100" })).data.map((p) => p.id)).toContain(row.id)
    const out = await callApi(as(writeKey), visitsGet, { id: v.id })
    expect(out.payments).toEqual([row])
    const job = (await callApi(as(readKey), customersGet, { id: "c100" })).jobs.find((j) => j.id === v.jobId)!
    expect(job).toMatchObject({ payments: [asRead], money: { paid: 145, total: 145, owed: 0, words: "Paid" } })
    const writeJob = (await callApi(as(writeKey), customersGet, { id: "c100" })).jobs.find((j) => j.id === v.jobId)!
    expect(writeJob.payments).toEqual([row])
  })

  it("keeps the reference and the card receipt from a read key, on every way the payment is read", async () => {
    const v = await repair()
    const row = await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 145, method: "venmo", reference: "@dana" })
    await db.update(s.charge).set({ receiptUrl: "https://pay.stripe.test/receipt/secret" }).where(eq(s.charge.id, row.id))
    const listed = (await callApi(as(readKey), paymentsList, { customerId: "c100" })).data.find((p) => p.id === row.id)!
    expect(listed).toMatchObject({ amount: 145, method: "venmo", reference: null, receiptUrl: null })
    expect((await callApi(as(writeKey), paymentsList, { customerId: "c100" })).data.find((p) => p.id === row.id)).toMatchObject({ reference: "@dana", receiptUrl: "https://pay.stripe.test/receipt/secret" })
    const job = (await callApi(as(readKey), customersGet, { id: "c100" })).jobs.find((j) => j.id === v.jobId)!
    expect(job.payments).toMatchObject([{ reference: null, receiptUrl: null }])
    expect(JSON.stringify(await callApi(as(readKey), customersGet, { id: "c100" }))).not.toMatch(/@dana|receipt\/secret/)
  })

  it("takes the day it is given, prices an unpriced visit's line, and records a payment on the job as a whole", async () => {
    const v = await callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "install", scheduledOn: nextDay() })
    const row = await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 3200, method: "venmo", paidOn: "2027-05-05" })
    expect(row.paidOn).toBe("2027-05-05")
    expect((await db.select().from(s.lineItem).where(eq(s.lineItem.visitId, v.id)))[0]!.unitPrice).toBe(3200)
    expect((await db.select().from(s.job).where(eq(s.job.id, v.jobId)))[0]!.price).toBe(3200)
    const whole = await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, amount: 100, method: "cash" })
    expect(whole).toMatchObject({ visitId: null, jobId: v.jobId, amount: 100 })
    const job = (await callApi(as(readKey), customersGet, { id: "c100" })).jobs.find((j) => j.id === v.jobId)!
    expect(job.money).toMatchObject({ paid: 3300, total: 3200, owed: 0, words: "Paid" })
  })

  it("refuses a second payment of a visit already paid in full, writing no second row and sending no second receipt", async () => {
    const v = await repair()
    await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 145, method: "check" })
    await expect(callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 145, method: "check" })).rejects.toMatchObject({ code: "conflict", message: "This visit is already paid" })
    expect(await db.select().from(s.charge).where(eq(s.charge.visitId, v.id))).toHaveLength(1)
    expect((await db.select().from(s.messageLog)).filter((m) => m.visitId === v.id && m.kind === "receipt")).toHaveLength(1)
    const job = (await callApi(as(readKey), customersGet, { id: "c100" })).jobs.find((j) => j.id === v.jobId)!
    expect(job.money).toMatchObject({ paid: 145, total: 145, owed: 0 })
  })

  it("refuses an amount above what is still owed on the visit, takes the rest after a part payment, and owes again after a refund", async () => {
    const v = await repair()
    await expect(callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 146, method: "cash" })).rejects.toMatchObject({ code: "unprocessable", message: "Only $145 is still owed on this visit" })
    const part = await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 100, method: "cash" })
    await expect(callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 100, method: "cash" })).rejects.toMatchObject({ code: "unprocessable", message: "Only $45 is still owed on this visit" })
    await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 45, method: "check" })
    await expect(callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 1, method: "check" })).rejects.toMatchObject({ code: "conflict" })
    // a refund makes the money owed again, and it can be taken again
    await callApi(as(), paymentsRefund, { paymentId: part.id })
    expect(await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 100, method: "venmo" })).toMatchObject({ amount: 100 })
    expect(await db.select().from(s.charge).where(eq(s.charge.visitId, v.id))).toHaveLength(4)
  })

  it("leaves a payment on the job as a whole, with no visit, to the job's own balance", async () => {
    const v = await repair()
    expect(await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, amount: 500, method: "check" })).toMatchObject({ visitId: null, amount: 500 })
  })

  it("refuses a pass visit whose customer has a card, since it is charged to the card", async () => {
    await callApi(as(writeKey), visitsMove, { id: "p3-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-05" })
    const [visit] = await db.select().from(s.visit).where(eq(s.visit.id, "p3-turn-on"))
    await expect(callApi(as(writeKey), paymentsRecord, { jobId: visit!.jobId, visitId: "p3-turn-on", amount: 145, method: "cash" })).rejects.toMatchObject({ code: "unprocessable", message: "A pass visit is charged to the pass's card" })
    expect(await db.select().from(s.charge).where(eq(s.charge.visitId, "p3-turn-on"))).toEqual([])
  })

  it("refuses a visit of another job, an unknown job and a read key, and cannot reach another organization's job", async () => {
    const a = await repair()
    const b = await repair()
    await expect(callApi(as(writeKey), paymentsRecord, { jobId: a.jobId, visitId: b.id, amount: 145, method: "cash" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(as(writeKey), paymentsRecord, { jobId: "nope", amount: 145, method: "cash" })).rejects.toMatchObject({ code: "not_found" })
    await expect(callApi(as(readKey), paymentsRecord, { jobId: a.jobId, amount: 145, method: "cash" })).rejects.toMatchObject({ code: "forbidden" })
    await db.insert(s.organization).values({ id: "org-b", name: "Other", termsVersion: "1", settings: { windows: [], bufferPercentEarly: 0, bufferPercentLate: 0, fallTownOrder: [], springTownOrder: [], messages: [] } })
    const other = { ...key("read", "write", "admin"), organizationId: "org-b" }
    await expect(callApi(ctxFor(db, other), paymentsRecord, { jobId: a.jobId, amount: 145, method: "cash" })).rejects.toMatchObject({ code: "not_found" })
    expect((await callApi(ctxFor(db, other), paymentsList, { jobId: a.jobId })).data).toEqual([])
    expect(ORG).not.toBe("org-b")
  })

  it("needs a job or a customer to list", async () => {
    await expect(callApi(as(readKey), paymentsList, {})).rejects.toMatchObject({ code: "invalid" })
  })
})

describe("payments.refund", () => {
  it("refunds a cash payment as a record only: a negative row naming the payment, and the job owes again", async () => {
    const v = await repair()
    const paid = await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 145, method: "cash" })
    const refund = await callApi(as(), paymentsRefund, { paymentId: paid.id, reason: "wrong job" })
    expect(refund).toMatchObject({ amount: -145, method: "cash", status: "succeeded", refundsPaymentId: paid.id, jobId: v.jobId, visitId: v.id, customerId: "c100", reference: "wrong job" })
    expect(stripe.calls.refundsCreate).not.toHaveBeenCalled()
    const job = (await callApi(as(readKey), customersGet, { id: "c100" })).jobs.find((j) => j.id === v.jobId)!
    expect(job.money).toMatchObject({ paid: 0, owed: 145, words: "$145 owed" })
    expect((await db.select().from(s.visit).where(eq(s.visit.id, v.id)))[0]!.chargedAt).toBeNull()
    await expect(callApi(as(), paymentsRefund, { paymentId: paid.id })).rejects.toMatchObject({ code: "conflict" })
    await expect(callApi(as(), paymentsRefund, { paymentId: refund.id })).rejects.toMatchObject({ code: "unprocessable" })
  })

  it("refunds a card payment through Stripe on its payment intent", async () => {
    const v = await repair(200)
    const [card] = await db
      .insert(s.charge)
      .values({ organizationId: ORG, jobId: v.jobId, visitId: v.id, customerId: "c100", attempt: 1, amount: 200, status: "succeeded", method: "card_now", paidOn: "2027-05-07", stripePaymentIntentId: "pi_card_1" })
      .returning()
    const refund = await callApi(as(), paymentsRefund, { paymentId: card!.id, amount: 80 })
    expect(stripe.calls.refundsCreate).toHaveBeenCalledOnce()
    expect(stripe.calls.refundsCreate.mock.calls[0]![0]).toMatchObject({ payment_intent: "pi_card_1", amount: 8000 })
    expect(refund).toMatchObject({ amount: -80, method: "card_now", refundsPaymentId: card!.id, reference: "re_1" })
    // the rest can still be refunded, and no more than the rest
    await expect(callApi(as(), paymentsRefund, { paymentId: card!.id, amount: 121 })).rejects.toMatchObject({ code: "unprocessable", message: expect.stringMatching(/\$120/) })
    expect(await callApi(as(), paymentsRefund, { paymentId: card!.id })).toMatchObject({ amount: -120 })
    expect(stripe.calls.refundsCreate).toHaveBeenCalledTimes(2)
  })

  it("refuses an amount above what is left, writing nothing", async () => {
    const v = await repair()
    const paid = await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 145, method: "check" })
    await expect(callApi(as(), paymentsRefund, { paymentId: paid.id, amount: 146 })).rejects.toMatchObject({ code: "unprocessable" })
    expect((await callApi(as(readKey), paymentsList, { jobId: v.jobId })).data).toHaveLength(1)
  })

  it("is for admins, and another organization cannot refund it", async () => {
    const v = await repair()
    const paid = await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 145, method: "cash" })
    await expect(callApi(as(writeKey), paymentsRefund, { paymentId: paid.id })).rejects.toMatchObject({ code: "forbidden" })
    await db.insert(s.organization).values({ id: "org-c", name: "Third", termsVersion: "1", settings: { windows: [], bufferPercentEarly: 0, bufferPercentLate: 0, fallTownOrder: [], springTownOrder: [], messages: [] } })
    const other = { ...key("read", "write", "admin"), organizationId: "org-c" }
    await expect(callApi(ctxFor(db, other), paymentsRefund, { paymentId: paid.id })).rejects.toMatchObject({ code: "not_found" })
  })

  it("is what Done's undo asks for: after the refund the visit is still Done", async () => {
    const v = await repair()
    await callApi(as(), visitsMarkClosed, { id: v.id, paidBy: { method: "cash" } })
    const [paid] = await db.select().from(s.charge).where(eq(s.charge.visitId, v.id))
    await callApi(as(), paymentsRefund, { paymentId: paid!.id })
    await expect(callApi(as(), visitsMarkClosed, { id: v.id, undo: true })).rejects.toMatchObject({ code: "unprocessable" })
    expect((await callApi(as(readKey), visitsGet, { id: v.id })).status).toBe("completed")
  })
})

describe("the events a payment writes", () => {
  it("payments.record writes payment.succeeded about the new row, with the visit's name; the legacy charge.* webhook name writes nothing", async () => {
    await db.insert(s.webhookEndpoint).values({ id: "wh-pay", organizationId: ORG, url: "https://hooks.test/p", secret: "shh", events: ["payment.succeeded", "charge.succeeded"] })
    const v = await repair()
    const row = await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 145, method: "venmo" })
    expect(await eventsOf(db, { kind: "payment.succeeded", jobId: v.jobId })).toMatchObject([{ kind: "payment.succeeded", about: "payment", aboutId: row.id, customerId: "c100", visitId: v.id, who: "api", detail: { amount: 145, method: "venmo", name: "Repair" } }])
    expect((await db.select().from(s.outboundEvent)).map((e) => e.event)).toEqual(expect.arrayContaining(["payment.succeeded", "charge.succeeded"]))
    // Refused again: still one event.
    await expect(callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 145, method: "venmo" })).rejects.toMatchObject({ code: "conflict" })
    expect(await eventsOf(db, { kind: "payment.succeeded", jobId: v.jobId })).toHaveLength(1)
  })
  it("a payment on the job as a whole is about the payment with no visit and no name", async () => {
    const v = await repair()
    const row = await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, amount: 100, method: "cash" })
    const [event] = await eventsOf(db, { kind: "payment.succeeded", jobId: v.jobId })
    expect(event).toMatchObject({ aboutId: row.id, visitId: null, detail: { amount: 100, method: "cash" } })
    expect(event!.detail).not.toHaveProperty("name")
  })
  it("a rejected payment (a read key, an unknown job) writes none", async () => {
    const before = (await db.select().from(s.event)).length
    await expect(callApi(as(readKey), paymentsRecord, { jobId: "nope", amount: 5, method: "cash" })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(as(writeKey), paymentsRecord, { jobId: "nope", amount: 5, method: "cash" })).rejects.toMatchObject({ code: "not_found" })
    expect((await db.select().from(s.event)).length).toBe(before)
  })
  it("a card refund writes payment.refunded about the refund row", async () => {
    const v = await repair(200)
    const [card] = await db.insert(s.charge).values({ organizationId: ORG, jobId: v.jobId, visitId: v.id, customerId: "c100", attempt: 1, amount: 200, status: "succeeded", method: "card_now", paidOn: "2027-05-07", stripePaymentIntentId: "pi_ev_1" }).returning()
    const refund = await callApi(as(), paymentsRefund, { paymentId: card!.id, amount: 50 })
    expect(await eventsOf(db, { kind: "payment.refunded", jobId: v.jobId })).toMatchObject([{ about: "payment", aboutId: refund.id, customerId: "c100", visitId: v.id, detail: { amount: 50, method: "card_now", refunds: card!.id } }])
  })
})
