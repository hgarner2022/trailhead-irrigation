// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, eventsOf, linesOfJob, ORG, readKey, writeKey } from "../../test-helpers"
import { visitsGet, visitsMove } from "./handlers"
import { visitsMarkClosed, visitsRecordPayment } from "./money"
import { visitsCreate, visitsMarkNotDone } from "./office"
import { paymentsRecord, paymentsRefund } from "../payments/handlers"
import { newestPayment } from "./queries"
import { invoicesGet, invoicesList } from "../invoices/handlers"
import { stubStripe } from "@/lib/stripe/test-stripe"

const { getStripe } = vi.hoisted(() => ({ getStripe: vi.fn() }))
vi.mock("@/lib/stripe/client", async (original) => ({ ...(await original<typeof import("@/lib/stripe/client")>()), getStripe }))

let stripe: ReturnType<typeof stubStripe>
beforeEach(() => {
  stripe = stubStripe()
  getStripe.mockReturnValue(stripe.stripe)
})

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

describe("Done with Send a bill", () => {
  it("marks the visit done and sends a bill for its lines in place of recording a payment", async () => {
    const v = await callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-05-21", price: 145 })
    const out = await callApi(as(), visitsMarkClosed, { id: v.id, paidBy: { method: "bill" } })
    expect(out).toMatchObject({ status: "completed", paymentStatus: "none", payments: [] })
    expect(await db.select().from(s.charge).where(eq(s.charge.visitId, v.id))).toEqual([])
    const [bill] = (await callApi(as(readKey), invoicesList, { jobId: v.jobId })).data
    expect(bill).toMatchObject({ amount: 145, total: 145, status: "sent", paidOn: null, lines: [{ name: "Repair", unitPrice: 145, visitId: v.id }] })
    const mail = (await db.select().from(s.messageLog)).filter((m) => m.kind === "invoice" && m.key === `invoice-${bill!.id}`)
    expect(mail).toHaveLength(1)
    expect((await db.select().from(s.messageLog)).filter((m) => m.visitId === v.id && m.kind === "receipt")).toEqual([])
    // marking it done again sends nothing more
    await callApi(as(), visitsMarkClosed, { id: v.id, paidBy: { method: "bill" } })
    expect((await callApi(as(readKey), invoicesList, { jobId: v.jobId })).data).toHaveLength(1)
  })

  it("refuses before marking done when the visit has no price or the job already has an open bill, leaving the visit not done", async () => {
    const unpriced = await callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "install", scheduledOn: "2027-05-24" })
    await expect(callApi(as(), visitsMarkClosed, { id: unpriced.id, paidBy: { method: "bill" } })).rejects.toMatchObject({ code: "invalid", message: "Price the visit before sending a bill" })
    expect((await callApi(as(), visitsGet, { id: unpriced.id })).status).toBe("scheduled")
    const v = await callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-05-25", price: 145 })
    const [first] = await db.select().from(s.visit).where(eq(s.visit.id, v.id))
    await db.insert(s.visit).values({ ...first!, id: `${v.id}-b` })
    await db.insert(s.lineItem).values({ organizationId: ORG, jobId: v.jobId, visitId: `${v.id}-b`, name: "Repair", quantity: 1, unitPrice: 95 })
    await callApi(as(), visitsMarkClosed, { id: v.id, paidBy: { method: "bill" } })
    await expect(callApi(as(), visitsMarkClosed, { id: `${v.id}-b`, paidBy: { method: "bill" } })).rejects.toMatchObject({ code: "conflict", message: "A bill is already open for this job" })
    expect((await callApi(as(), visitsGet, { id: `${v.id}-b` })).status).toBe("scheduled")
  })

  it("cancels the unpaid bill when Done is undone, closes its card form and lets the job be billed again; a paid bill blocks the undo", async () => {
    const v = await callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-06-08", price: 145 })
    await callApi(as(), visitsMarkClosed, { id: v.id, paidBy: { method: "bill" } })
    const [bill] = (await callApi(as(readKey), invoicesList, { jobId: v.jobId })).data
    await db.update(s.invoice).set({ stripeCheckoutSessionId: "cs_undo" }).where(eq(s.invoice.id, bill!.id))
    expect(await callApi(as(), visitsMarkClosed, { id: v.id, undo: true })).toMatchObject({ status: "scheduled", completedOn: null })
    expect(await callApi(as(readKey), invoicesGet, { id: bill!.id })).toMatchObject({ status: "cancelled", cancelledAt: expect.any(String) })
    expect(stripe.calls.sessionExpire).toHaveBeenCalledWith("cs_undo")
    expect((await db.select().from(s.invoice).where(eq(s.invoice.id, bill!.id))).length).toBe(1)
    // Done again sends a new bill: the job has no open one
    await callApi(as(), visitsMarkClosed, { id: v.id, paidBy: { method: "bill" } })
    expect((await callApi(as(readKey), invoicesList, { jobId: v.jobId })).data.map((i) => i.status).sort()).toEqual(["cancelled", "sent"])
    // money that arrived blocks the undo and leaves the bill alone
    await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 145, method: "check" })
    await expect(callApi(as(), visitsMarkClosed, { id: v.id, undo: true })).rejects.toMatchObject({ message: "A payment was recorded. Refund it from the job first." })
    expect((await callApi(as(readKey), invoicesList, { jobId: v.jobId })).data.map((i) => i.status).sort()).toEqual(["cancelled", "paid"])
  })

  it("mirrors every refusal of the bill before marking done: already paid and nobody to send it to leave the visit not done", async () => {
    const paid = await callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-06-09", price: 145 })
    await callApi(as(writeKey), paymentsRecord, { jobId: paid.jobId, visitId: paid.id, amount: 145, method: "cash" })
    await expect(callApi(as(), visitsMarkClosed, { id: paid.id, paidBy: { method: "bill" } })).rejects.toMatchObject({ code: "conflict", message: "This job is already paid" })
    expect((await callApi(as(), visitsGet, { id: paid.id })).status).toBe("scheduled")

    const v = await callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-06-10", price: 145 })
    await db.update(s.customer).set({ email: null, phone: null }).where(eq(s.customer.id, "c100"))
    await expect(callApi(as(), visitsMarkClosed, { id: v.id, paidBy: { method: "bill" } })).rejects.toMatchObject({ code: "unprocessable", message: "This customer has no mobile or email to send the bill to." })
    await db.update(s.customer).set({ email: "dana@example.com" }).where(eq(s.customer.id, "c100"))
    const [after] = await db.select().from(s.visit).where(eq(s.visit.id, v.id))
    expect(after).toMatchObject({ status: "scheduled", completedOn: null })
    expect(await db.select().from(s.invoice).where(eq(s.invoice.jobId, v.jobId))).toEqual([])
  })

  it("bills only the done visits' lines while another visit of the job is still ahead", async () => {
    const v = await callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-05-26", price: 145 })
    const [first] = await db.select().from(s.visit).where(eq(s.visit.id, v.id))
    await db.insert(s.visit).values({ ...first!, id: `${v.id}-later` })
    await db.insert(s.lineItem).values({ organizationId: ORG, jobId: v.jobId, visitId: `${v.id}-later`, name: "Fall blowout", quantity: 1, unitPrice: 95 })
    await callApi(as(), visitsMarkClosed, { id: v.id, paidBy: { method: "bill" } })
    const [bill] = (await callApi(as(readKey), invoicesList, { jobId: v.jobId })).data
    expect(bill).toMatchObject({ amount: 145, total: 145 })
    expect(bill!.lines.map((l) => l.name)).toEqual(["Repair"])
    expect((await callApi(as(readKey), invoicesGet, { id: bill!.id })).lines).toHaveLength(1)
  })

  it("is not a way to record a payment: visits.recordPayment refuses a bill", async () => {
    const v = await callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-05-27", price: 145 })
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-05-07" }).where(eq(s.visit.id, v.id))
    await expect(callApi(as(), visitsRecordPayment, { id: v.id, method: "bill" as never })).rejects.toMatchObject({ code: "invalid" })
  })

  it("leaves a pass visit that has a card to the card, whatever was chosen", async () => {
    await callApi(as(writeKey), visitsMove, { id: "p5-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-06" })
    const [visit] = await db.select().from(s.visit).where(eq(s.visit.id, "p5-turn-on"))
    await callApi(as(), visitsMarkClosed, { id: "p5-turn-on", paidBy: { method: "bill" } })
    expect((await callApi(as(readKey), invoicesList, { jobId: visit!.jobId })).data).toEqual([])
    expect((await db.select().from(s.queueItem).where(eq(s.queueItem.key, "p5-turn-on"))).map((q) => q.kind)).toEqual(["pass-charge"])
  })
})

describe("the events Done and the money write", () => {
  const repairOn = (day: string) => callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: day, price: 145 })
  it("Done with a check writes visit.done (with how it was paid) and payment.succeeded about the payment row, once", async () => {
    const v = await repairOn("2027-07-06")
    await callApi(as(), visitsMarkClosed, { id: v.id, paidBy: { method: "check", reference: "1043" } })
    const [row] = await db.select().from(s.charge).where(eq(s.charge.visitId, v.id))
    expect(await eventsOf(db, { kind: "visit.done", visitId: v.id })).toMatchObject([{ about: "visit", aboutId: v.id, customerId: "c100", jobId: v.jobId, who: "api", detail: { name: "Repair", completedOn: "2027-05-07", paidBy: "check" } }])
    expect(await eventsOf(db, { kind: "payment.succeeded", jobId: v.jobId })).toMatchObject([{ about: "payment", aboutId: row!.id, customerId: "c100", visitId: v.id, who: "api", detail: { amount: 145, method: "check", name: "Repair" } }])
    // Closing it again, or recording the same money again, changes nothing.
    await callApi(as(), visitsMarkClosed, { id: v.id })
    await expect(callApi(as(), visitsRecordPayment, { id: v.id, method: "check" })).rejects.toMatchObject({ code: "conflict" })
    expect(await eventsOf(db, { kind: "visit.done", visitId: v.id })).toHaveLength(1)
    expect(await eventsOf(db, { kind: "payment.succeeded", jobId: v.jobId })).toHaveLength(1)
  })
  it("a refused Done writes no event", async () => {
    const v = await repairOn("2027-07-07")
    await expect(callApi(as(), visitsMarkClosed, { id: v.id })).rejects.toMatchObject({ code: "invalid" })
    expect(await eventsOf(db, { visitId: v.id, kind: "visit.done" })).toEqual([])
  })
  it("undoing a Done writes visit.undone", async () => {
    const v = await repairOn("2027-07-08")
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-05-07" }).where(eq(s.visit.id, v.id))
    await callApi(as(), visitsMarkClosed, { id: v.id, undo: true })
    expect(await eventsOf(db, { kind: "visit.undone", visitId: v.id })).toMatchObject([{ about: "visit", aboutId: v.id, customerId: "c100", jobId: v.jobId, detail: { name: "Repair" } }])
  })
  it("a refund writes payment.refunded about the refund row, naming the payment it reverses; a refused refund writes none", async () => {
    const v = await repairOn("2027-07-09")
    await callApi(as(), visitsMarkClosed, { id: v.id, paidBy: { method: "venmo" } })
    const [paid] = await db.select().from(s.charge).where(eq(s.charge.visitId, v.id))
    await callApi(as(), paymentsRefund, { paymentId: paid!.id, amount: 45, reason: "Goodwill" })
    const [refund] = await db.select().from(s.charge).where(eq(s.charge.refundsPaymentId, paid!.id))
    expect(await eventsOf(db, { kind: "payment.refunded", jobId: v.jobId })).toMatchObject([{ about: "payment", aboutId: refund!.id, customerId: "c100", visitId: v.id, who: "api", detail: { amount: 45, method: "venmo", refunds: paid!.id, reason: "Goodwill", name: "Repair" } }])
    await expect(callApi(as(), paymentsRefund, { paymentId: paid!.id, amount: 500 })).rejects.toMatchObject({ code: "unprocessable" })
    expect(await eventsOf(db, { kind: "payment.refunded", jobId: v.jobId })).toHaveLength(1)
  })
  it("money that covers an open bill writes invoice.paid beside payment.succeeded, and undoing Done writes invoice.cancelled for an unpaid bill", async () => {
    const v = await callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-06-14", price: 145 })
    await callApi(as(), visitsMarkClosed, { id: v.id, paidBy: { method: "bill" } })
    const [bill] = await db.select().from(s.invoice).where(eq(s.invoice.jobId, v.jobId))
    expect(await eventsOf(db, { kind: "invoice.sent", jobId: v.jobId })).toMatchObject([{ about: "invoice", aboutId: bill!.id, customerId: "c100", who: "api", detail: { number: bill!.number, total: 145, dueOn: bill!.dueOn } }])
    await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 145, method: "cash" })
    expect(await eventsOf(db, { kind: "invoice.paid", jobId: v.jobId })).toMatchObject([{ about: "invoice", aboutId: bill!.id, customerId: "c100", who: "api", detail: { number: bill!.number, total: 145, how: "cash" } }])

    const w = await callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-06-15", price: 145 })
    await callApi(as(), visitsMarkClosed, { id: w.id, paidBy: { method: "bill" } })
    const [open] = await db.select().from(s.invoice).where(eq(s.invoice.jobId, w.jobId))
    await callApi(as(), visitsMarkClosed, { id: w.id, undo: true })
    expect(await eventsOf(db, { kind: "invoice.cancelled", jobId: w.jobId })).toMatchObject([{ about: "invoice", aboutId: open!.id, customerId: "c100", detail: { number: open!.number, total: 145 } }])
    expect(await eventsOf(db, { kind: "invoice.paid", jobId: w.jobId })).toEqual([])
  })
})
