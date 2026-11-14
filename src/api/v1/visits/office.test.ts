// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { alertsDismiss } from "../alerts/handlers"
import { customersGet } from "../customers/handlers"
import { messagesSend } from "../messages/handlers"
import { apiDb, ctxFor, ORG, readKey, writeKey } from "../../test-helpers"
import { visitsCancel, visitsCreate, visitsMarkNotDone, visitsUpdate } from "./office"
import { visitsMove } from "./handlers"

let db: TestDb
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  await db.update(s.customer).set({ phone: "+13035550111" }).where(eq(s.customer.id, "c100"))
})
afterAll(() => db.close())

const as = (p = writeKey) => ctxFor(db, p)
const create = (input: Record<string, unknown>, p = writeKey) => callApi(as(p), visitsCreate, input)
const count = async (t: typeof s.job | typeof s.customer | typeof s.visit) => (await db.select().from(t)).length

describe("visits.create", () => {
  it("makes the job and the visit, places it and texts the date", async () => {
    const out = await create({ customerId: "c100", kind: "repair", scheduledOn: "2027-05-05", price: 145, notes: "Zone 3 will not shut off" })
    expect(out).toMatchObject({ kind: "repair", status: "scheduled", scheduledOn: "2027-05-05", truckId: "truck-1", amount: 145, durationMinutes: 120, notes: "Zone 3 will not shut off", bookingId: null, passId: null })
    const [job] = await db.select().from(s.job).where(eq(s.job.id, out.jobId))
    expect(job).toMatchObject({ kind: "repair", source: "office", status: "active", price: 145, customerId: "c100" })
    const texts = (await db.select().from(s.messageLog)).filter((m) => m.visitId === out.id)
    expect(texts.map((m) => [m.kind, m.channel])).toEqual([["date-set", "sms"]])
  })
  it("with no day waits as Needs a day, minutes from the kind, price left blank", async () => {
    const out = await create({ newCustomer: { firstName: "nora", lastName: "ortiz", email: "Nora@Example.com", phone: "303-555-0177", property: { address: "9 Oak St", town: "Erie" } }, kind: "install" })
    expect(out).toMatchObject({ status: "unscheduled", scheduledOn: null, truckId: null, durationMinutes: 120, firstName: "Nora", amount: 0 })
    const [job] = await db.select().from(s.job).where(eq(s.job.id, out.jobId))
    expect(job).toMatchObject({ kind: "install", price: null })
  })
  it("a refused day leaves nothing behind, not even a new customer", async () => {
    const [jobs, customers, visits] = [await count(s.job), await count(s.customer), await count(s.visit)]
    await expect(create({ newCustomer: { firstName: "Gone", lastName: "Tester", property: { address: "1 Main St", town: "Erie" } }, kind: "repair", scheduledOn: "2027-05-02" })).rejects.toMatchObject({ code: "unprocessable", message: expect.stringMatching(/does not work on sundays/) })
    expect([await count(s.job), await count(s.customer), await count(s.visit)]).toEqual([jobs, customers, visits])
  })
  it("refuses a read key, both or neither customer, and a time with no day", async () => {
    await expect(create({ customerId: "c100", kind: "repair" }, readKey)).rejects.toMatchObject({ code: "forbidden" })
    await expect(create({ kind: "repair" })).rejects.toMatchObject({ code: "invalid" })
    await expect(create({ customerId: "c100", kind: "repair", startTime: "09:00" })).rejects.toMatchObject({ code: "invalid" })
    await expect(create({ customerId: "nope", kind: "repair" })).rejects.toMatchObject({ code: "not_found" })
  })
  it("lists the job with its visits on customers.get", async () => {
    const got = await callApi(as(), customersGet, { id: "c100" })
    expect(got.jobs.some((j) => j.kind === "repair" && j.source === "office" && j.visits.length === 1)).toBe(true)
  })
})

describe("visits.markNotDone", () => {
  it("sends a scheduled visit back to Needs a day and keeps the reason", async () => {
    const v = await create({ customerId: "c100", kind: "repair", scheduledOn: "2027-05-06" })
    await expect(callApi(as(), visitsMarkNotDone, { id: v.id, reason: "other" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(as(readKey), visitsMarkNotDone, { id: v.id, reason: "no-water" })).rejects.toMatchObject({ code: "forbidden" })
    const out = await callApi(as(), visitsMarkNotDone, { id: v.id, reason: "no-water" })
    expect(out).toMatchObject({ status: "unscheduled", scheduledOn: null, truckId: null })
    const changes = await db.select().from(s.passChange).where(eq(s.passChange.visitId, v.id))
    expect(changes.find((c) => c.kind === "not-done")?.detail).toMatchObject({ reason: "no-water", day: "2027-05-06" })
    await expect(callApi(as(), visitsMarkNotDone, { id: v.id, reason: "no-water" })).rejects.toMatchObject({ code: "unprocessable" })
  })
})

describe("visits.update", () => {
  it("changes minutes and notes, clears notes, and writes a change row", async () => {
    const v = await create({ customerId: "c100", kind: "repair", scheduledOn: "2027-05-07" })
    const out = await callApi(as(), visitsUpdate, { id: v.id, durationMinutes: 180, notes: "Bring a valve" })
    expect(out).toMatchObject({ durationMinutes: 180, notes: "Bring a valve" })
    expect(await callApi(as(), visitsUpdate, { id: v.id, notes: "" })).toMatchObject({ notes: null })
    expect((await db.select().from(s.passChange).where(eq(s.passChange.visitId, v.id))).some((c) => c.kind === "visit-edited")).toBe(true)
    await expect(callApi(as(), visitsUpdate, { id: v.id, durationMinutes: 50 })).rejects.toMatchObject({ code: "invalid" })
  })
  it("sets a pass's access note from its visit, and refuses one on a one-off visit", async () => {
    const one = await create({ customerId: "c100", kind: "repair" })
    await expect(callApi(as(), visitsUpdate, { id: one.id, accessNote: "Gate 1234" })).rejects.toMatchObject({ code: "unprocessable" })
    await callApi(as(), visitsUpdate, { id: "p3-turn-on", accessNote: "Gate 1234" })
    const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, "p3"))
    expect(pass!.accessNote).toBe("Gate 1234")
  })
  it("refuses a truck that does not work the day, and a truck for a visit with no day", async () => {
    const none = await create({ customerId: "c100", kind: "repair" })
    await expect(callApi(as(), visitsUpdate, { id: none.id, truckId: "truck-2" })).rejects.toMatchObject({ code: "unprocessable" })
    const dated = await create({ customerId: "c100", kind: "repair", scheduledOn: "2027-05-11" })
    await expect(callApi(as(), visitsUpdate, { id: dated.id, truckId: "nope" })).rejects.toMatchObject({ code: "not_found" })
    await expect(callApi(as(readKey), visitsUpdate, { id: none.id, notes: "x" })).rejects.toMatchObject({ code: "forbidden" })
  })
})

describe("visits.cancel", () => {
  it("cancels one pass visit, keeps the others, drops its price and does not make a pending charge", async () => {
    await callApi(as(), visitsMove, { id: "p4-blowout", truckId: "truck-1", scheduledOn: "2027-10-12" })
    await db.insert(s.queueItem).values({ organizationId: ORG, kind: "pass-charge", key: "p4-blowout", payload: { visitId: "p4-blowout" } })
    const [passRow] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, "p4"))
    const before = (await db.select().from(s.job).where(eq(s.job.id, passRow!.jobId)))[0]!.price!
    const out = await callApi(as(), visitsCancel, { id: "p4-blowout", reason: "Moving" })
    expect(out).toMatchObject({ status: "cancelled", scheduledOn: null, truckId: null })
    const rest = await db.select().from(s.visit).where(eq(s.visit.passId, "p4"))
    expect(rest.filter((v) => v.status !== "cancelled").length).toBeGreaterThan(0)
    expect((await db.select().from(s.job).where(eq(s.job.id, passRow!.jobId)))[0]!.price!).toBeLessThan(before)
    expect((await db.select().from(s.queueItem).where(eq(s.queueItem.key, "p4-blowout")))[0]).toMatchObject({ status: "done", lastError: "visit cancelled" })
    await expect(callApi(as(), visitsCancel, { id: "p4-blowout" })).rejects.toMatchObject({ code: "unprocessable" })
  })
  it("cancels a one-off visit and its job", async () => {
    const v = await create({ customerId: "c100", kind: "repair", scheduledOn: "2027-05-10" })
    await callApi(as(), visitsCancel, { id: v.id })
    expect((await db.select().from(s.job).where(eq(s.job.id, v.jobId)))[0]).toMatchObject({ status: "cancelled" })
    await expect(callApi(as(readKey), visitsCancel, { id: v.id })).rejects.toMatchObject({ code: "forbidden" })
  })
})

describe("alerts.dismiss", () => {
  it("resolves a stored alert, records a worked-out row as dismissed, and is safe twice", async () => {
    await db.insert(s.adminAlert).values({ organizationId: ORG, kind: "new-pass", key: "a1", message: "New pass" })
    await callApi(as(), alertsDismiss, { kind: "new-pass", key: "a1" })
    await callApi(as(), alertsDismiss, { kind: "charge-failed", key: "p1@2027-05-01" })
    await callApi(as(), alertsDismiss, { kind: "charge-failed", key: "p1@2027-05-01" })
    const rows = await db.select().from(s.adminAlert)
    expect(rows.filter((r) => r.resolvedAt).map((r) => `${r.kind}:${r.key}`).sort()).toEqual(["charge-failed:p1@2027-05-01", "new-pass:a1"])
    await expect(callApi(as(readKey), alertsDismiss, { kind: "x", key: "y" })).rejects.toMatchObject({ code: "forbidden" })
  })
})

describe("messages.send kind note", () => {
  it("queues a text with the opt-out line, and refuses with the reason in words", async () => {
    const out = await callApi(as(), messagesSend, { customerId: "c100", kind: "note", text: "Running 20 minutes late." })
    expect(out).toMatchObject({ channel: "sms", kind: "note", status: "queued" })
    expect(out.body).toBe("Trailhead: Running 20 minutes late. Reply STOP to opt out.")
    await expect(callApi(as(), messagesSend, { customerId: "c100", kind: "note" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(as(), messagesSend, { customerId: "c100", kind: "note", text: "x".repeat(321) })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(as(readKey), messagesSend, { customerId: "c100", kind: "note", text: "Hi" })).rejects.toMatchObject({ code: "forbidden" })
    await db.insert(s.customer).values({ id: "c-nophone", organizationId: ORG, firstName: "Quiet" })
    await expect(callApi(as(), messagesSend, { customerId: "c-nophone", kind: "note", text: "Hi" })).rejects.toThrow(/no mobile number/)
    await db.insert(s.consent).values({ organizationId: ORG, customerId: "c100", source: "reply", note: "STOP" })
    await expect(callApi(as(), messagesSend, { customerId: "c100", kind: "note", text: "Hi" })).rejects.toThrow(/replied STOP/)
  })
})
