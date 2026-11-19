// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "@/api/core/call"
import { invoicesCancel, invoicesPayView, invoicesGet, invoicesSend } from "@/api/v1/invoices/handlers"
import { visitsCreate } from "@/api/v1/visits/office"
import { adminKey, apiDb, ctxFor, ORG, writeKey } from "@/api/test-helpers"
import { ctxForInvoice } from "@/lib/admin/api-ctx"
import { signToken } from "@/lib/messaging/tokens"
import { startBillPayment } from "@/lib/stripe/invoice-checkout"
import { stubStripe } from "@/lib/stripe/test-stripe"
import { startPayment } from "./actions"
import PayPage from "./page"

const holder = vi.hoisted(() => ({ db: undefined as unknown }))
vi.mock("@/db", () => ({ db: () => holder.db }))
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }) }))
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`)
  },
}))
vi.mock("./actions", () => ({ startPayment: vi.fn(async () => undefined) }))

let db: TestDb
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  holder.db = db
  await db.update(s.customer).set({ email: "andrea.test@example.com", phone: null }).where(eq(s.customer.id, "c100"))
})
afterAll(() => db.close())

let day = new Date("2027-06-01T12:00:00Z")
const nextWeekday = () => {
  do day = new Date(day.getTime() + 86_400_000)
  while ([0, 6].includes(day.getUTCDay()))
  return day.toISOString().slice(0, 10)
}
/** Andrea's repair, done and invoiced: the sent invoice, due 14 days after Nov 17 2026 (the real clock the page reads is far earlier or later, so the tests set `dueOn` themselves). */
async function sentBill(price = 145) {
  const at = "2027-05-07T20:00:00Z"
  const v = await callApi(ctxFor(db, writeKey, at), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: nextWeekday(), price })
  await db.update(s.visit).set({ status: "completed", completedOn: "2027-05-07" }).where(eq(s.visit.id, v.id))
  const invoice = await callApi(ctxFor(db, writeKey, at), invoicesSend, { jobId: v.jobId })
  // A due day far ahead reads "sent" whatever day the suite runs on.
  await db.update(s.invoice).set({ dueOn: "2099-12-01" }).where(eq(s.invoice.id, invoice.id))
  return { visit: v, invoice }
}
const page = (invoiceId: string, token: string | undefined) => PayPage({ params: Promise.resolve({ invoiceId }), searchParams: Promise.resolve({ token }) })
const billOf = async (invoiceId: string) => ((await page(invoiceId, signToken("invoice-pay", invoiceId))) as { props: { bill: Record<string, unknown> } }).props.bill

describe("the pay page", () => {
  it("is a 404 without the signed token, with a wrong one, and with another invoice's", async () => {
    const a = await sentBill()
    const b = await sentBill()
    await expect(page(a.invoice.id, undefined)).rejects.toThrow("NEXT_NOT_FOUND")
    await expect(page(a.invoice.id, "nope")).rejects.toThrow("NEXT_NOT_FOUND")
    await expect(page(a.invoice.id, signToken("invoice-pay", b.invoice.id))).rejects.toThrow("NEXT_NOT_FOUND")
    await expect(page(a.invoice.id, signToken("renew-pass", a.invoice.id))).rejects.toThrow("NEXT_NOT_FOUND")
    // A signed id that is no invoice is a 404 too.
    await expect(page("no-such-bill", signToken("invoice-pay", "no-such-bill"))).rejects.toThrow("NEXT_NOT_FOUND")
  })

  it("shows a sent invoice: the first name, the frozen lines, the total and the due day, and nothing else of the customer", async () => {
    const { invoice } = await sentBill()
    const bill = await billOf(invoice.id)
    expect(bill).toEqual({
      id: invoice.id, number: invoice.number, firstName: "Andrea", lines: [expect.objectContaining({ name: "Repair", quantity: 1, unitPrice: 145 })],
      amount: 145, tax: 0, total: 145, dueOn: "2099-12-01", paidOn: null, status: "sent", receiptUrl: null,
    })
    expect(JSON.stringify(bill)).not.toMatch(/andrea.test@example|phone|customerId|jobId|payUrl|token/i)
  })

  it("reads an overdue invoice, a paid one with its receipt, and a canceled one", async () => {
    const late = await sentBill()
    await db.update(s.invoice).set({ dueOn: "2020-01-01" }).where(eq(s.invoice.id, late.invoice.id))
    expect(await billOf(late.invoice.id)).toMatchObject({ status: "overdue", dueOn: "2020-01-01" })

    const settled = await sentBill()
    const [payment] = await db.insert(s.charge).values({ organizationId: ORG, jobId: settled.visit.jobId, customerId: "c100", visitId: null, amount: 145, status: "succeeded", method: "card_now", paidOn: "2026-11-20", receiptUrl: "https://pay.stripe.test/receipt/x" }).returning()
    await db.update(s.invoice).set({ paidOn: "2026-11-20", paymentId: payment!.id }).where(eq(s.invoice.id, settled.invoice.id))
    expect(await billOf(settled.invoice.id)).toMatchObject({ status: "paid", paidOn: "2026-11-20", receiptUrl: "https://pay.stripe.test/receipt/x" })

    const gone = await sentBill()
    await callApi(ctxFor(db, adminKey, "2027-05-08T20:00:00Z"), invoicesCancel, { id: gone.invoice.id })
    expect(await billOf(gone.invoice.id)).toMatchObject({ status: "cancelled" })
  })

  it("hands the screen a pay action bound to this invoice and its token", async () => {
    const { invoice } = await sentBill()
    const token = signToken("invoice-pay", invoice.id)
    const element = (await page(invoice.id, token)) as { props: { payAction: () => Promise<unknown> } }
    await element.props.payAction()
    expect(startPayment).toHaveBeenCalledWith(invoice.id, token)
  })
})

describe("the pay page's visitor", () => {
  it("reads the one invoice its link opened through invoices.payView, and nothing else", async () => {
    const a = await sentBill()
    const b = await sentBill()
    const ctx = (await ctxForInvoice(a.invoice.id, { database: () => db }))!
    expect(ctx.organizationId).toBe(ORG)
    await expect(callApi(ctx, invoicesPayView, { id: a.invoice.id })).resolves.toMatchObject({ number: a.invoice.number, firstName: "Andrea" })
    await expect(callApi(ctx, invoicesPayView, { id: b.invoice.id })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctx, invoicesGet, { id: a.invoice.id })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctx, invoicesSend, { jobId: a.visit.jobId })).rejects.toMatchObject({ code: "forbidden" })
    expect(await ctxForInvoice("no-such-bill", { database: () => db })).toBeNull()
  })
})

describe("startBillPayment", () => {
  beforeEach(() => vi.stubEnv("API_KEY_PEPPER", "test-pepper"))
  const origin = "https://site.test"
  const now = new Date("2026-11-20T18:00:00Z")

  it("refuses a missing or wrong token without touching Stripe", async () => {
    const { invoice } = await sentBill()
    const { stripe, calls } = stubStripe()
    for (const token of [null, "nope", signToken("renew-pass", invoice.id)]) expect(await startBillPayment(db, stripe, { invoiceId: invoice.id, token, origin, now })).toMatchObject({ ok: false })
    expect(calls.sessionCreate).not.toHaveBeenCalled()
    expect(calls.customersCreate).not.toHaveBeenCalled()
  })

  it("opens a payment-mode session for the total that offers Stripe's unticked save box, carries the invoice on both objects, and stores the session on the invoice", async () => {
    const { invoice } = await sentBill()
    const { stripe, calls } = stubStripe()
    const token = signToken("invoice-pay", invoice.id)
    const result = await startBillPayment(db, stripe, { invoiceId: invoice.id, token, origin, now })
    expect(result).toEqual({ ok: true, url: "https://checkout.stripe.test/c/pay" })
    const [params, options] = calls.sessionCreate.mock.calls[0]! as unknown as [Record<string, unknown>, { idempotencyKey: string }]
    expect(params).toMatchObject({
      mode: "payment", customer: "cus_new_1", allowed_payment_method_types: ["card"],
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: 14500, product_data: { name: `Trailhead invoice ${invoice.number}` } } }],
      saved_payment_method_options: { payment_method_save: "enabled" },
      payment_intent_data: { metadata: { purpose: "invoice", invoiceId: invoice.id } },
      metadata: { purpose: "invoice", invoiceId: invoice.id },
      success_url: `${origin}/pay/${invoice.id}/paid`, cancel_url: `${origin}/pay/${invoice.id}?token=${token}`,
    })
    expect((params.payment_intent_data as Record<string, unknown>)).not.toHaveProperty("setup_future_usage")
    expect(options.idempotencyKey).toMatch(new RegExp(`^bill-${invoice.id}-`))
    expect((await db.select().from(s.invoice).where(eq(s.invoice.id, invoice.id)))[0]!.stripeCheckoutSessionId).toBe("cs_1")
    expect((await db.select().from(s.customer).where(eq(s.customer.id, "c100")))[0]!.stripeCustomerId).toBe("cus_new_1")
  })

  it("opens a session for an overdue invoice and reuses the Stripe customer", async () => {
    const { invoice } = await sentBill()
    await db.update(s.invoice).set({ dueOn: "2020-01-01" }).where(eq(s.invoice.id, invoice.id))
    await db.update(s.customer).set({ stripeCustomerId: "cus_dana" }).where(eq(s.customer.id, "c100"))
    const { stripe, calls } = stubStripe()
    expect(await startBillPayment(db, stripe, { invoiceId: invoice.id, token: signToken("invoice-pay", invoice.id), origin, now })).toMatchObject({ ok: true })
    expect(calls.customersCreate).not.toHaveBeenCalled()
    expect(calls.sessionCreate.mock.calls[0]![0]).toMatchObject({ customer: "cus_dana" })
  })

  it("refuses an invoice that is paid, one that was canceled and one whose job was paid by cash since", async () => {
    const { stripe, calls } = stubStripe()
    const ask = (id: string) => startBillPayment(db, stripe, { invoiceId: id, token: signToken("invoice-pay", id), origin, now })
    const paid = await sentBill()
    await db.update(s.invoice).set({ paidOn: "2026-11-19" }).where(eq(s.invoice.id, paid.invoice.id))
    expect(await ask(paid.invoice.id)).toEqual({ ok: false, message: "This invoice is already paid." })
    const gone = await sentBill()
    await callApi(ctxFor(db, adminKey, "2027-05-08T20:00:00Z"), invoicesCancel, { id: gone.invoice.id })
    expect(await ask(gone.invoice.id)).toEqual({ ok: false, message: "This invoice was voided." })
    const cash = await sentBill()
    await db.insert(s.charge).values({ organizationId: ORG, jobId: cash.visit.jobId, customerId: "c100", visitId: cash.visit.id, amount: 145, status: "succeeded", method: "cash", paidOn: "2026-11-19" })
    expect(await ask(cash.invoice.id)).toEqual({ ok: false, message: "This invoice is already paid." })
    expect(calls.sessionCreate).not.toHaveBeenCalled()
  })

  it("says one sentence and keeps the invoice untouched when Stripe will not open the form", async () => {
    const { invoice } = await sentBill()
    const { stripe, calls } = stubStripe()
    calls.sessionCreate.mockRejectedValueOnce(new Error("Stripe is down"))
    const result = await startBillPayment(db, stripe, { invoiceId: invoice.id, token: signToken("invoice-pay", invoice.id), origin, now })
    expect(result).toEqual({ ok: false, message: "We couldn't open the card form. Try again, or call Ryan at (970) 692-7270." })
    expect((await db.select().from(s.invoice).where(eq(s.invoice.id, invoice.id)))[0]!.stripeCheckoutSessionId).toBeNull()
  })
})
