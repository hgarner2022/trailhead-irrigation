// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { verifyToken } from "@/lib/messaging/tokens"
import { stubStripe } from "@/lib/stripe/test-stripe"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, eventsOf as storyOf, key, ORG, readKey, writeKey } from "../../test-helpers"
import { paymentsRecord, paymentsRefund } from "../payments/handlers"
import { visitsCreate } from "../visits/office"
import { invoicesCancel, invoicesGet, invoicesList, invoicesPayView, invoicesRemind, invoicesSend } from "./handlers"

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
  await db.insert(s.webhookEndpoint).values({ id: "wh1", organizationId: ORG, url: "https://hooks.test/x", secret: "shh", events: ["invoice.sent", "invoice.reminded"] })
})
afterAll(() => db.close())

const as = (p = adminKey, now = "2027-05-07T20:00:00Z") => ctxFor(db, p, now)
let n = 0
const nextDay = () => new Date(Date.UTC(2027, 5, 1 + n++ + Math.floor(n / 5) * 2)).toISOString().slice(0, 10)
const repair = (price = 145) => callApi(as(writeKey), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: nextDay(), price })
/** A repair that is done and owes its price: no payment row. */
const doneAndOwed = async (price = 145) => {
  const v = await repair(price)
  await db.update(s.visit).set({ status: "completed", completedOn: "2027-05-07" }).where(eq(s.visit.id, v.id))
  return v
}
const messagesOf = async (kind: string) => (await db.select().from(s.messageLog)).filter((m) => m.kind === kind)
const eventsOf = async (event: string) => (await db.select().from(s.outboundEvent)).filter((e) => e.event === event)

describe("invoices.send", () => {
  it("freezes the lines, adds no tax, is due in 14 days, queues one message with the pay link and emits invoice.sent", async () => {
    const v = await doneAndOwed()
    const out = await callApi(as(writeKey), invoicesSend, { jobId: v.jobId })
    expect(out).toMatchObject({ jobId: v.jobId, customerId: "c100", amount: 145, tax: 0, total: 145, sentOn: "2027-05-07", dueOn: "2027-05-21", paidOn: null, paymentId: null, cancelledAt: null, status: "sent" })
    expect(out.number).toMatch(/^INV-2027-\d{4}$/)
    expect(out.lines).toMatchObject([{ name: "Repair", quantity: 1, unitPrice: 145, taxable: false, visitId: v.id }])
    expect(out.payUrl).toMatch(/^https:\/\/site\.test\/pay\//)
    expect(verifyToken("invoice-pay", out.id, new URL(out.payUrl!).searchParams.get("token"))).toBe(true)
    const [msg, ...rest] = (await messagesOf("invoice")).filter((m) => m.key === `invoice-${out.id}`)
    expect(rest).toEqual([])
    expect(msg).toMatchObject({ channel: "email", to: "dana@example.com", status: "queued" })
    expect(msg!.subject).toMatch(/^Your Trailhead invoice for the repair at .+: \$145$/)
    expect(msg!.body).toContain(out.payUrl)
    expect((await eventsOf("invoice.sent")).some((e) => (e.payload as { invoiceId: string }).invoiceId === out.id)).toBe(true)
    expect((await callApi(as(readKey), invoicesGet, { id: out.id })).payUrl).toBeUndefined()
  })

  it("texts the pay link when the customer has a mobile", async () => {
    // Booking the repair texts the day (the number's first text, which carries the opt-out line), so the invoice text after it does not.
    await db.update(s.customer).set({ phone: "+17205550177" }).where(eq(s.customer.id, "c100"))
    const v = await doneAndOwed()
    const out = await callApi(as(writeKey), invoicesSend, { jobId: v.jobId })
    const msg = (await messagesOf("invoice")).find((m) => m.key === `invoice-${out.id}`)!
    expect(msg).toMatchObject({ channel: "sms", to: "+17205550177" })
    expect(msg.body).toBe(`Trailhead: your invoice for the repair is $145, due May 21. Pay here: ${out.payUrl}`)
    const first = (await messagesOf("date-set")).find((m) => m.to === "+17205550177")!
    expect(first.body).toMatch(/Reply STOP to opt out\.$/)
    await db.update(s.customer).set({ phone: null }).where(eq(s.customer.id, "c100"))
  })

  it("refuses a job that is not done, a job already paid, a second bill while one is open, and an unpriced job", async () => {
    const ahead = await repair()
    await expect(callApi(as(writeKey), invoicesSend, { jobId: ahead.jobId })).rejects.toMatchObject({ code: "unprocessable", message: "Mark the job done before sending an invoice" })
    const paid = await doneAndOwed()
    await callApi(as(writeKey), paymentsRecord, { jobId: paid.jobId, visitId: paid.id, amount: 145, method: "cash" })
    await expect(callApi(as(writeKey), invoicesSend, { jobId: paid.jobId })).rejects.toMatchObject({ code: "conflict", message: "This job is already paid" })
    const open = await doneAndOwed()
    await callApi(as(writeKey), invoicesSend, { jobId: open.jobId })
    await expect(callApi(as(writeKey), invoicesSend, { jobId: open.jobId })).rejects.toMatchObject({ code: "conflict", message: "An invoice is already open for this job" })
    await expect(callApi(as(writeKey), invoicesSend, { jobId: "nope" })).rejects.toMatchObject({ code: "not_found" })
    await expect(callApi(as(readKey), invoicesSend, { jobId: open.jobId })).rejects.toMatchObject({ code: "forbidden" })
  })

  it("refuses a job with another visit still ahead (the invoice for a partly done job is Done with Send an invoice)", async () => {
    const v = await doneAndOwed()
    const [first] = await db.select().from(s.visit).where(eq(s.visit.id, v.id))
    await db.insert(s.visit).values({ ...first!, id: `${v.id}-b`, status: "scheduled", completedOn: null })
    await expect(callApi(as(writeKey), invoicesSend, { jobId: v.jobId })).rejects.toMatchObject({ code: "unprocessable", message: "Mark the job done before sending an invoice" })
  })

  it("counts the number up from the organization's highest, starts a year at 0001 and never reuses a number", async () => {
    const a = await doneAndOwed()
    const b = await doneAndOwed()
    const first = await callApi(as(writeKey), invoicesSend, { jobId: a.jobId })
    const second = await callApi(as(writeKey), invoicesSend, { jobId: b.jobId })
    expect(Number(second.number.slice(-4))).toBe(Number(first.number.slice(-4)) + 1)
    const c = await doneAndOwed()
    expect((await callApi(as(writeKey, "2028-01-05T20:00:00Z"), invoicesSend, { jobId: c.jobId })).number).toBe("INV-2028-0001")
    // a canceled invoice keeps its number: the next invoice takes the next one
    await callApi(as(), invoicesCancel, { id: first.id })
    const again = await callApi(as(writeKey), invoicesSend, { jobId: a.jobId })
    expect(Number(again.number.slice(-4))).toBe(Number(second.number.slice(-4)) + 1)
  })

  it("loses the race on the number once and takes the next one", async () => {
    const a = await doneAndOwed()
    const b = await doneAndOwed()
    const [x, y] = await Promise.allSettled([callApi(as(writeKey), invoicesSend, { jobId: a.jobId }), callApi(as(writeKey), invoicesSend, { jobId: b.jobId })])
    expect([x.status, y.status]).toEqual(["fulfilled", "fulfilled"])
    const numbers = (await db.select().from(s.invoice).where(eq(s.invoice.organizationId, ORG))).map((r) => r.number)
    expect(new Set(numbers).size).toBe(numbers.length)
  })

  it("adds no sales tax while it is off and the right amount, rounded to the dollar, when it is on", async () => {
    const [org] = await db.select().from(s.organization).where(eq(s.organization.id, ORG))
    const off = await doneAndOwed()
    await db.update(s.lineItem).set({ taxable: true }).where(eq(s.lineItem.jobId, off.jobId))
    expect(await callApi(as(writeKey), invoicesSend, { jobId: off.jobId })).toMatchObject({ amount: 145, tax: 0, total: 145 })
    await db.update(s.organization).set({ settings: { ...org!.settings, billing: { dueDays: 30, collectsSalesTax: true, salesTaxPercent: 8.8 } } }).where(eq(s.organization.id, ORG))
    const on = await doneAndOwed()
    await db.update(s.lineItem).set({ taxable: true }).where(eq(s.lineItem.jobId, on.jobId))
    const taxed = await callApi(as(writeKey), invoicesSend, { jobId: on.jobId })
    expect(taxed).toMatchObject({ amount: 145, tax: 13, total: 158, dueOn: "2027-06-06" })
    const untaxed = await doneAndOwed()
    expect(await callApi(as(writeKey), invoicesSend, { jobId: untaxed.jobId })).toMatchObject({ tax: 0, total: 145 })
    const email = (await messagesOf("invoice")).find((m) => m.key === `invoice-${taxed.id}`)!
    expect(email.body).toContain("Tax: $13")
    await db.update(s.organization).set({ settings: org!.settings }).where(eq(s.organization.id, ORG))
  })

  it("keeps the frozen lines when the job's price changes afterwards", async () => {
    const v = await doneAndOwed()
    const out = await callApi(as(writeKey), invoicesSend, { jobId: v.jobId })
    await db.update(s.lineItem).set({ unitPrice: 999, name: "Changed" }).where(eq(s.lineItem.jobId, v.jobId))
    const back = await callApi(as(writeKey), invoicesGet, { id: out.id })
    expect(back.lines).toMatchObject([{ name: "Repair", unitPrice: 145 }])
    expect(back.total).toBe(145)
  })

  it("takes money already paid on the job as a whole off the invoice", async () => {
    const v = await doneAndOwed(200)
    await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, amount: 50, method: "check" })
    const out = await callApi(as(writeKey), invoicesSend, { jobId: v.jobId })
    expect(out).toMatchObject({ amount: 150, total: 150 })
    expect(out.lines.map((l) => [l.name, l.unitPrice])).toEqual([["Repair", 200], ["Payments received", -50]])
  })
})

describe("invoices.send, what it checks before it writes", () => {
  it("refuses a customer with no mobile and no email, and writes no invoice", async () => {
    const v = await doneAndOwed()
    await db.update(s.customer).set({ email: null, phone: null }).where(eq(s.customer.id, "c100"))
    await expect(callApi(as(writeKey), invoicesSend, { jobId: v.jobId })).rejects.toMatchObject({ code: "unprocessable", message: "This customer has no mobile or email to send the invoice to." })
    expect(await db.select().from(s.invoice).where(eq(s.invoice.jobId, v.jobId))).toEqual([])
    // texts stopped and no email is also nobody to reach
    await db.update(s.customer).set({ phone: "+17205550100" }).where(eq(s.customer.id, "c100"))
    await db.insert(s.consent).values({ id: "stop-1", organizationId: ORG, customerId: "c100", source: "reply", note: "STOP", marketingOptIn: false, marketingChannels: [], recordedAt: new Date("2027-05-01T00:00:00Z") })
    await expect(callApi(as(writeKey), invoicesSend, { jobId: v.jobId })).rejects.toMatchObject({ message: "This customer has no mobile or email to send the invoice to." })
    expect(await db.select().from(s.invoice).where(eq(s.invoice.jobId, v.jobId))).toEqual([])
    await db.delete(s.consent).where(eq(s.consent.id, "stop-1"))
    await db.update(s.customer).set({ email: "dana@example.com", phone: null }).where(eq(s.customer.id, "c100"))
  })

  it("refuses with the site address missing before any invoice is written", async () => {
    const v = await doneAndOwed()
    vi.stubEnv("APP_URL", "")
    await expect(callApi(as(writeKey), invoicesSend, { jobId: v.jobId })).rejects.toThrow(/APP_URL is not set/)
    vi.stubEnv("APP_URL", "https://site.test")
    expect(await db.select().from(s.invoice).where(eq(s.invoice.jobId, v.jobId))).toEqual([])
    expect(await callApi(as(writeKey), invoicesSend, { jobId: v.jobId })).toMatchObject({ jobId: v.jobId })
  })

  it("bills a visit again after its paid invoice was refunded in full", async () => {
    const v = await doneAndOwed()
    const first = await callApi(as(writeKey), invoicesSend, { jobId: v.jobId })
    // the invoice is paid on the pay page (a payment on the job as a whole), then refunded in full
    const [pay] = await db.insert(s.charge).values({ organizationId: ORG, jobId: v.jobId, customerId: "c100", attempt: 1, amount: 145, method: "card_now", status: "succeeded", stripePaymentIntentId: `pi_${first.id}`, paidOn: "2027-05-07" }).returning()
    await db.update(s.invoice).set({ paidOn: "2027-05-07", paymentId: pay!.id }).where(eq(s.invoice.id, first.id))
    await callApi(as(), paymentsRefund, { paymentId: pay!.id })
    const again = await callApi(as(writeKey), invoicesSend, { jobId: v.jobId })
    expect(again).toMatchObject({ amount: 145, total: 145, status: "sent" })
    expect(again.lines).toMatchObject([{ name: "Repair", unitPrice: 145, visitId: v.id }])
  })
})

describe("invoices.payView", () => {
  it("gives the card receipt only to the visitor of the signed link, never to a key", async () => {
    const v = await doneAndOwed()
    const bill = await callApi(as(writeKey), invoicesSend, { jobId: v.jobId })
    const [pay] = await db.insert(s.charge).values({ organizationId: ORG, jobId: v.jobId, customerId: "c100", attempt: 1, amount: 145, method: "card_now", status: "succeeded", receiptUrl: "https://pay.stripe.test/receipt/r1", paidOn: "2027-05-07" }).returning()
    await db.update(s.invoice).set({ paidOn: "2027-05-07", paymentId: pay!.id }).where(eq(s.invoice.id, bill.id))
    expect((await callApi(as(readKey), invoicesPayView, { id: bill.id })).receiptUrl).toBeNull()
    expect((await callApi(as(), invoicesPayView, { id: bill.id })).receiptUrl).toBeNull()
    const visitor = ctxFor(db, { kind: "public", id: "checkout", organizationId: ORG, scopes: ["checkout"], invoiceId: bill.id }, "2027-05-07T20:00:00Z")
    expect((await callApi(visitor, invoicesPayView, { id: bill.id })).receiptUrl).toBe("https://pay.stripe.test/receipt/r1")
  })
})

describe("an invoice and money that arrives another way", () => {
  it("is settled by an office payment that covers the job: paid on the day, with that payment, and its card form closed", async () => {
    const v = await doneAndOwed()
    const bill = await callApi(as(writeKey), invoicesSend, { jobId: v.jobId })
    await db.update(s.invoice).set({ stripeCheckoutSessionId: "cs_open" }).where(eq(s.invoice.id, bill.id))
    const row = await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 145, method: "check", reference: "1042" })
    expect(await callApi(as(writeKey), invoicesGet, { id: bill.id })).toMatchObject({ status: "paid", paidOn: "2027-05-07", paymentId: row.id })
    expect(stripe.calls.sessionExpire).toHaveBeenCalledWith("cs_open")
    await expect(callApi(as(writeKey), invoicesRemind, { id: bill.id })).rejects.toMatchObject({ code: "conflict", message: "This invoice is already paid" })
    expect((await callApi(as(readKey), invoicesList, { status: "overdue" })).data.map((i) => i.id)).not.toContain(bill.id)
  })

  it("is left open by a part payment, and the pay page then refuses the old amount", async () => {
    const v = await doneAndOwed(200)
    const bill = await callApi(as(writeKey), invoicesSend, { jobId: v.jobId })
    await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 50, method: "cash" })
    expect(await callApi(as(writeKey), invoicesGet, { id: bill.id })).toMatchObject({ status: "sent", paidOn: null })
    const { startBillPayment } = await import("@/lib/stripe/invoice-checkout")
    const { signToken } = await import("@/lib/messaging/tokens")
    expect(await startBillPayment(db, stripe.stripe, { invoiceId: bill.id, token: signToken("invoice-pay", bill.id), origin: "https://site.test" })).toEqual({ ok: false, message: "Part of this invoice was paid another way. Please call us for the new amount." })
    expect(stripe.calls.sessionCreate).not.toHaveBeenCalled()
  })

  it("stays cancelled when money arrives later", async () => {
    const v = await doneAndOwed()
    const bill = await callApi(as(writeKey), invoicesSend, { jobId: v.jobId })
    await callApi(as(), invoicesCancel, { id: bill.id })
    await callApi(as(writeKey), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 145, method: "cash" })
    expect(await callApi(as(writeKey), invoicesGet, { id: bill.id })).toMatchObject({ status: "cancelled", paidOn: null })
  })
})

describe("invoices.remind", () => {
  it("sends one reminder a day however many times it is pressed, and a new one the next day", async () => {
    const v = await doneAndOwed()
    const bill = await callApi(as(writeKey), invoicesSend, { jobId: v.jobId })
    await callApi(as(writeKey), invoicesRemind, { id: bill.id })
    await callApi(as(writeKey), invoicesRemind, { id: bill.id })
    const today = (await messagesOf("invoice-reminder")).filter((m) => m.key === `invoice-${bill.id}-2027-05-07`)
    expect(today).toHaveLength(1)
    expect(today[0]!.subject).toBe("Your Trailhead invoice, $145, is still unpaid")
    expect((await eventsOf("invoice.reminded")).filter((e) => (e.payload as { invoiceId: string }).invoiceId === bill.id)).toHaveLength(1)
    await callApi(as(writeKey, "2027-05-08T20:00:00Z"), invoicesRemind, { id: bill.id })
    expect((await messagesOf("invoice-reminder")).filter((m) => m.key.startsWith(`invoice-${bill.id}-`))).toHaveLength(2)
  })

  it("refuses a paid or canceled invoice, a read key and another organization's bill", async () => {
    const v = await doneAndOwed()
    const bill = await callApi(as(writeKey), invoicesSend, { jobId: v.jobId })
    await expect(callApi(as(readKey), invoicesRemind, { id: bill.id })).rejects.toMatchObject({ code: "forbidden" })
    await db.insert(s.organization).values({ id: "org-r", name: "Other", termsVersion: "1", settings: { windows: [], bufferPercentEarly: 0, bufferPercentLate: 0, fallTownOrder: [], springTownOrder: [], messages: [] } })
    const other = { ...key("read", "write", "admin"), organizationId: "org-r" }
    await expect(callApi(ctxFor(db, other), invoicesRemind, { id: bill.id })).rejects.toMatchObject({ code: "not_found" })
    await db.update(s.invoice).set({ paidOn: "2027-05-08" }).where(eq(s.invoice.id, bill.id))
    await expect(callApi(as(writeKey), invoicesRemind, { id: bill.id })).rejects.toMatchObject({ code: "conflict", message: "This invoice is already paid" })
    const w = await doneAndOwed()
    const second = await callApi(as(writeKey), invoicesSend, { jobId: w.jobId })
    await callApi(as(), invoicesCancel, { id: second.id })
    await expect(callApi(as(writeKey), invoicesRemind, { id: second.id })).rejects.toMatchObject({ code: "conflict", message: "This invoice was voided" })
  })

  it("says so when the customer has no mobile or email", async () => {
    const v = await doneAndOwed()
    const bill = await callApi(as(writeKey), invoicesSend, { jobId: v.jobId })
    await db.update(s.customer).set({ email: null }).where(eq(s.customer.id, "c100"))
    await expect(callApi(as(writeKey), invoicesRemind, { id: bill.id })).rejects.toMatchObject({ code: "unprocessable", message: expect.stringMatching(/no mobile or email/) })
    await db.update(s.customer).set({ email: "dana@example.com" }).where(eq(s.customer.id, "c100"))
  })
})

describe("invoices.cancel, list and get", () => {
  it("cancels an unpaid invoice (admin only), lets the job be billed again and refuses a paid one", async () => {
    const v = await doneAndOwed()
    const bill = await callApi(as(writeKey), invoicesSend, { jobId: v.jobId })
    await expect(callApi(as(writeKey), invoicesCancel, { id: bill.id })).rejects.toMatchObject({ code: "forbidden" })
    expect(await callApi(as(), invoicesCancel, { id: bill.id })).toMatchObject({ status: "cancelled", cancelledAt: expect.any(String) })
    expect(await callApi(as(), invoicesCancel, { id: bill.id })).toMatchObject({ status: "cancelled" })
    expect((await db.select().from(s.invoice).where(eq(s.invoice.id, bill.id))).length).toBe(1)
    const again = await callApi(as(writeKey), invoicesSend, { jobId: v.jobId })
    await db.update(s.invoice).set({ paidOn: "2027-05-09" }).where(eq(s.invoice.id, again.id))
    await expect(callApi(as(), invoicesCancel, { id: again.id })).rejects.toMatchObject({ code: "conflict" })
    await expect(callApi(as(), invoicesCancel, { id: "nope" })).rejects.toMatchObject({ code: "not_found" })
  })

  it("closes the invoice's open card form on Stripe when it cancels, and still cancels when Stripe fails", async () => {
    const v = await doneAndOwed()
    const bill = await callApi(as(writeKey), invoicesSend, { jobId: v.jobId })
    await db.update(s.invoice).set({ stripeCheckoutSessionId: "cs_cancel" }).where(eq(s.invoice.id, bill.id))
    await callApi(as(), invoicesCancel, { id: bill.id })
    expect(stripe.calls.sessionExpire).toHaveBeenCalledWith("cs_cancel")
    const w = await doneAndOwed()
    const second = await callApi(as(writeKey), invoicesSend, { jobId: w.jobId })
    await db.update(s.invoice).set({ stripeCheckoutSessionId: "cs_broken" }).where(eq(s.invoice.id, second.id))
    stripe.calls.sessionExpire.mockRejectedValueOnce(new Error("session already expired"))
    expect(await callApi(as(), invoicesCancel, { id: second.id })).toMatchObject({ status: "cancelled" })
    // an invoice that never opened a card form calls nothing
    const x = await doneAndOwed()
    const third = await callApi(as(writeKey), invoicesSend, { jobId: x.jobId })
    stripe.calls.sessionExpire.mockClear()
    await callApi(as(), invoicesCancel, { id: third.id })
    expect(stripe.calls.sessionExpire).not.toHaveBeenCalled()
  })

  it("lists by job, by customer and by overdue, and needs one filter", async () => {
    const v = await doneAndOwed()
    const bill = await callApi(as(writeKey), invoicesSend, { jobId: v.jobId })
    expect((await callApi(as(readKey), invoicesList, { jobId: v.jobId })).data.map((i) => i.id)).toEqual([bill.id])
    expect((await callApi(as(readKey), invoicesList, { customerId: "c100" })).data.map((i) => i.id)).toContain(bill.id)
    expect((await callApi(as(readKey), invoicesList, { status: "overdue" })).data.map((i) => i.id)).not.toContain(bill.id)
    const late = as(readKey, "2027-06-01T20:00:00Z")
    const overdue = (await callApi(late, invoicesList, { status: "overdue" })).data
    expect(overdue.map((i) => i.id)).toContain(bill.id)
    expect(overdue.every((i) => i.status === "overdue")).toBe(true)
    await db.update(s.invoice).set({ paidOn: "2027-05-30" }).where(eq(s.invoice.id, bill.id))
    expect((await callApi(late, invoicesList, { status: "overdue" })).data.map((i) => i.id)).not.toContain(bill.id)
    expect((await callApi(late, invoicesList, { jobId: v.jobId, status: "paid" })).data).toHaveLength(1)
    await expect(callApi(as(readKey), invoicesList, {})).rejects.toMatchObject({ code: "invalid" })
  })

  it("keeps one organization's bills from another's", async () => {
    const v = await doneAndOwed()
    const bill = await callApi(as(writeKey), invoicesSend, { jobId: v.jobId })
    await db.insert(s.organization).values({ id: "org-l", name: "Third", termsVersion: "1", settings: { windows: [], bufferPercentEarly: 0, bufferPercentLate: 0, fallTownOrder: [], springTownOrder: [], messages: [] } })
    const other = { ...key("read", "write", "admin"), organizationId: "org-l" }
    await expect(callApi(ctxFor(db, other), invoicesGet, { id: bill.id })).rejects.toMatchObject({ code: "not_found" })
    await expect(callApi(ctxFor(db, other), invoicesSend, { jobId: v.jobId })).rejects.toMatchObject({ code: "not_found" })
    expect((await callApi(ctxFor(db, other), invoicesList, { jobId: v.jobId })).data).toEqual([])
    expect(await db.select().from(s.invoice).where(and(eq(s.invoice.organizationId, "org-l")))).toEqual([])
  })
})

describe("the events an invoice writes", () => {
  it("send writes invoice.sent, a reminder writes invoice.reminded once a day, and a cancel writes invoice.cancelled once", async () => {
    const v = await doneAndOwed()
    const bill = await callApi(as(writeKey), invoicesSend, { jobId: v.jobId })
    expect(await storyOf(db, { kind: "invoice.sent", aboutId: bill.id })).toMatchObject([{ about: "invoice", customerId: "c100", jobId: v.jobId, who: "api", detail: { number: bill.number, total: 145, dueOn: "2027-05-21" } }])
    await callApi(as(writeKey), invoicesRemind, { id: bill.id })
    await callApi(as(writeKey), invoicesRemind, { id: bill.id })
    expect(await storyOf(db, { kind: "invoice.reminded", aboutId: bill.id })).toMatchObject([{ about: "invoice", customerId: "c100", jobId: v.jobId, detail: { number: bill.number, total: 145 } }])
    await expect(callApi(as(readKey), invoicesCancel, { id: bill.id })).rejects.toMatchObject({ code: "forbidden" })
    expect(await storyOf(db, { kind: "invoice.cancelled", aboutId: bill.id })).toEqual([])
    await callApi(as(), invoicesCancel, { id: bill.id })
    await callApi(as(), invoicesCancel, { id: bill.id })
    expect(await storyOf(db, { kind: "invoice.cancelled", aboutId: bill.id })).toMatchObject([{ about: "invoice", customerId: "c100", jobId: v.jobId, who: "api", detail: { number: bill.number, total: 145 } }])
  })
  it("a refused send writes nothing", async () => {
    const v = await repair()
    await expect(callApi(as(writeKey), invoicesSend, { jobId: v.jobId })).rejects.toBeTruthy()
    expect(await storyOf(db, { kind: "invoice.sent", jobId: v.jobId })).toEqual([])
  })
})
