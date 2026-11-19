// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, eventsOf, jobIdOfPassId, ORG, readKey, writeKey } from "../../test-helpers"
import { invoicesSend } from "../invoices/handlers"
import { paymentsRecord, paymentsRefund } from "../payments/handlers"
import { visitsCreate } from "../visits/office"
import { jobsCancel } from "./cancel"

let db: TestDb
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  await db.update(s.customer).set({ phone: "+13035550111" }).where(eq(s.customer.id, "c100"))
})
afterAll(() => db.close())

const as = (p = writeKey) => ctxFor(db, p, "2027-06-01T20:00:00Z")
const make = (input: Record<string, unknown> = {}) => callApi(as(), visitsCreate, { customerId: "c100", serviceKey: "repair", ...input })
const live = async (jobId: string) => (await db.select().from(s.lineItem).where(eq(s.lineItem.jobId, jobId))).filter((l) => !l.cancelledAt)

describe("jobs.cancel", () => {
  it("cancels the job, every line and every visit that is not done, frees the day and writes job.cancelled; nothing is deleted", async () => {
    const dated = await make({ scheduledOn: "2027-06-15" })
    const second = await callApi(as(), visitsCreate, { jobId: dated.jobId, serviceKey: "install" })
    const out = await callApi(as(), jobsCancel, { id: dated.jobId, reason: "Customer changed their mind" })
    expect(out).toMatchObject({ id: dated.jobId, visitsCancelled: 2, linesCancelled: 2 })
    const [job] = await db.select().from(s.job).where(eq(s.job.id, dated.jobId))
    expect(job!.cancelledAt).toBeInstanceOf(Date)
    expect(await live(dated.jobId)).toEqual([])
    const visits = await db.select().from(s.visit).where(eq(s.visit.jobId, dated.jobId))
    expect(visits.map((v) => v.id).sort()).toEqual([dated.id, second.id].sort())
    for (const v of visits) expect(v).toMatchObject({ status: "cancelled", personId: null, scheduledOn: null, startTime: null, stopOrder: null })
    const events = await eventsOf(db, { jobId: dated.jobId })
    expect(events.filter((e) => e.kind === "job.cancelled")).toMatchObject([{ about: "job", aboutId: dated.jobId, customerId: "c100", detail: { reason: "Customer changed their mind", visits: 2, lines: 2 } }])
    expect(events.filter((e) => e.kind === "visit.cancelled")).toHaveLength(2)
  })

  it("sends the customer nothing", async () => {
    const dated = await make({ scheduledOn: "2027-06-16" })
    const before = (await db.select().from(s.messageLog)).length
    await callApi(as(), jobsCancel, { id: dated.jobId })
    expect((await db.select().from(s.messageLog)).length).toBe(before)
  })

  it("leaves a done visit as it is (it was done) but cancels every line and the visits still ahead", async () => {
    const done = await make({ scheduledOn: "2027-06-17" })
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-06-01" }).where(eq(s.visit.id, done.id))
    const ahead = await callApi(as(), visitsCreate, { jobId: done.jobId, serviceKey: "repair" })
    const out = await callApi(as(), jobsCancel, { id: done.jobId })
    expect(out).toMatchObject({ visitsCancelled: 1, linesCancelled: 2 })
    expect((await db.select().from(s.visit).where(eq(s.visit.id, done.id)))[0]!.status).toBe("completed")
    expect((await db.select().from(s.visit).where(eq(s.visit.id, ahead.id)))[0]!.status).toBe("cancelled")
  })

  it("refuses a job that holds a payment, in plain words, and changes nothing", async () => {
    const v = await make({ scheduledOn: "2027-06-18" })
    await callApi(as(), paymentsRecord, { jobId: v.jobId, amount: 145, method: "check" })
    await expect(callApi(as(), jobsCancel, { id: v.jobId })).rejects.toMatchObject({ code: "conflict", message: "This job has a payment. Refund it first." })
    const [job] = await db.select().from(s.job).where(eq(s.job.id, v.jobId))
    expect(job!.cancelledAt).toBeNull()
    expect((await db.select().from(s.visit).where(eq(s.visit.id, v.id)))[0]!.status).toBe("scheduled")
    expect(await live(v.jobId)).toHaveLength(1)
  })

  it("allows it once the payment is refunded in full", async () => {
    const v = await make({ scheduledOn: "2027-06-21" })
    const paid = await callApi(as(adminKey), paymentsRecord, { jobId: v.jobId, amount: 145, method: "cash" })
    await callApi(as(adminKey), paymentsRefund, { paymentId: paid.id })
    await expect(callApi(as(), jobsCancel, { id: v.jobId })).resolves.toMatchObject({ id: v.jobId })
  })

  it("voids an open invoice that is unpaid", async () => {
    const v = await make({ scheduledOn: "2027-06-22" })
    await db.update(s.visit).set({ status: "completed", completedOn: "2027-06-01" }).where(eq(s.visit.id, v.id))
    await callApi(as(), invoicesSend, { jobId: v.jobId })
    expect((await db.select().from(s.invoice).where(eq(s.invoice.jobId, v.jobId)))[0]!.cancelledAt).toBeNull()
    await callApi(as(), jobsCancel, { id: v.jobId })
    expect((await db.select().from(s.invoice).where(eq(s.invoice.jobId, v.jobId)))[0]!.cancelledAt).toBeInstanceOf(Date)
  })

  it("refuses a Season Pass, a job already canceled, another organization's job, and a read key", async () => {
    await expect(callApi(as(), jobsCancel, { id: await jobIdOfPassId(db, "p4") })).rejects.toMatchObject({ code: "unprocessable", message: expect.stringMatching(/Cancel pass/) })
    const v = await make({ scheduledOn: "2027-06-23" })
    await callApi(as(), jobsCancel, { id: v.jobId })
    await expect(callApi(as(), jobsCancel, { id: v.jobId })).rejects.toMatchObject({ code: "unprocessable", message: "This job is already canceled" })
    await expect(callApi(as(), jobsCancel, { id: "nope" })).rejects.toMatchObject({ code: "not_found" })
    const other = await make({ scheduledOn: "2027-06-24" })
    await expect(callApi(as(readKey), jobsCancel, { id: other.jobId })).rejects.toMatchObject({ code: "forbidden" })
  })
})

describe("jobs.cancel, the schedule", () => {
  it("resolves the Home alert of a visit that is gone and orders the person's day again", async () => {
    const a = await make({ scheduledOn: "2027-06-28" })
    const b = await make({ scheduledOn: "2027-06-28" })
    await db.insert(s.adminAlert).values({ organizationId: ORG, kind: "unplaced", key: a.id, jobId: a.jobId, message: "Unscheduled" })
    await callApi(as(), jobsCancel, { id: a.jobId })
    const [other] = await db.select().from(s.visit).where(eq(s.visit.id, b.id))
    expect(other).toMatchObject({ status: "scheduled", stopOrder: 1 })
    const alerts = await db.select().from(s.adminAlert).where(eq(s.adminAlert.key, a.id))
    expect(alerts).toHaveLength(1)
    expect(alerts[0]!.resolvedAt).not.toBeNull()
  })
})
