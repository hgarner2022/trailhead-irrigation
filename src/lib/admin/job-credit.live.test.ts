// @vitest-environment node
import { NO_TAX } from "@/lib/jobs/tax"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "@/api/core/call"
import { adminKey, apiDb, ctxFor, jobIdOfPassId, linesOfJob, ORG, owner, passJobOf, writeKey } from "@/api/test-helpers"
import { linesOfVisit, visitPrice } from "@/lib/jobs/lines"
import { invoicesSend } from "@/api/v1/invoices/handlers"
import { paymentsRecord, paymentsRefund } from "@/api/v1/payments/handlers"
import { visitsGet } from "@/api/v1/visits/handlers"
import { visitsCreate } from "@/api/v1/visits/office"
import { loadJobCredit } from "@/lib/money/credit"
import { jobOwed } from "@/lib/money/words"
import { moneyOf } from "./jobs"
import { getLiveAdminData } from "./live"
import { chargedSoFar, committedByMonth } from "./metrics"

// A payment made on the job as a whole (an invoice paid on the pay page has no visit) reaches the visit-level words and sums:
// the visits it covers read "Paid, card", the job reads Paid, and no sum counts it twice.

const NOW = "2027-04-20T15:00:00Z"
let db: TestDb
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  // An invoice needs a way to reach the customer.
  await db.update(s.customer).set({ email: "andrea.test@example.com" }).where(eq(s.customer.id, "c100"))
})
afterAll(() => db.close())

const jobOf = async (passId: string) => jobIdOfPassId(db, passId)
/** The job's visits with what each costs: its own lines' total. */
const priced = async (jobId: string) => {
  const lines = await linesOfJob(db, jobId)
  return (await db.select().from(s.visit).where(eq(s.visit.jobId, jobId))).map((v) => ({ ...v, amount: visitPrice(linesOfVisit(lines, v.id), NO_TAX) }))
}
const live = () => getLiveAdminData(ctxFor(db, owner, NOW))
const payOnJob = (jobId: string, customerId: string, amount: number, method: "card_now" | "check" = "card_now") =>
  db.insert(s.charge).values({ organizationId: ORG, jobId, customerId, visitId: null, amount, status: "succeeded", method, paidOn: "2027-04-20" }).returning().then((r) => r[0]!)

describe("a payment on the job as a whole, on a job with several visits", () => {
  it("credits the oldest done visits first, reads Paid, card for them and counts the money once", async () => {
    const passId = "p4"
    const jobId = await jobOf(passId)
    const customerId = (await passJobOf(db, passId)).customerId
    const visits = await priced(jobId)
    const turnOn = visits.find((v) => v.kind === "turn-on")!
    const blowout = visits.find((v) => v.kind === "blowout")!
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-10" }).where(eq(s.visit.id, turnOn.id))
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-12" }).where(eq(s.visit.id, blowout.id))
    const before = await live()
    const chargedBefore = chargedSoFar(before.passes)
    // Only the turn-on's price has arrived, on the job as a whole.
    await payOnJob(jobId, customerId, turnOn.amount)
    const after = await live()
    const pass = after.passes.find((p) => p.id === jobId)!
    const word = (id: string) => {
      const v = pass.visits.find((x) => x.id === id)!
      return moneyOf({ status: "completed", completedOn: "2027-04-10", visitId: id, price: v.amount, payments: v.payments }).label
    }
    expect(word(turnOn.id)).toBe("Paid, card")
    expect(word(blowout.id)).toBe("Unpaid")
    // The job reads the number still unpaid, from the payment rows once: one visit of two paid.
    expect(after.jobs?.find((j) => j.id === jobId)?.money).toMatchObject({ paid: turnOn.amount })
    // No sum counts the job-level row on top of its credit.
    expect(chargedSoFar(after.passes) - chargedBefore).toBe(turnOn.amount)
    const season = committedByMonth(after.passes, pass.season).reduce((sum, m) => sum + m.charged, 0) - committedByMonth(before.passes, pass.season).reduce((sum, m) => sum + m.charged, 0)
    expect(season).toBe(turnOn.amount)
    // The rest arrives: both visits read Paid, card, and the job reads Paid.
    await payOnJob(jobId, customerId, blowout.amount)
    const paid = await live()
    const p = paid.passes.find((x) => x.id === jobId)!
    expect(p.visits.filter((v) => [turnOn.id, blowout.id].includes(v.id!)).map((v) => moneyOf({ status: "completed", completedOn: "2027-04-10", visitId: v.id, price: v.amount, payments: v.payments }).label)).toEqual(["Paid, card", "Paid, card"])
    expect(paid.jobs?.find((j) => j.id === jobId)?.money?.owed).toBe(Math.max(0, (paid.jobs?.find((j) => j.id === jobId)?.total ?? 0) - turnOn.amount - blowout.amount))
    expect(chargedSoFar(paid.passes) - chargedBefore).toBe(turnOn.amount + blowout.amount)
  })

  it("credits the visits a paid invoice names before the older ones", async () => {
    const passId = "p6"
    const jobId = await jobOf(passId)
    const pass = await passJobOf(db, passId)
    await db.delete(s.charge).where(eq(s.charge.jobId, jobId))
    const visits = await priced(jobId)
    const turnOn = visits.find((v) => v.kind === "turn-on")!
    const blowout = visits.find((v) => v.kind === "blowout")!
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-01"}).where(eq(s.visit.id, turnOn.id))
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-09"}).where(eq(s.visit.id, blowout.id))
    const payment = await payOnJob(jobId, pass.customerId, blowout.amount)
    await db.insert(s.invoice).values({
      organizationId: ORG, jobId, customerId: pass.customerId, number: "INV-2027-9001", amount: blowout.amount, total: blowout.amount, sentOn: "2027-04-09", dueOn: "2027-04-23", paidOn: "2027-04-20", paymentId: payment.id,
      lines: [{ name: "Fall blowout", description: null, quantity: 1, unitPrice: blowout.amount, taxable: false, visitId: blowout.id }],
    })
    const credit = await loadJobCredit(db, ORG, [jobId])
    expect([...credit.keys()]).toEqual([blowout.id])
    const data = await live()
    const shown = data.passes.find((p) => p.id === jobId)!.visits
    expect(shown.find((v) => v.id === blowout.id)!.payments?.map((p) => p.amount)).toEqual([blowout.amount])
    expect(shown.find((v) => v.id === turnOn.id)!.payments ?? []).toEqual([])
  })
})

describe("a payment on the job as a whole, on a one-visit job", () => {
  it("makes the visit read paid through the API and refuses taking the money a second time", async () => {
    const v = await callApi(ctxFor(db, writeKey, "2027-05-07T20:00:00Z"), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-06-09", price: 145 })
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-05-07" }).where(eq(s.visit.id, v.id))
    await callApi(ctxFor(db, writeKey, "2027-05-07T20:00:00Z"), invoicesSend, { jobId: v.jobId })
    const row = await payOnJob(v.jobId, "c100", 145)
    const got = await callApi(ctxFor(db, writeKey, NOW), visitsGet, { id: v.id })
    // The visit's own rows stay its own; the share the job-level payment covers is listed apart, under a sliced id.
    expect(got).toMatchObject({ payments: [], paymentStatus: "paid", paidBy: "card_now" })
    expect(got.jobPaymentShares).toMatchObject([{ id: `${row.id}@${v.id}`, visitId: v.id, amount: 145, method: "card_now" }])
    await expect(callApi(ctxFor(db, writeKey, NOW), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 145, method: "cash" })).rejects.toMatchObject({ code: "conflict", message: "This visit is already paid" })
    // The job counts the row once.
    const lines = await db.select().from(s.lineItem).where(eq(s.lineItem.jobId, v.jobId))
    expect(jobOwed(lines.filter((l) => !l.cancelledAt), await db.select().from(s.charge).where(eq(s.charge.jobId, v.jobId)), NO_TAX)).toBe(0)
  })

  it("is not paid again once the payment is refunded: the visit reads unpaid and its derived chargedAt is null again", async () => {
    const v = await callApi(ctxFor(db, writeKey, "2027-05-07T20:00:00Z"), visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-06-10", price: 145 })
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-05-07" }).where(eq(s.visit.id, v.id))
    const row = await payOnJob(v.jobId, "c100", 145, "check")
    await callApi(ctxFor(db, adminKey, NOW), paymentsRefund, { paymentId: row.id })
    const got = await callApi(ctxFor(db, writeKey, NOW), visitsGet, { id: v.id })
    expect(got).toMatchObject({ paymentStatus: "none", jobPaymentShares: [] })
    expect(got.chargedAt).toBeNull()
  })
})
