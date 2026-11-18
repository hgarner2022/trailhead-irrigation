// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "@/api/core/call"
import { adminKey, apiDb, ctxFor, ORG, owner, passViewOf, readKey, writeKey } from "@/api/test-helpers"
import { customersUpdate } from "@/api/v1/customers/handlers"
import { invoicesCancel, invoicesSend } from "@/api/v1/invoices/handlers"
import { paymentsRecord, paymentsRefund } from "@/api/v1/payments/handlers"
import { visitsMove } from "@/api/v1/visits/handlers"
import { visitsCreate } from "@/api/v1/visits/office"
import { alertsDismiss } from "@/api/v1/alerts/handlers"
import { outstanding } from "@/app/(admin)/admin/_screens/revenue-model"
import { billsOverdue } from "./metrics"
import { failedChargeVisits } from "./shape"
import { passVisitJob, visitJob } from "./jobs"
import { getLiveAdminData } from "./live"
import type { AdminData } from "./types"

// The job states and the data the admin shows, read through the real API handlers from a seeded database:
// one status set for a visit, derived from the row, with a pending pass never a job and never Active.

const NOW = "2027-04-20T15:00:00Z"
const TODAY = "2027-04-20"
const TZ = "America/Denver"
let db: TestDb
let data: AdminData

/** A fixture pass's job id: the seed makes each pass's job `job_<pass id>`, and a pass's id is its job's. */
const J = (passId: string) => `job_${passId}`
const jobsOf = (passId: string) => {
  const pass = data.passes.find((p) => p.id === J(passId))!
  return Object.fromEntries(pass.visits.map((v) => [v.kind, passVisitJob(pass, v, TODAY, TZ)]))
}

beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  // An invoice needs a way to reach the customer.
  await db.update(s.customer).set({ email: "andrea.test@example.com" }).where(eq(s.customer.id, "c100"))
  // p4: a day with a start time (Routed). p3: marked done, its charge failed once (Charge failed). p6: done, failed, retried and charged.
  await callApi(ctxFor(db, owner, NOW), visitsMove, { id: "p4-turn-on", personId: "person_truck-1", scheduledOn: "2027-05-05", startTime: "09:30" })
  await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-19" }).where(eq(s.visit.id, "p3-turn-on"))
  await db.insert(s.charge).values({ organizationId: ORG, jobId: J("p3"), visitId: "p3-turn-on", attempt: 1, amount: 145, status: "failed", failureMessage: "Card declined" })
  await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-19" }).where(eq(s.visit.id, "p6-turn-on"))
  await db.insert(s.charge).values([
    { organizationId: ORG, jobId: J("p6"), visitId: "p6-turn-on", attempt: 1, amount: 185, status: "failed" },
    { organizationId: ORG, jobId: J("p6"), visitId: "p6-turn-on", attempt: 2, amount: 185, status: "succeeded" },
  ])
  // p7: a day that has passed and nobody marked done (Scheduled, with the Not closed flag).
  await db.update(s.visit).set({ status: "scheduled", scheduledOn: "2027-04-15", startTime: null, personId: "person_truck-1" }).where(eq(s.visit.id, "p7-turn-on"))
  // p8: a pass whose card failed after a visit was marked done, and the card never retried.
  const p8 = await passViewOf(db, "p8")
  await db.update(s.customer).set({ cardFailedAt: new Date("2027-04-19T10:00:00Z") }).where(eq(s.customer.id, p8.customerId))
  await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-18" }).where(eq(s.visit.id, "p8-turn-on"))
  await callApi(ctxFor(db, owner, NOW), customersUpdate, { id: "c121", lastName: "garner" })
  data = await getLiveAdminData(ctxFor(db, owner, NOW))
})
afterAll(() => db.close())

describe("the job states, read from the rows", () => {
  it("reads Unscheduled for an unscheduled visit and Scheduled for a day with no start time", () => {
    expect(jobsOf("p3").inspection).toMatchObject({ state: "needs-a-day", notClosed: false })
    const withDay = data.passes.flatMap((p) => p.visits.map((v) => ({ p, v }))).find(({ v }) => v.scheduledOn && !v.startTime && !v.completedAt)!
    expect(passVisitJob(withDay.p, withDay.v, "2027-01-01", TZ)).toMatchObject({ state: "scheduled", notClosed: false })
  })

  it("reads Routed once a start time is set", () => {
    expect(jobsOf("p4")["turn-on"]).toMatchObject({ state: "routed", notClosed: false })
    expect(data.passes.find((p) => p.id === J("p4"))!.visits[0]).toMatchObject({ scheduledOn: "2027-05-05", startTime: "09:30" })
  })

  it("reads Charged for a visit with a charge, and Done for one marked done and not charged", () => {
    expect(jobsOf("p1")["turn-on"].state).toBe("charged")
    const done = { ...data.passes.find((p) => p.id === J("p2"))!, cardFailedAt: undefined }
    expect(passVisitJob(done, { ...done.visits[1], completedAt: "2027-04-19T17:00:00Z" }, TODAY, TZ).state).toBe("done")
  })

  it("reads Charge failed from a failed charge row, and again from the pass's failed card on a done job", () => {
    expect(jobsOf("p3")["turn-on"].state).toBe("charge-failed")
    expect(jobsOf("p8")["turn-on"].state).toBe("charge-failed")
    // A retry that went through clears the failure: the newest attempt decides.
    expect(jobsOf("p6")["turn-on"].state).toBe("charged")
    expect(failedChargeVisits([{ visitId: "v", attempt: 1, status: "failed" }, { visitId: "v", attempt: 2, status: "succeeded" }, { visitId: "w", attempt: 1, status: "failed" }])).toEqual(["w"])
  })

  it("flags Not closed on a Scheduled job whose day has passed, as a badge and not a state", () => {
    expect(jobsOf("p7")["turn-on"]).toMatchObject({ state: "scheduled", notClosed: true })
    const visit = data.visits.find((v) => v.id === "p7-turn-on")!
    expect(visitJob(visit, TODAY, TZ)).toMatchObject({ state: "scheduled", notClosed: true })
    // Another day ahead is not flagged.
    expect(visitJob(visit, "2027-04-10", TZ)).toMatchObject({ state: "scheduled", notClosed: false })
  })

  it("reads the same state from the calendar visit row and from the pass's own visit", () => {
    for (const id of ["p3", "p4", "p7", "p8"]) {
      const pass = data.passes.find((p) => p.id === J(id))!
      for (const pv of pass.visits) {
        const row = data.visits.find((v) => v.id === pv.id)!
        expect(visitJob(row, TODAY, TZ, pass.cardFailedAt).state, `${id} ${pv.kind}`).toBe(passVisitJob(pass, pv, TODAY, TZ).state)
      }
    }
  })
})

describe("a pending pass", () => {
  it("is Pending, never Active", () => {
    const pending = data.passes.filter((p) => p.status === "pending")
    expect(pending.map((p) => p.id)).toEqual([J("p13")])
    expect(data.passes.filter((p) => p.status === "active").some((p) => p.id === J("p13"))).toBe(false)
  })

  it("has no job anywhere on the calendar's data", () => {
    expect(data.visits.some((v) => v.passId === J("p13") || v.id.startsWith("p13-"))).toBe(false)
    expect(data.passes.find((p) => p.id === J("p13"))!.visits.length).toBe(2)
  })
})

describe("the customer record the admin reads", () => {
  it("carries the full name on the client and the pass", () => {
    expect(data.clients.find((c) => c.id === "c121")).toMatchObject({ firstName: "Reese", lastName: "Garner" })
    expect(data.passes.find((p) => p.clientId === "c121")).toMatchObject({ firstName: "Reese", lastName: "Garner" })
    expect(data.visits.find((v) => v.clientId === "c121" && v.isPass)?.clientName).toBe("Reese Garner")
  })

  it("carries the street and the consent history for the admin session", () => {
    const andrea = data.clients.find((c) => c.id === "c100")!
    expect(andrea.address).toBeTruthy()
    expect(andrea.consentHistory?.length).toBeGreaterThan(0)
  })

  it("leaves the contact fields out for a read key, and keeps the name", async () => {
    const read = await getLiveAdminData(ctxFor(db, readKey, NOW))
    const reese = read.clients.find((c) => c.id === "c121")!
    expect(reese.lastName).toBe("Garner")
    expect(reese).not.toHaveProperty("email")
    expect(reese).not.toHaveProperty("phone")
    expect(reese).not.toHaveProperty("address")
    expect(JSON.stringify(read.clients)).not.toContain("@")
  })
})

describe("the money words, read from the payment rows", () => {
  const moneyOf = (live: AdminData, visitId: string) => visitJob(live.visits.find((v) => v.id === visitId)!, TODAY, TZ)

  it("reads Paid, card from the payment row a charged pass visit has, never from a flag", () => {
    const visit = data.passes.find((p) => p.id === J("p1"))!.visits[0]!
    expect(visit.payments).toMatchObject([{ method: "card_on_file", status: "succeeded", amount: 145 }])
    expect(jobsOf("p1")["turn-on"]).toMatchObject({ state: "charged", money: "paid", moneyLabel: "Paid, card" })
    expect(visit).not.toHaveProperty("chargedAt")
  })

  it("keeps a done one-off Owed until a payment row exists, then Paid with how, and Owed again after a refund", async () => {
    const write = ctxFor(db, writeKey, NOW)
    const made = await callApi(write, visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-05-10", price: 145 })
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-19" }).where(eq(s.visit.id, made.id))

    // Done with no payment row: the visit says Unpaid, the job says "$145 unpaid", and Home has one row for the JOB.
    let live = await getLiveAdminData(ctxFor(db, owner, NOW))
    expect(moneyOf(live, made.id)).toMatchObject({ state: "done", money: "owed", moneyLabel: "Unpaid" })
    expect(live.jobs!.find((j) => j.id === made.jobId)).toMatchObject({ money: { paid: 0, total: 145, owed: 145, words: "$145 unpaid" }, payments: [] })
    const rows = live.attention.filter((a) => a.kind === "owed")
    expect(rows).toEqual([expect.objectContaining({ key: made.jobId, jobId: made.jobId, visitId: made.id, message: expect.stringMatching(/repair is done, \$145 unpaid$/) })])

    // A cash payment on the job: Paid, cash; no owed row; the month total counts it on the day it arrived.
    const before = live.monthTotals.find((m) => m.year === 2027 && m.month === 4)?.revenue ?? 0
    const paid = await callApi(write, paymentsRecord, { jobId: made.jobId, visitId: made.id, amount: 145, method: "cash", paidOn: "2027-04-18" })
    live = await getLiveAdminData(ctxFor(db, owner, NOW))
    expect(moneyOf(live, made.id)).toMatchObject({ state: "charged", money: "paid", moneyLabel: "Paid, cash" })
    expect(live.jobs!.find((j) => j.id === made.jobId)).toMatchObject({ money: { paid: 145, owed: 0, words: "Paid" } })
    expect(live.attention.filter((a) => a.kind === "owed")).toEqual([])
    expect(live.monthTotals.find((m) => m.year === 2027 && m.month === 4)!.revenue).toBe(before + 145)
    expect(live.visits.find((v) => v.id === made.id)!.payments).toMatchObject([{ id: paid.id, method: "cash", paidOn: "2027-04-18" }])

    // A refund is a negative row: the money reads Unpaid again, and the month total gives it back.
    await callApi(ctxFor(db, adminKey, NOW), paymentsRefund, { paymentId: paid.id })
    live = await getLiveAdminData(ctxFor(db, owner, NOW))
    expect(moneyOf(live, made.id)).toMatchObject({ money: "owed", moneyLabel: "Unpaid" })
    expect(live.attention.filter((a) => a.kind === "owed")).toHaveLength(1)
    expect(live.monthTotals.find((m) => m.year === 2027 && m.month === 4)!.revenue).toBe(before)
  })

  it("opens the owed row on the visit that is unpaid, not on a later one that is already paid", async () => {
    const write = ctxFor(db, writeKey, NOW)
    const first = await callApi(write, visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-05-21", price: 145 })
    const second = await callApi(write, visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-05-24", price: 145 })
    // one job with two done visits: the first unpaid, the second (the later day) paid
    await db.update(s.visit).set({ jobId: first.jobId }).where(eq(s.visit.id, second.id))
    await db.update(s.lineItem).set({ jobId: first.jobId }).where(eq(s.lineItem.visitId, second.id))
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-10" }).where(eq(s.visit.id, first.id))
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-17" }).where(eq(s.visit.id, second.id))
    await callApi(write, paymentsRecord, { jobId: first.jobId, visitId: second.id, amount: 145, method: "cash", paidOn: "2027-04-18" })
    const live = await getLiveAdminData(ctxFor(db, owner, NOW))
    expect(live.jobs!.find((j) => j.id === first.jobId)).toMatchObject({ money: { paid: 145, total: 290, owed: 145 } })
    expect(live.attention.filter((a) => a.kind === "owed" && a.jobId === first.jobId)).toEqual([expect.objectContaining({ visitId: first.id })])
  })

  it("reads Invoice sent on a done job that has an open invoice, still Invoice sent when it is overdue, Owed again once it is canceled", async () => {
    const write = ctxFor(db, writeKey, NOW)
    const made = await callApi(write, visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-05-28", price: 145 })
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-19" }).where(eq(s.visit.id, made.id))
    const bill = await callApi(write, invoicesSend, { jobId: made.jobId })

    let live = await getLiveAdminData(ctxFor(db, owner, NOW))
    expect(moneyOf(live, made.id)).toMatchObject({ state: "done", money: "bill-sent", moneyLabel: "Invoice sent" })
    expect(live.visits.find((v) => v.id === made.id)!.invoice).toMatchObject({ id: bill.id, number: bill.number, total: 145, sentOn: "2027-04-20", dueOn: "2027-05-04", status: "sent", payUrl: bill.payUrl })
    expect(live.jobs!.find((j) => j.id === made.jobId)).toMatchObject({ money: { owed: 145, words: "Invoice sent", billSent: true }, invoice: { id: bill.id } })
    // Invoice sent and not yet due: the job is on Home nowhere (no owed row, no overdue row).
    expect(live.attention.filter((a) => a.jobId === made.jobId)).toEqual([])

    // On its due day the invoice is still not overdue; the day after, it is, and its one row is the invoice's, with Remind (the action) and the customer to open.
    live = await getLiveAdminData(ctxFor(db, owner, "2027-05-04T15:00:00Z"))
    expect(live.attention.filter((a) => a.jobId === made.jobId)).toEqual([])
    live = await getLiveAdminData(ctxFor(db, owner, "2027-06-10T15:00:00Z"))
    expect(live.visits.find((v) => v.id === made.id)!.invoice).toMatchObject({ status: "overdue" })
    expect(visitJob(live.visits.find((v) => v.id === made.id)!, "2027-06-10", TZ)).toMatchObject({ money: "bill-sent", moneyLabel: "Invoice sent" })
    expect(live.attention.filter((a) => a.jobId === made.jobId)).toEqual([
      { kind: "overdue", key: `invoice-${bill.id}@2027-05-04`, invoiceId: bill.id, jobId: made.jobId, customerId: "c100", message: expect.stringMatching(/'s bill of \$145 was due May 4$/), since: "2027-05-04T18:00:00Z" },
    ])
    // The month's tile and the Visits link count it by the invoice's total, not twice with its owed number.
    expect(billsOverdue(live.jobs, "2027-06-10", TZ)).toEqual({ count: 1, total: 145 })
    // Outstanding counts this job once, at the invoice's total, whatever the other jobs of the shared database owe.
    const without = outstanding({ visits: live.visits, jobs: live.jobs!.filter((j) => j.id !== made.jobId) })!
    expect(outstanding(live)).toEqual({ total: without.total + 145, jobs: without.jobs + 1 })

    // Dismissed for that due day, the row is gone.
    await callApi(ctxFor(db, adminKey, NOW), alertsDismiss, { kind: "overdue", key: `invoice-${bill.id}@2027-05-04` })
    live = await getLiveAdminData(ctxFor(db, owner, "2027-06-10T15:00:00Z"))
    expect(live.attention.filter((a) => a.kind === "overdue" && a.invoiceId === bill.id)).toEqual([])

    // A read-only key's data never carries the pay link, which is a bearer link.
    const read = await getLiveAdminData(ctxFor(db, readKey, NOW))
    expect(read.visits.find((v) => v.id === made.id)!.invoice).not.toHaveProperty("payUrl")
    expect(JSON.stringify(read)).not.toContain("/pay/")

    await callApi(ctxFor(db, adminKey, NOW), invoicesCancel, { id: bill.id })
    live = await getLiveAdminData(ctxFor(db, owner, NOW))
    expect(moneyOf(live, made.id)).toMatchObject({ money: "owed", moneyLabel: "Unpaid" })
    expect(live.visits.find((v) => v.id === made.id)).not.toHaveProperty("invoice")
    expect(live.jobs!.find((j) => j.id === made.jobId)).toMatchObject({ money: { words: "$145 unpaid", billSent: false } })
    // Canceled, the invoice's row is gone and the job is Done and Unpaid on Home again.
    expect(live.attention.filter((a) => a.kind === "owed" && a.jobId === made.jobId)).toHaveLength(1)
    expect(live.attention.filter((a) => a.kind === "overdue" && a.invoiceId === bill.id)).toEqual([])
  })

  it("settles an open invoice when the office is paid another way, and no reader counts an open invoice whose job owes nothing", async () => {
    const write = ctxFor(db, writeKey, NOW)
    const made = await callApi(write, visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-06-07", price: 145 })
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-19" }).where(eq(s.visit.id, made.id))
    const bill = await callApi(write, invoicesSend, { jobId: made.jobId })
    const later = "2027-06-10T15:00:00Z"
    const overdue = (live: AdminData) => live.attention.filter((a) => a.jobId === made.jobId)
    expect(overdue(await getLiveAdminData(ctxFor(db, owner, later)))).toHaveLength(1)

    await callApi(write, paymentsRecord, { jobId: made.jobId, visitId: made.id, amount: 145, method: "check" })
    const [settled] = await db.select().from(s.invoice).where(eq(s.invoice.id, bill.id))
    expect(settled).toMatchObject({ paidOn: "2027-04-20", cancelledAt: null })
    let live = await getLiveAdminData(ctxFor(db, owner, later))
    expect(live.jobs!.find((j) => j.id === made.jobId)).toMatchObject({ money: { owed: 0, words: "Paid" } })
    expect(live.jobs!.find((j) => j.id === made.jobId)).not.toHaveProperty("invoice")
    expect(overdue(live)).toEqual([])

    // The readers hold even if an invoice is left open: its job owes nothing, so it is no invoice.
    await db.update(s.invoice).set({ paidOn: null, paymentId: null }).where(eq(s.invoice.id, bill.id))
    live = await getLiveAdminData(ctxFor(db, owner, later))
    expect(live.jobs!.find((j) => j.id === made.jobId)).not.toHaveProperty("invoice")
    expect(overdue(live)).toEqual([])
    expect(live.visits.find((v) => v.id === made.id)).not.toHaveProperty("invoice")
    const [count, total] = [billsOverdue(live.jobs, "2027-06-10", TZ), outstanding(live)]
    const without = outstanding({ visits: live.visits, jobs: live.jobs!.filter((j) => j.id !== made.jobId) })!
    expect(total).toEqual(without)
    expect(count.count).toBe(billsOverdue(live.jobs!.filter((j) => j.id !== made.jobId), "2027-06-10", TZ).count)
    await db.update(s.invoice).set({ paidOn: "2027-04-20", paymentId: settled!.paymentId }).where(eq(s.invoice.id, bill.id))
  })

  it("counts only a fully paid visit as paid when it words a job, so a part-paid visit does not read as paid", async () => {
    const write = ctxFor(db, writeKey, NOW)
    const first = await callApi(write, visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-06-01", price: 145 })
    const second = await callApi(write, visitsCreate, { customerId: "c100", kind: "repair", scheduledOn: "2027-06-02", price: 100 })
    await db.update(s.visit).set({ jobId: first.jobId }).where(eq(s.visit.id, second.id))
    await db.update(s.lineItem).set({ jobId: first.jobId }).where(eq(s.lineItem.visitId, second.id))
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-10" }).where(eq(s.visit.id, first.id))
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-04-11" }).where(eq(s.visit.id, second.id))
    await callApi(write, paymentsRecord, { jobId: first.jobId, visitId: first.id, amount: 145, method: "cash" })
    await callApi(write, paymentsRecord, { jobId: first.jobId, visitId: second.id, amount: 40, method: "cash" })
    const live = await getLiveAdminData(ctxFor(db, owner, NOW))
    expect(live.jobs!.find((j) => j.id === first.jobId)!.money).toMatchObject({ paid: 185, total: 245, owed: 60, words: "1 of 2 paid, $60 unpaid" })
  })
})
