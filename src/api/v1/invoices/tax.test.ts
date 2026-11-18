// @vitest-environment node
// Sales tax is part of the job total (step 6, decision 4): with the Billing switch on, a taxable $145 repair owes $157 on every
// screen, the invoice asks for $157, the pay page opens a $157 session, the webhook records $157 and leaves the job Paid, and an
// office payment may be $157 and no more. With the switch off nothing changes (the rest of the suite).
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import type Stripe from "stripe"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { jobTax } from "@/lib/jobs/tax"
import { signToken } from "@/lib/messaging/tokens"
import { visitBalance } from "@/lib/money/record"
import { startBillPayment } from "@/lib/stripe/invoice-checkout"
import { handleStripeEvent } from "@/lib/stripe/webhook"
import { paidIntent, stubStripe } from "@/lib/stripe/test-stripe"
import { callApi } from "../../core/call"
import { getLiveAdminData } from "@/lib/admin/live"
import { visitPrice as screenVisitPrice } from "@/app/(admin)/admin/_screens/visit-panel-model"
import { adminKey, apiDb, ctxFor, ORG, writeKey } from "../../test-helpers"
import { customersGet } from "../customers/handlers"
import { paymentsRecord } from "../payments/handlers"
import { visitsGet } from "../visits/handlers"
import { visitsCreate } from "../visits/office"
import { invoicesPayView, invoicesSend } from "./handlers"

let db: TestDb
let before: typeof s.organization.$inferSelect["settings"]
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  await db.update(s.customer).set({ email: "dana@example.com", phone: null }).where(eq(s.customer.id, "c100"))
  const [org] = await db.select().from(s.organization).where(eq(s.organization.id, ORG))
  before = org!.settings
  await db.update(s.organization).set({ settings: { ...before, billing: { dueDays: 14, collectsSalesTax: true, salesTaxPercent: 8 } } }).where(eq(s.organization.id, ORG))
})
afterAll(async () => {
  await db.update(s.organization).set({ settings: before }).where(eq(s.organization.id, ORG))
  await db.close()
})

const NOW = "2027-05-07T20:00:00Z"
const as = () => ctxFor(db, writeKey, NOW)
let day = new Date("2027-06-01T12:00:00Z")
const nextWeekday = () => {
  do day = new Date(day.getTime() + 86_400_000)
  while ([0, 6].includes(day.getUTCDay()))
  return day.toISOString().slice(0, 10)
}
/** A done repair of $145 whose line is taxable: it owes $157 at 8%. */
async function taxedRepair() {
  const v = await callApi(as(), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: nextWeekday(), price: 145 })
  await db.update(s.lineItem).set({ taxable: true }).where(eq(s.lineItem.visitId, v.id))
  await db.update(s.visit).set({ status: "completed", completedOn: "2027-05-07" }).where(eq(s.visit.id, v.id))
  return v
}
const jobOf = async (jobId: string) => (await callApi(as(), customersGet, { id: "c100" })).jobs.find((j) => j.id === jobId)!

describe("a taxable $145 repair with 8% sales tax on", () => {
  it("owes $157 as a visit, a job and a balance", async () => {
    const v = await taxedRepair()
    expect((await callApi(as(), visitsGet, { id: v.id })).amount).toBe(157)
    const job = await jobOf(v.jobId)
    expect(job).toMatchObject({ total: 157, price: 157, visits: [{ amount: 157 }], money: { total: 157, owed: 157, words: "$157 unpaid" } })
    expect(job.lines).toMatchObject([{ unitPrice: 145, taxable: true }])
    expect(await visitBalance(db, ORG, v)).toEqual({ price: 157, paid: 0, owed: 157 })
  })

  it("is billed at $157 (amount 145, tax 12), shown that way on the pay page and opened as a $157 card form", async () => {
    const v = await taxedRepair()
    const bill = await callApi(as(), invoicesSend, { jobId: v.jobId })
    expect(bill).toMatchObject({ amount: 145, tax: 12, total: 157 })
    const message = (await db.select().from(s.messageLog)).find((m) => m.key === `invoice-${bill.id}`)!
    expect(message.subject).toMatch(/^Your Trailhead invoice for the repair at .+: \$157$/)
    expect(message.body).toContain("Tax: $12")
    expect(message.body).not.toContain("Sales tax")
    const visitor = ctxFor(db, { kind: "public", id: "checkout", organizationId: ORG, scopes: ["checkout"], invoiceId: bill.id }, NOW)
    expect(await callApi(visitor, invoicesPayView, { id: bill.id })).toMatchObject({ tax: 12, total: 157 })
    const { stripe, calls } = stubStripe()
    expect(await startBillPayment(db, stripe, { invoiceId: bill.id, token: signToken("invoice-pay", bill.id), origin: "https://site.test", now: new Date(NOW) })).toMatchObject({ ok: true })
    expect(calls.sessionCreate.mock.calls[0]![0]).toMatchObject({ line_items: [{ price_data: { unit_amount: 15700 } }] })
  })

  it("is paid by the webhook for $157, which leaves the job Paid and sends a receipt with the Tax line", async () => {
    const v = await taxedRepair()
    const bill = await callApi(as(), invoicesSend, { jobId: v.jobId })
    const { stripe } = stubStripe({ intents: { pi_tax_a: paidIntent("pi_tax_a", { pm: "pm_tax_a", customer: "cus_dana" }) } })
    const completed = { id: "evt_tax_a", type: "checkout.session.completed", object: "event", data: { object: { id: "cs_tax_a", payment_status: "paid", payment_intent: "pi_tax_a", customer: "cus_dana", metadata: { purpose: "invoice", invoiceId: bill.id } } } } as unknown as Stripe.Event
    await handleStripeEvent(db, stripe, ORG, completed, "https://site.test", new Date("2027-05-10T18:00:00Z"))
    const rows = await db.select().from(s.charge).where(eq(s.charge.jobId, v.jobId))
    expect(rows).toMatchObject([{ amount: 157, method: "card_now", status: "succeeded", visitId: null }])
    const job = await jobOf(v.jobId)
    expect(job.money).toMatchObject({ paid: 157, total: 157, owed: 0, words: "Paid" })
    expect((await callApi(as(), visitsGet, { id: v.id })).paymentStatus).toBe("paid")
    const receipt = (await db.select().from(s.messageLog)).find((m) => m.key === `payment-${rows[0]!.id}`)!
    expect(receipt.body).toContain("Sales tax: $12")
    expect(receipt.body).toContain("$157")
  })

  it("takes a $157 payment from the office and refuses $158", async () => {
    const v = await taxedRepair()
    await expect(callApi(as(), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 158, method: "cash" })).rejects.toMatchObject({ code: "unprocessable", message: "Only $157 is still unpaid on this visit" })
    await callApi(as(), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 157, method: "cash" })
    expect(await visitBalance(db, ORG, v)).toEqual({ price: 157, paid: 157, owed: 0 })
    expect((await jobOf(v.jobId)).money.words).toBe("Paid")
    await expect(callApi(as(), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 1, method: "cash" })).rejects.toMatchObject({ message: "This visit is already paid" })
  })

  it("leaves $57 unpaid after a $100 check, and the invoice for $157 is then refused", async () => {
    const v = await taxedRepair()
    const bill = await callApi(as(), invoicesSend, { jobId: v.jobId })
    await callApi(as(), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 100, method: "check", reference: "1042" })
    expect(await visitBalance(db, ORG, v)).toEqual({ price: 157, paid: 100, owed: 57 })
    expect((await jobOf(v.jobId)).money).toMatchObject({ paid: 100, owed: 57, words: "Invoice sent" })
    const { stripe, calls } = stubStripe()
    expect(await startBillPayment(db, stripe, { invoiceId: bill.id, token: signToken("invoice-pay", bill.id), origin: "https://site.test", now: new Date(NOW) })).toEqual({
      ok: false, message: "Part of this invoice was paid another way. Please call us for the new amount.",
    })
    expect(calls.sessionCreate).not.toHaveBeenCalled()
  })

  it("stays payable at its frozen $157 when the tax rate is edited to 7% after the invoice went out and nothing was paid", async () => {
    const v = await taxedRepair()
    const bill = await callApi(as(), invoicesSend, { jobId: v.jobId })
    expect(bill.total).toBe(157)
    const setRate = (salesTaxPercent: number) => db.update(s.organization).set({ settings: { ...before, billing: { dueDays: 14, collectsSalesTax: true, salesTaxPercent } } }).where(eq(s.organization.id, ORG))
    await setRate(7)
    try {
      // the job now owes $155 at 7%, less than the invoice's $157, but no money arrived: this is not an invoice paid another way
      expect((await jobOf(v.jobId)).money.owed).toBeLessThan(157)
      const { stripe, calls } = stubStripe()
      expect(await startBillPayment(db, stripe, { invoiceId: bill.id, token: signToken("invoice-pay", bill.id), origin: "https://site.test", now: new Date(NOW) })).toMatchObject({ ok: true })
      expect(calls.sessionCreate.mock.calls[0]![0]).toMatchObject({ line_items: [{ price_data: { unit_amount: 15700 } }] })
    } finally {
      await setRate(8)
    }
  })

  it("bills only what is unpaid when money was paid on the job first: $57 after a $100 deposit, tax included", async () => {
    const v = await taxedRepair()
    await callApi(as(), paymentsRecord, { jobId: v.jobId, amount: 100, method: "check" })
    const bill = await callApi(as(), invoicesSend, { jobId: v.jobId })
    expect(bill).toMatchObject({ tax: 12, total: 57, amount: 45 })
    expect(bill.lines.map((l) => [l.name, l.unitPrice])).toEqual([["Repair", 145], ["Payments received", -100]])
  })

  it("taxes only the taxable one of a visit's two lines", async () => {
    const v = await taxedRepair()
    const [first] = await db.select().from(s.lineItem).where(eq(s.lineItem.visitId, v.id))
    await db.insert(s.lineItem).values({ organizationId: ORG, jobId: v.jobId, visitId: v.id, name: "Labor", description: null, quantity: 1, unitPrice: 60, taxable: false })
    expect(first!.taxable).toBe(true)
    expect((await callApi(as(), visitsGet, { id: v.id })).amount).toBe(145 + 12 + 60)
    const bill = await callApi(as(), invoicesSend, { jobId: v.jobId })
    expect(bill).toMatchObject({ amount: 205, tax: 12, total: 217 })
    expect(jobTax(bill.lines, { collectsSalesTax: true, salesTaxPercent: 8 })).toBe(bill.tax)
  })

  it("is $157 on the screens too: the shaped data carries the rule, the job's total, its money and the visit's price", async () => {
    const v = await taxedRepair()
    const data = await getLiveAdminData(ctxFor(db, adminKey, NOW))
    expect(data.billing).toEqual({ collectsSalesTax: true, salesTaxPercent: 8 })
    const job = data.jobs!.find((j) => j.id === v.jobId)!
    expect(job).toMatchObject({ total: 157, price: 157, money: { total: 157, owed: 157, words: "$157 unpaid" } })
    const visit = data.visits.find((x) => x.id === v.id)!
    expect(visit.price).toBe(157)
    expect(screenVisitPrice(data, visit)).toBe(157)
  })
})
