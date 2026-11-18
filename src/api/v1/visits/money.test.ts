// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, linesOfJob, ORG, readKey, writeKey } from "../../test-helpers"
import { visitsGet, visitsMove } from "./handlers"
import { visitsMarkClosed, visitsRecordPayment } from "./money"
import { visitsCreate, visitsMarkNotDone } from "./office"
import { paymentsRecord, paymentsRefund } from "../payments/handlers"
import { newestPayment } from "./queries"

let db: TestDb
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  await db.update(s.customer).set({ email: "dana@example.com" }).where(eq(s.customer.id, "c100"))
})
afterAll(() => db.close())

const as = (p = adminKey) => ctxFor(db, p, "2027-05-07T20:00:00Z")
const repair = (price = 145) => callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-05-10", price })

describe("Done and the money", () => {
  it("charges a pass visit to its card with no question", async () => {
    await callApi(as(writeKey), visitsMove, { id: "p3-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-05" })
    const out = await callApi(as(), visitsMarkClosed, { id: "p3-turn-on" })
    expect(out).toMatchObject({ status: "completed", paymentStatus: "none" })
    expect((await db.select().from(s.queueItem).where(eq(s.queueItem.key, "p3-turn-on"))).map((q) => q.kind)).toEqual(["pass-charge"])
    expect(await db.select().from(s.charge).where(eq(s.charge.visitId, "p3-turn-on"))).toEqual([])
  })

  it("asks a one-off visit with a price how it was paid, records a check as a succeeded charge and sends the receipt", async () => {
    const v = await repair()
    await expect(callApi(as(), visitsMarkClosed, { id: v.id })).rejects.toMatchObject({ code: "invalid", message: expect.stringMatching(/how it was paid/) })
    const out = await callApi(as(), visitsMarkClosed, { id: v.id, paidBy: { method: "check", reference: "1042" } })
    expect(out).toMatchObject({ status: "completed", paidBy: "check", paymentStatus: "paid" })
    const [charge] = await db.select().from(s.charge).where(eq(s.charge.visitId, v.id))
    expect(charge).toMatchObject({ method: "check", reference: "1042", status: "succeeded", amount: 145, passId: null })
    const receipts = (await db.select().from(s.messageLog)).filter((m) => m.visitId === v.id && m.kind === "receipt")
    expect(receipts).toHaveLength(1)
    expect(receipts[0]!.body).toContain("check")
    expect((await callApi(as(), visitsGet, { id: v.id })).paidBy).toBe("check")
  })

  it("undoes a Done that has no payment, and refuses once a payment row exists, deleting nothing", async () => {
    const none = await repair()
    await callApi(as(), visitsMarkClosed, { id: none.id, paidBy: { method: "cash" } })
    const [row] = await db.select().from(s.charge).where(eq(s.charge.visitId, none.id))
    expect(row).toMatchObject({ jobId: none.jobId, customerId: "c100", paidOn: "2027-05-07", status: "succeeded", method: "cash" })
    await expect(callApi(as(), visitsMarkClosed, { id: none.id, undo: true })).rejects.toMatchObject({ code: "unprocessable", message: "A payment was recorded. Refund it from the job first." })
    expect(await db.select().from(s.charge).where(eq(s.charge.visitId, none.id))).toEqual([row])
    expect(await callApi(as(), visitsGet, { id: none.id })).toMatchObject({ status: "completed", paymentStatus: "paid", payments: [{ id: row!.id, amount: 145, method: "cash" }] })

    const unpaid = await repair()
    // Done with the money still to come (a bill, or an office that has not been paid yet): no payment row, so the undo is allowed.
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-05-07" }).where(eq(s.visit.id, unpaid.id))
    const back = await callApi(as(), visitsMarkClosed, { id: unpaid.id, undo: true })
    expect(back).toMatchObject({ status: "scheduled", paymentStatus: "none", completedOn: null, payments: [] })
    await expect(callApi(as(), visitsMarkClosed, { id: unpaid.id, undo: true })).rejects.toMatchObject({ code: "unprocessable" })
  })

  it("prices the visit's line from a payment handed over when an unpriced install is closed", async () => {
    const v = await callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "install", scheduledOn: "2027-05-12" })
    await callApi(as(), visitsMarkClosed, { id: v.id, paidBy: { method: "cash", amount: 3500 } })
    expect(await linesOfJob(db, v.jobId)).toMatchObject([{ visitId: v.id, unitPrice: 3500 }])
  })

  it("records a payment later on a visit marked done with no price, and prices it", async () => {
    const v = await callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "install", scheduledOn: "2027-05-11" })
    await callApi(as(), visitsMarkClosed, { id: v.id })
    await expect(callApi(as(), visitsRecordPayment, { id: v.id, method: "venmo" })).rejects.toMatchObject({ code: "invalid" })
    const out = await callApi(as(), visitsRecordPayment, { id: v.id, method: "venmo", reference: "@dana", amount: 3200 })
    expect(out).toMatchObject({ amount: 3200, paidBy: "venmo", paymentStatus: "paid" })
    expect((await db.select().from(s.job).where(eq(s.job.id, v.jobId)))[0]!.price).toBe(3200)
    await expect(callApi(as(), visitsRecordPayment, { id: v.id, method: "cash" })).rejects.toMatchObject({ code: "conflict" })
    await expect(callApi(as(), visitsRecordPayment, { id: "p3-turn-on", method: "cash" })).rejects.toMatchObject({ code: "unprocessable" })
  })

  it("reads paidBy and paymentStatus from the newest payment row, and a refund leaves nothing paid", async () => {
    const v = await callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-05-18", price: 145 })
    await callApi(as(), visitsMarkClosed, { id: v.id, paidBy: { method: "venmo" } })
    const [row] = await db.select().from(s.charge).where(eq(s.charge.visitId, v.id))
    expect(await callApi(as(), visitsGet, { id: v.id })).toMatchObject({ paidBy: "venmo", paymentStatus: "paid" })
    await callApi(as(), paymentsRefund, { paymentId: row!.id })
    expect(await callApi(as(), visitsGet, { id: v.id })).toMatchObject({ paidBy: "venmo", paymentStatus: "none" })
  })

  it("names the newest payment: a retry that went through is paid, a failed or pending row is not", () => {
    const row = (method: string, status: string, amount = 145, refunds: string | null = null) => ({ method, status, amount, refunds_payment_id: refunds }) as Parameters<typeof newestPayment>[0][number]
    expect(newestPayment([])).toEqual({ paidBy: null, paymentStatus: "none" })
    expect(newestPayment([row("card_on_file", "failed"), row("card_on_file", "succeeded")])).toEqual({ paidBy: "card_on_file", paymentStatus: "paid" })
    expect(newestPayment([row("card_on_file", "failed")])).toEqual({ paidBy: "card_on_file", paymentStatus: "failed" })
    expect(newestPayment([row("card_on_file", "pending")])).toEqual({ paidBy: "card_on_file", paymentStatus: "pending" })
    expect(newestPayment([row("check", "succeeded"), row("check", "succeeded", -145, "p")])).toEqual({ paidBy: "check", paymentStatus: "none" })
    expect(newestPayment([row("check", "succeeded"), row("check", "succeeded", -45, "p")])).toEqual({ paidBy: "check", paymentStatus: "paid" })
  })

  it("agrees with the money pill: money that arrived is paid even when a newer attempt failed, and part of the price is not paid", () => {
    const row = (method: string, status: string, amount = 145) => ({ method, status, amount, refunds_payment_id: null }) as Parameters<typeof newestPayment>[0][number]
    expect(newestPayment([row("check", "succeeded"), row("card_on_file", "failed")], 145)).toEqual({ paidBy: "card_on_file", paymentStatus: "paid" })
    expect(newestPayment([row("check", "succeeded", 100)], 145)).toEqual({ paidBy: "check", paymentStatus: "none" })
    expect(newestPayment([row("check", "succeeded", 100), row("cash", "succeeded", 45)], 145)).toEqual({ paidBy: "cash", paymentStatus: "paid" })
  })

  it("keeps the check number and the receipt link for a key that may write and leaves them out for a read key", async () => {
    const v = await callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-05-19", price: 145 })
    await callApi(as(), visitsMarkClosed, { id: v.id, paidBy: { method: "check", reference: "1042" } })
    await db.update(s.charge).set({ receiptUrl: "https://pay.test/r/1" }).where(eq(s.charge.visitId, v.id))
    expect((await callApi(as(writeKey), visitsGet, { id: v.id })).payments).toMatchObject([{ reference: "1042", receiptUrl: "https://pay.test/r/1" }])
    expect((await callApi(as(readKey), visitsGet, { id: v.id })).payments).toMatchObject([{ reference: null, receiptUrl: null, method: "check", amount: 145 }])
  })

  it("reads a part-paid visit as not yet paid, takes the rest, and refuses a second payment of the whole", async () => {
    const v = await callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-05-20", price: 145 })
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-05-07" }).where(eq(s.visit.id, v.id))
    await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 100, method: "cash" })
    expect(await callApi(as(), visitsGet, { id: v.id })).toMatchObject({ paymentStatus: "none", paidBy: "cash" })
    // Record payment on a part-paid visit takes what is still owed
    const out = await callApi(as(), visitsRecordPayment, { id: v.id, method: "check" })
    expect(out.payments.map((p) => p.amount)).toEqual([100, 45])
    expect(out.paymentStatus).toBe("paid")
    await expect(callApi(as(), visitsRecordPayment, { id: v.id, method: "check" })).rejects.toMatchObject({ code: "conflict", message: "This visit is already paid" })
    expect(await db.select().from(s.charge).where(eq(s.charge.visitId, v.id))).toHaveLength(2)
  })

  it("keeps the reason a visit was not done until it has a day again", async () => {
    const v = await repair()
    const out = await callApi(as(writeKey), visitsMarkNotDone, { id: v.id, reason: "no-water" })
    expect(out.notDoneReason).toBe("no-water")
    const placed = await callApi(as(writeKey), visitsMove, { id: v.id, personId: "person_truck-1", scheduledOn: "2027-05-12" })
    expect(placed.notDoneReason).toBeNull()
    expect(ORG).toBeTruthy()
  })
})
