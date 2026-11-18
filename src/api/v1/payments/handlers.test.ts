// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { stubStripe } from "@/lib/stripe/test-stripe"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, key, ORG, readKey, writeKey } from "../../test-helpers"
import { customersGet } from "../customers/handlers"
import { visitsCreate } from "../visits/office"
import { visitsGet } from "../visits/handlers"
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
    expect((await callApi(as(readKey), paymentsList, { jobId: v.jobId })).data).toEqual([row])
    expect((await callApi(as(readKey), paymentsList, { customerId: "c100" })).data.map((p) => p.id)).toContain(row.id)
    const out = await callApi(as(readKey), visitsGet, { id: v.id })
    expect(out.payments).toEqual([row])
    const job = (await callApi(as(readKey), customersGet, { id: "c100" })).jobs.find((j) => j.id === v.jobId)!
    expect(job).toMatchObject({ payments: [row], money: { paid: 145, total: 145, owed: 0, words: "Paid" } })
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
