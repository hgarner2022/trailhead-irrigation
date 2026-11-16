// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, ORG, writeKey } from "../../test-helpers"
import { visitsGet, visitsMove } from "./handlers"
import { visitsMarkClosed, visitsRecordPayment } from "./money"
import { visitsCreate, visitsMarkNotDone } from "./office"

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
    await callApi(as(writeKey), visitsMove, { id: "p3-turn-on", truckId: "truck-1", scheduledOn: "2027-05-05" })
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

  it("undoes a recorded payment and the done", async () => {
    const v = await repair()
    await callApi(as(), visitsMarkClosed, { id: v.id, paidBy: { method: "cash" } })
    const back = await callApi(as(), visitsMarkClosed, { id: v.id, undo: true })
    expect(back).toMatchObject({ status: "scheduled", paymentStatus: "none", completedOn: null })
    expect(await db.select().from(s.charge).where(eq(s.charge.visitId, v.id))).toEqual([])
    await expect(callApi(as(), visitsMarkClosed, { id: v.id, undo: true })).rejects.toMatchObject({ code: "unprocessable" })
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

  it("keeps the reason a visit was not done until it has a day again", async () => {
    const v = await repair()
    const out = await callApi(as(writeKey), visitsMarkNotDone, { id: v.id, reason: "no-water" })
    expect(out.notDoneReason).toBe("no-water")
    const placed = await callApi(as(writeKey), visitsMove, { id: v.id, truckId: "truck-1", scheduledOn: "2027-05-12" })
    expect(placed.notDoneReason).toBeNull()
    expect(ORG).toBeTruthy()
  })
})
