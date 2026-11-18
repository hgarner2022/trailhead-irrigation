// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, readKey, writeKey } from "../../test-helpers"
import { customersGet } from "../customers/handlers"
import { passesSell } from "../passes/sell"
import { paymentsRecord } from "../payments/handlers"
import { visitsCancel, visitsCreate } from "../visits/office"
import { visitsMarkClosed } from "../visits/money"
import { linesAdd, linesCancel, linesUpdate } from "./handlers"

let db: TestDb
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
})
afterAll(() => db.close())

const as = (p = writeKey) => ctxFor(db, p, "2027-05-07T20:00:00Z")
let n = 0
const nextDay = () => new Date(Date.UTC(2027, 7, 2 + n++ + Math.floor(n / 5) * 2)).toISOString().slice(0, 10)
const install = () => callApi(as(), visitsCreate, { customerId: "c100", kind: "install", price: 0 })
const liveLines = async (jobId: string) => (await db.select().from(s.lineItem).where(eq(s.lineItem.jobId, jobId))).filter((l) => !l.cancelledAt)

describe("lines.add", () => {
  it("adds a free line to an open job and answers the new total; a service copies its name, description and taxable flag", async () => {
    const v = await install()
    const free = await callApi(as(), linesAdd, { jobId: v.jobId, name: "Rotors, 12", quantity: 12, unitPrice: 38 })
    expect(free).toMatchObject({ jobId: v.jobId, name: "Rotors, 12", quantity: 12, unitPrice: 38, taxable: false, visitId: null, cancelledAt: null, jobTotal: 456 })
    const withService = await callApi(as(), linesAdd, { jobId: v.jobId, serviceKey: "repair", unitPrice: 145 })
    const [service] = await db.select().from(s.service).where(eq(s.service.key, "repair"))
    expect(withService).toMatchObject({ name: service!.name, description: service!.description, taxable: service!.taxable, unitPrice: 145, jobTotal: 601 })
    const [row] = await db.select().from(s.lineItem).where(eq(s.lineItem.id, withService.id))
    expect(row!.serviceId).toBe(service!.id)
  })

  it("a price of 0 is a line to quote later and the job's total stays as it was", async () => {
    const v = await install()
    const line = await callApi(as(), linesAdd, { jobId: v.jobId, name: "Drip zone" })
    expect(line).toMatchObject({ unitPrice: 0, quantity: 1, jobTotal: 0 })
  })

  it("needs a name or a service, refuses a service that is not offered, and is for people who may write", async () => {
    const v = await install()
    await expect(callApi(as(), linesAdd, { jobId: v.jobId })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(as(), linesAdd, { jobId: v.jobId, serviceKey: "no-such-service" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(as(readKey), linesAdd, { jobId: v.jobId, name: "x" })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(as(), linesAdd, { jobId: "nope", name: "x" })).rejects.toMatchObject({ code: "not_found" })
  })

  it("is refused on a cancelled job, on a job paid in full and on a Season Pass", async () => {
    const gone = await callApi(as(), visitsCreate, { customerId: "c100", kind: "repair", price: 145 })
    await callApi(as(), visitsCancel, { id: gone.id })
    await expect(callApi(as(), linesAdd, { jobId: gone.jobId, name: "More" })).rejects.toMatchObject({ code: "unprocessable" })

    const paid = await callApi(as(), visitsCreate, { customerId: "c100", kind: "repair", price: 145, scheduledOn: nextDay() })
    await callApi(as(), paymentsRecord, { jobId: paid.jobId, visitId: paid.id, amount: 145, method: "check" })
    await expect(callApi(as(), linesAdd, { jobId: paid.jobId, name: "More" })).rejects.toMatchObject({ code: "conflict", message: "This job is paid in full, so its lines cannot change" })

    const pass = await callApi(as(), passesSell, { newCustomer: { firstName: "Lines", lastName: "Pass", email: "lines.pass@example.com", phone: "303-555-0188", property: { address: "9 Elm St", town: "Erie" } }, zones: 8, paysBy: "at-visit", termsAccepted: true })
    const jobs = (await callApi(as(), customersGet, { id: pass.customerId })).jobs
    await expect(callApi(as(), linesAdd, { jobId: jobs[0]!.id, name: "More" })).rejects.toMatchObject({ code: "unprocessable" })
  })
})

describe("lines.update and lines.cancel", () => {
  it("reprices and renames a live line, and a visit's own line keeps the visit's amount in step", async () => {
    const v = await callApi(as(), visitsCreate, { customerId: "c100", kind: "repair", price: 145 })
    const [own] = await liveLines(v.jobId)
    const out = await callApi(as(), linesUpdate, { id: own!.id, unitPrice: 160, quantity: 2, name: "Repair, two heads" })
    expect(out).toMatchObject({ name: "Repair, two heads", quantity: 2, unitPrice: 160, jobTotal: 320 })
    expect((await db.select().from(s.visit).where(eq(s.visit.id, v.id)))[0]!.amount).toBe(320)
    // nothing given changes nothing
    expect(await callApi(as(), linesUpdate, { id: own!.id })).toMatchObject({ unitPrice: 160, jobTotal: 320 })
  })

  it("cancels a line so it counts for nothing, and refuses to cancel or change it again", async () => {
    const v = await install()
    const a = await callApi(as(), linesAdd, { jobId: v.jobId, name: "Controller", unitPrice: 300 })
    const b = await callApi(as(), linesAdd, { jobId: v.jobId, name: "Valves", unitPrice: 120 })
    expect(b.jobTotal).toBe(420)
    const gone = await callApi(as(), linesCancel, { id: a.id })
    expect(gone).toMatchObject({ id: a.id, jobTotal: 120 })
    expect(gone.cancelledAt).not.toBeNull()
    await expect(callApi(as(), linesCancel, { id: a.id })).rejects.toMatchObject({ code: "conflict" })
    await expect(callApi(as(), linesUpdate, { id: a.id, unitPrice: 1 })).rejects.toMatchObject({ code: "unprocessable" })
  })

  it("refuses to change a line once its visit is done and paid, and a line on a job paid in full", async () => {
    const v = await callApi(as(), visitsCreate, { customerId: "c100", kind: "repair", price: 145, scheduledOn: nextDay() })
    const [own] = await liveLines(v.jobId)
    await callApi(as(adminKey), visitsMarkClosed, { id: v.id, paidBy: { method: "cash" } })
    await expect(callApi(as(), linesUpdate, { id: own!.id, unitPrice: 100 })).rejects.toMatchObject({ code: "conflict" })
    await expect(callApi(as(), linesCancel, { id: own!.id })).rejects.toMatchObject({ code: "conflict" })
  })

  it("a job that is only part paid can still be repriced", async () => {
    const v = await callApi(as(), visitsCreate, { customerId: "c100", kind: "repair", price: 145, scheduledOn: nextDay() })
    const [own] = await liveLines(v.jobId)
    await callApi(as(), paymentsRecord, { jobId: v.jobId, visitId: v.id, amount: 50, method: "cash" })
    expect(await callApi(as(), linesUpdate, { id: own!.id, unitPrice: 175 })).toMatchObject({ unitPrice: 175, jobTotal: 175 })
  })

  it("is for people who may write and stays inside the organization", async () => {
    const v = await install()
    const line = await callApi(as(), linesAdd, { jobId: v.jobId, name: "Sensor", unitPrice: 50 })
    await expect(callApi(as(readKey), linesUpdate, { id: line.id, unitPrice: 1 })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(as(readKey), linesCancel, { id: line.id })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(as(adminKey), linesUpdate, { id: "nope", unitPrice: 1 })).rejects.toMatchObject({ code: "not_found" })
  })
})
