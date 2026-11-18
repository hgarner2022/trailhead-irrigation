// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, eventsOf, readKey, writeKey } from "../../test-helpers"
import { visitsMarkClosed } from "../visits/money"
import { visitsCreate } from "../visits/office"
import { paymentsChargeCard } from "./charge"
import { paymentsRecord, paymentsRefund } from "./handlers"
import { declined, stubStripe } from "@/lib/stripe/test-stripe"

const { getStripe } = vi.hoisted(() => ({ getStripe: vi.fn() }))
vi.mock("@/lib/stripe/client", async (original) => ({ ...(await original<typeof import("@/lib/stripe/client")>()), getStripe }))

let stripe: ReturnType<typeof stubStripe>
let db: TestDb
beforeEach(() => {
  stripe = stubStripe()
  getStripe.mockReturnValue(stripe.stripe)
})
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  await db.update(s.customer).set({ email: "dana@example.com", stripeCustomerId: "cus_dana", stripePaymentMethodId: "pm_dana", cardBrand: "visa", cardLast4: "4242", cardExpires: "2030-08" }).where(eq(s.customer.id, "c100"))
})
afterAll(() => db.close())

const as = (p = adminKey) => ctxFor(db, p, "2027-05-07T20:00:00Z")
// Every visit gets a day of its own (a person is full of repairs after a few on one day), weekdays only.
const DAYS = ["10", "11", "12", "13", "14", "17", "18", "19", "20", "21", "24", "25", "26", "27", "28"].map((d) => `2027-05-${d}`)
let nextDay = 0
const day = () => DAYS[nextDay++]!
const doneRepair = async (price = 145) => {
  const v = await callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: day(), price })
  await callApi(as(), visitsMarkClosed, { id: v.id })
  return v
}
const rows = (visitId: string) => db.select().from(s.charge).where(eq(s.charge.visitId, visitId))

describe("Mark done charges nothing", () => {
  it("writes the done fact and no payment row, no invoice, no message, no queued charge, no Stripe call, for a card customer", async () => {
    const v = await callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: day(), price: 145 })
    const before = (await db.select().from(s.messageLog)).length
    const out = await callApi(as(), visitsMarkClosed, { id: v.id })
    expect(out).toMatchObject({ status: "completed", paymentStatus: "none", payments: [] })
    expect(await rows(v.id)).toEqual([])
    expect((await db.select().from(s.messageLog)).length).toBe(before)
    expect(await db.select().from(s.queueItem).where(eq(s.queueItem.key, v.id))).toEqual([])
    expect(await db.select().from(s.invoice).where(eq(s.invoice.jobId, v.jobId))).toEqual([])
    expect(stripe.calls.paymentIntentsCreate).not.toHaveBeenCalled()
  })

  it("is the same for a Season Pass visit whose customer has a card: nothing is queued to charge it", async () => {
    await callApi(as(writeKey), (await import("../visits/handlers")).visitsMove, { id: "p3-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-05" })
    await callApi(as(), visitsMarkClosed, { id: "p3-turn-on" })
    expect(await db.select().from(s.queueItem).where(eq(s.queueItem.key, "p3-turn-on"))).toEqual([])
    expect(await rows("p3-turn-on")).toEqual([])
  })
})

describe("payments.chargeCard", () => {
  it("charges the card on file for a one-off when the button is pressed: one succeeded row, one receipt, Paid, card", async () => {
    const v = await doneRepair()
    const row = await callApi(as(), paymentsChargeCard, { visitId: v.id })
    expect(row).toMatchObject({ status: "succeeded", amount: 145, method: "card_on_file", visitId: v.id, jobId: v.jobId })
    expect(await rows(v.id)).toHaveLength(1)
    expect(stripe.calls.paymentIntentsCreate).toHaveBeenCalledTimes(1)
    expect(stripe.calls.paymentIntentsCreate.mock.calls[0]![0]).toMatchObject({ amount: 14500, customer: "cus_dana", payment_method: "pm_dana", description: "Repair" })
    const receipts = (await db.select().from(s.messageLog)).filter((m) => m.visitId === v.id && m.kind === "receipt")
    expect(receipts).toHaveLength(1)
    expect(receipts[0]!.body).toContain("Paid: $145, Visa ending 4242")
  })

  it("refuses a visit that is not done, a second press once paid, and a visit paid by check, writing nothing", async () => {
    const open = await callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: day(), price: 145 })
    await expect(callApi(as(), paymentsChargeCard, { visitId: open.id })).rejects.toMatchObject({ code: "unprocessable", message: "Mark the visit done first" })
    const v = await doneRepair()
    await callApi(as(), paymentsChargeCard, { visitId: v.id })
    await expect(callApi(as(), paymentsChargeCard, { visitId: v.id })).rejects.toMatchObject({ code: "conflict", message: "This visit is already paid" })
    const w = await doneRepair()
    await callApi(as(writeKey), paymentsRecord, { jobId: w.jobId, visitId: w.id, amount: 145, method: "check" })
    await expect(callApi(as(), paymentsChargeCard, { visitId: w.id })).rejects.toMatchObject({ code: "conflict", message: "This visit is already paid" })
    expect(stripe.calls.paymentIntentsCreate).toHaveBeenCalledTimes(1)
    expect(await rows(w.id)).toHaveLength(1)
  })

  it("refuses a customer with no card Stripe holds and a charge that is still going through", async () => {
    const v = await doneRepair()
    await db.update(s.customer).set({ stripePaymentMethodId: null }).where(eq(s.customer.id, "c100"))
    await expect(callApi(as(), paymentsChargeCard, { visitId: v.id })).rejects.toMatchObject({ code: "unprocessable", message: "This customer has no card on file. Choose another way." })
    await db.update(s.customer).set({ stripePaymentMethodId: "pm_dana" }).where(eq(s.customer.id, "c100"))
    await db.insert(s.charge).values({ organizationId: (await db.select().from(s.visit).where(eq(s.visit.id, v.id)))[0]!.organizationId, jobId: v.jobId, visitId: v.id, customerId: "c100", attempt: 1, amount: 145, status: "pending", method: "card_on_file", paidOn: "2027-05-07" })
    await expect(callApi(as(), paymentsChargeCard, { visitId: v.id })).rejects.toMatchObject({ code: "conflict", message: expect.stringMatching(/still going through/) })
    expect(stripe.calls.paymentIntentsCreate).not.toHaveBeenCalled()
  })

  it("needs the admin scope: a key that may only write or read cannot charge a card", async () => {
    const v = await doneRepair()
    await expect(callApi(as(writeKey), paymentsChargeCard, { visitId: v.id })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(as(readKey), paymentsChargeCard, { visitId: v.id })).rejects.toMatchObject({ code: "forbidden" })
    expect(await rows(v.id)).toEqual([])
  })

  it("a decline writes one failed row, emails the card link at once, queues one retry three days on, and a second press waits for the card", async () => {
    const v = await doneRepair()
    stripe = stubStripe({ charge: () => Promise.reject(declined()) })
    getStripe.mockReturnValue(stripe.stripe)
    const row = await callApi(as(), paymentsChargeCard, { visitId: v.id })
    expect(row).toMatchObject({ status: "failed", amount: 145, method: "card_on_file" })
    expect(await rows(v.id)).toHaveLength(1)
    const mail = (await db.select().from(s.messageLog)).filter((m) => m.visitId === v.id && m.kind !== "date-set")
    expect(mail.map((m) => m.kind)).toEqual(["card-failed"])
    const [retry] = await db.select().from(s.queueItem).where(eq(s.queueItem.key, `${v.id}:retry`))
    expect(retry).toMatchObject({ kind: "pass-charge", status: "pending", payload: { visitId: v.id, retry: true } })
    expect(retry!.runAfter.toISOString()).toBe("2027-05-10T20:00:00.000Z")
    await expect(callApi(as(), paymentsChargeCard, { visitId: v.id })).rejects.toMatchObject({ code: "conflict", message: "The card didn't go through. Choose another way." })
    expect(await rows(v.id)).toHaveLength(1)
    expect(await eventsOf(db, { kind: "payment.failed", visitId: v.id })).toHaveLength(1)
  })

  it("after a decline the visit can still be paid another way, and a check recorded then stops the retry from charging", async () => {
    const v = await doneRepair()
    stripe = stubStripe({ charge: () => Promise.reject(declined()) })
    getStripe.mockReturnValue(stripe.stripe)
    await callApi(as(), paymentsChargeCard, { visitId: v.id })
    await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 145, method: "venmo" })
    const { chargeVisit } = await import("@/lib/pass/server/charge-visit")
    expect(await chargeVisit(db, stripe.stripe, v.id, { origin: "https://site.test", retry: true, now: new Date("2027-05-10T20:00:00Z") })).toBe("already-charged")
    expect(await rows(v.id)).toHaveLength(2)
  })

  it("the day-3 retry charges once more; a second failure queues no third try, and the retry is capped", async () => {
    const v = await doneRepair()
    const down = stubStripe({ charge: () => Promise.reject(declined()) })
    getStripe.mockReturnValue(down.stripe)
    await callApi(as(), paymentsChargeCard, { visitId: v.id })
    const { chargeVisit } = await import("@/lib/pass/server/charge-visit")
    const later = new Date("2027-05-10T20:00:00Z")
    expect(await chargeVisit(db, down.stripe, v.id, { origin: "https://site.test", retry: true, now: later })).toBe("failed")
    expect(await db.select().from(s.queueItem).where(eq(s.queueItem.key, `${v.id}:retry`))).toHaveLength(1)
    expect((await rows(v.id)).map((r) => [r.attempt, r.status])).toEqual([[1, "failed"], [2, "failed"]])
    expect((await db.select().from(s.messageLog)).filter((m) => m.visitId === v.id && m.kind === "card-failed")).toHaveLength(2)
    // a card update's retry is attempt 3 and works; nothing after the cap retries on its own
    const ok = stubStripe()
    expect(await chargeVisit(db, ok.stripe, v.id, { origin: "https://site.test", afterCardUpdate: true, now: later })).toBe("charged")
  })
})

describe("a refund is the correction", () => {
  it("reverses a recorded check with a refund row and nothing is deleted; the visit reads unpaid again", async () => {
    const v = await doneRepair()
    const paid = await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 145, method: "check", reference: "1042" })
    const refund = await callApi(as(), paymentsRefund, { paymentId: paid.id })
    expect(refund).toMatchObject({ amount: -145, method: "check", refundsPaymentId: paid.id, status: "succeeded" })
    expect((await rows(v.id)).map((r) => r.amount)).toEqual([145, -145])
    expect(stripe.calls.refundsCreate).not.toHaveBeenCalled()
  })
})
