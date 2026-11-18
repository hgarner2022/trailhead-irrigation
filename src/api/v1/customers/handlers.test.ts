// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { recordEvent } from "@/lib/events/record"
import { adminKey, apiDb, ctxFor, customerPerson, eventsOf, ORG, owner, passJobOf, readKey, writeKey } from "../../test-helpers"
import { consentsList, consentsRecord, customersCreate, customersGet, customersList, customersUpdate } from "./handlers"

let db: TestDb
let id: string
beforeAll(async () => {
  db = await apiDb()
  const created = await callApi(ctxFor(db, writeKey), customersCreate, {
    firstName: "Maya", lastName: "Ortiz", email: "maya@example.com", phone: "303-555-0142", property: { address: "12 Elm St", town: "Erie" },
  })
  id = created.id
})
afterAll(() => db.close())

describe("customers", () => {
  it("creates with a property and shows the contact to a writer", async () => {
    const got = await callApi(ctxFor(db, writeKey), customersGet, { id })
    expect(got).toMatchObject({ firstName: "Maya", email: "maya@example.com", properties: [{ town: "Erie", address: "12 Elm St" }], consent: null })
    // Adding a customer is a `customer.edited` about the customer, naming what was set.
    expect(await eventsOf(db, { kind: "customer.edited", aboutId: id })).toMatchObject([{ about: "customer", customerId: id, who: "api", detail: { created: true, changed: { firstName: { from: null, to: "Maya" }, email: { to: "maya@example.com" } } } }])
  })
  it("serves the card on file, null when there is none", async () => {
    expect((await callApi(ctxFor(db, writeKey), customersGet, { id })).card).toBeNull()
    await db.update(s.customer).set({ stripePaymentMethodId: "pm_1", cardBrand: "visa", cardLast4: "4242", cardExpires: "2028-08", cardFailedAt: new Date("2027-04-19T10:00:00Z") }).where(eq(s.customer.id, id))
    expect((await callApi(ctxFor(db, readKey), customersGet, { id })).card).toEqual({ brand: "visa", last4: "4242", expires: "2028-08", failedAt: "2027-04-19T10:00:00.000Z" })
    await db.update(s.customer).set({ stripePaymentMethodId: null, cardBrand: null, cardLast4: null, cardExpires: null, cardFailedAt: null }).where(eq(s.customer.id, id))
    expect((await callApi(ctxFor(db, writeKey), customersGet, { id })).card).toBeNull()
  })
  it("gives each job its lines and their total", async () => {
    const [v] = await db.select().from(s.visit).where(eq(s.visit.id, "p1-turn-on"))
    const got = await callApi(ctxFor(db, readKey), customersGet, { id: v!.customerId })
    const job = got.jobs.find((j) => j.id === v!.jobId)!
    expect(job.lines.length).toBeGreaterThan(1)
    expect(job.lines.find((l) => l.visitId === "p1-turn-on")).toMatchObject({ name: "Spring turn-on" })
    expect(job.total).toBe(job.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0))
  })
  it("reads a pass job's number from the job, and its pass id is the job's id", async () => {
    const [v] = await db.select().from(s.visit).where(eq(s.visit.id, "p1-turn-on"))
    const job = await passJobOf(db, "p1")
    const read = async () => (await callApi(ctxFor(db, readKey), customersGet, { id: v!.customerId })).jobs.find((j) => j.id === v!.jobId)!
    expect(await read()).toMatchObject({ passId: job.id, passNumber: job.passNumber, status: "active" })
    await db.update(s.job).set({ passNumber: "TH-2027-7777" }).where(eq(s.job.id, v!.jobId))
    expect(await read()).toMatchObject({ passId: job.id, passNumber: "TH-2027-7777" })
    await db.update(s.job).set({ passNumber: job.passNumber }).where(eq(s.job.id, v!.jobId))
    // a job that is not a Season Pass has no pass id
    const [other] = await db.select().from(s.job).where(eq(s.job.kind, "repair")).limit(1)
    if (other) expect((await callApi(ctxFor(db, readKey), customersGet, { id: other.customerId })).jobs.find((j) => j.id === other.id)).toMatchObject({ passId: null })
  })
  it("rejects a bad email, a missing name and a bad town", async () => {
    await expect(callApi(ctxFor(db, writeKey), customersCreate, { firstName: "A", email: "nope" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, writeKey), customersCreate, { email: "a@b.co" })).rejects.toMatchObject({ code: "invalid" })
    await expect(callApi(ctxFor(db, writeKey), customersCreate, { firstName: "A", property: { address: "1 Main St", town: "Denver" } })).rejects.toMatchObject({ code: "invalid" })
  })
  it("refuses a read key the write calls", async () => {
    await expect(callApi(ctxFor(db, readKey), customersCreate, { firstName: "X" })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, readKey), customersUpdate, { id, firstName: "X" })).rejects.toMatchObject({ code: "forbidden" })
  })
  it("leaks no email, phone or address to a read key, on the list or the detail", async () => {
    const list = await callApi(ctxFor(db, readKey), customersList, { limit: 100 })
    const text = JSON.stringify(list)
    expect(text).not.toContain("maya@example.com")
    expect(text).not.toContain("303-555-0142")
    expect(text).not.toContain("email")
    const detail = JSON.stringify(await callApi(ctxFor(db, readKey), customersGet, { id }))
    expect(detail).not.toContain("12 Elm St")
    expect(detail).not.toContain("maya@example.com")
    expect(JSON.stringify(await callApi(ctxFor(db, owner), customersList, { limit: 100 }))).toContain("maya@example.com")
  })
  it("searches names for everyone and emails only for a writer", async () => {
    expect((await callApi(ctxFor(db, readKey), customersList, { q: "ortiz" })).data.map((c) => c.id)).toEqual([id])
    expect((await callApi(ctxFor(db, readKey), customersList, { q: "maya@example" })).data).toEqual([])
    expect((await callApi(ctxFor(db, writeKey), customersList, { q: "maya@example" })).data.map((c) => c.id)).toEqual([id])
  })
  it("pages with a cursor", async () => {
    const first = await callApi(ctxFor(db, readKey), customersList, { limit: 5 })
    expect(first.data).toHaveLength(5)
    expect(first.next_cursor).toBeTruthy()
    const second = await callApi(ctxFor(db, readKey), customersList, { limit: 5, cursor: first.next_cursor! })
    expect(second.data.map((c) => c.id)).not.toContain(first.data[0]!.id)
  })
  it("says what is next: scheduled, to schedule, or none", async () => {
    const list = await callApi(ctxFor(db, readKey), customersList, { limit: 100 })
    const andrea = list.data.find((c) => c.id === "c100")!
    expect(andrea.hasPass).toBe(true)
    expect(andrea.next.state).toBe("to-schedule")
    expect(list.data.find((c) => c.id === id)!.next).toEqual({ state: "none" })
  })
  it("updates one field and keeps the rest", async () => {
    const out = await callApi(ctxFor(db, writeKey), customersUpdate, { id, phone: "720-555-0100" })
    // stored in one standard form, whatever was typed
    expect(out).toMatchObject({ firstName: "Maya", phone: "+17205550100" })
    await expect(callApi(ctxFor(db, writeKey), customersUpdate, { id: "nope", phone: "720-555-0100" })).rejects.toMatchObject({ code: "not_found" })
    const edits = await eventsOf(db, { kind: "customer.edited", aboutId: id })
    expect(edits).toHaveLength(2)
    expect(edits[1]).toMatchObject({ about: "customer", customerId: id, who: "api", detail: { changed: { phone: { from: "+13035550142", to: "+17205550100" } } } })
    expect(Object.keys((edits[1]!.detail as { changed: object }).changed)).toEqual(["phone"])
    // Saying what is already there, or a rejected call, writes nothing.
    await callApi(ctxFor(db, owner), customersUpdate, { id, phone: "720-555-0100", firstName: "Maya" })
    await expect(callApi(ctxFor(db, readKey), customersUpdate, { id, firstName: "No" })).rejects.toMatchObject({ code: "forbidden" })
    expect(await eventsOf(db, { kind: "customer.edited", aboutId: id })).toHaveLength(2)
    await callApi(ctxFor(db, owner), customersUpdate, { id, lastName: "Ortiz-Vega" })
    expect((await eventsOf(db, { kind: "customer.edited", aboutId: id }))[2]).toMatchObject({ who: "owner@example.com", detail: { changed: { lastName: { from: "Ortiz", to: "Ortiz-Vega" } } } })
  })
  it("honours an Idempotency-Key on create", async () => {
    const ctx = { ...ctxFor(db, writeKey), idempotencyKey: "cust-1" }
    const a = await callApi(ctx, customersCreate, { firstName: "Once" })
    const b = await callApi(ctx, customersCreate, { firstName: "Once" })
    expect(b.id).toBe(a.id)
  })
})

describe("consents", () => {
  it("appends, and the newest record is the current state", async () => {
    await callApi(ctxFor(db, writeKey), consentsRecord, { id, termsAccepted: true, marketingOptIn: false, source: "checkout" })
    await callApi(ctxFor(db, writeKey, "2027-04-21T15:00:00Z"), consentsRecord, { id, marketingOptIn: true, marketingChannels: ["email"], source: "admin", note: "asked on the phone" })
    const history = await callApi(ctxFor(db, readKey), consentsList, { id })
    expect(history.data).toHaveLength(2)
    expect(history.data[0]).toMatchObject({ marketingOptIn: true, marketingChannels: ["email"], termsAcceptedAt: null })
    expect(history.data[1]).toMatchObject({ termsVersion: "2026-11", marketingOptIn: false })
    expect((await callApi(ctxFor(db, readKey), customersGet, { id })).consent).toMatchObject({ marketingOptIn: true })
    expect(await eventsOf(db, { kind: "consent", customerId: id })).toMatchObject([
      { about: "customer", aboutId: id, jobId: null, who: "api", detail: { marketingOptIn: false, source: "checkout" } },
      { about: "customer", aboutId: id, who: "api", detail: { marketingOptIn: true, marketingChannels: ["email"], source: "admin" } },
    ])
  })
  it("needs the write scope and a known source", async () => {
    await expect(callApi(ctxFor(db, readKey), consentsRecord, { id, source: "admin" })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, adminKey), consentsRecord, { id, source: "carrier-pigeon" })).rejects.toMatchObject({ code: "invalid" })
    expect(await eventsOf(db, { kind: "consent", customerId: id })).toHaveLength(2)
  })
  it("keeps customers out of the customer list calls", async () => {
    await expect(callApi(ctxFor(db, customerPerson(id)), customersList, {})).rejects.toMatchObject({ code: "forbidden" })
  })
})

describe("customers.get events", () => {
  it("carries the customer's newest 50 events, newest first, and each job's newest 10", async () => {
    const [v] = await db.select().from(s.visit).where(eq(s.visit.id, "p1-turn-on"))
    const { customerId, jobId } = v!
    for (let i = 0; i < 55; i++) await recordEvent(db, { organizationId: ORG, about: "job", aboutId: jobId, customerId, jobId, kind: "note", detail: { text: `note ${i}` }, who: "system", at: new Date(Date.UTC(2027, 5, 1, 12, i)) })
    await recordEvent(db, { organizationId: ORG, about: "payment", aboutId: "pay-x", customerId, jobId, kind: "payment.succeeded", detail: { amount: 145, method: "cash" }, who: "system", at: new Date(Date.UTC(2027, 4, 1)) })
    const got = await callApi(ctxFor(db, writeKey), customersGet, { id: customerId })
    expect(got.events).toHaveLength(50)
    expect(got.events[0]!.detail).toEqual({ text: "note 54" })
    expect(got.events.map((e) => e.at)).toEqual([...got.events.map((e) => e.at)].sort().reverse())
    const job = got.jobs.find((j) => j.id === jobId)!
    expect(job.events).toHaveLength(10)
    expect(job.events[0]!.detail).toEqual({ text: "note 54" })
    // a read key reads them as a tech does: the money event is not theirs
    const read = await callApi(ctxFor(db, readKey), customersGet, { id: customerId })
    expect(read.events.map((e) => e.kind)).not.toContain("payment.succeeded")
  })
  it("has the creation of a new customer in its story and no jobs", async () => {
    const got = await callApi(ctxFor(db, writeKey), customersGet, { id })
    expect(got.events.map((e) => e.kind)).toContain("customer.edited")
    expect(got.jobs).toEqual([])
  })
})
