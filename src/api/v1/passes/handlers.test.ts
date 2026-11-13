// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, customerPerson, readKey, writeKey } from "../../test-helpers"
import {
  passesActivate, passesAddInspection, passesCancel, passesCreate, passesGet, passesList, passesResendConfirmation,
  passesSendCardUpdateLink, passesSkipVisit, passesUpdatePreference,
} from "./handlers"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
})
afterAll(() => db.close())

const body = (over: Record<string, unknown> = {}) => ({
  customer: { firstName: "Maya", lastName: "Ortiz", email: "Maya@Example.com", phone: "303-555-0142" },
  property: { address: "12 Elm St", town: "Erie" },
  zones: 8,
  consent: { termsAccepted: true, marketingOptIn: false },
  ...over,
})
const WINTER = "2026-12-01T17:00:00Z" // season 2027, every visit on sale
const create = (over: Record<string, unknown> = {}, now = WINTER, principal = writeKey) => callApi(ctxFor(db, principal, now), passesCreate, body(over))

describe("passes.create", () => {
  it("makes the two visits with the right amounts, the consent and the next pass number", async () => {
    const pass = await create()
    expect(pass).toMatchObject({ season: 2027, status: "pending", zones: 8, inspection: false, price: 145 + 95 + 20 })
    expect(pass.number).toBe("TH-2027-0013")
    expect(pass.visits.map((v) => [v.kind, v.amount, v.window, v.status])).toEqual([["turn-on", 145, "May", "unscheduled"], ["blowout", 115, "October", "unscheduled"]])
    expect(pass.consent).toMatchObject({ termsVersion: "2026-11", marketingOptIn: false, source: "checkout" })
    expect(pass.customer?.email).toBe("maya@example.com")
  })
  it("makes three visits with the inspection add-on", async () => {
    const pass = await create({ inspection: true, customer: { firstName: "Jo", email: "jo@example.com" }, zones: 6 })
    expect(pass.visits.map((v) => [v.kind, v.amount])).toEqual([["turn-on", 145], ["inspection", 145], ["blowout", 95]])
    expect(pass.price).toBe(385)
  })
  it("sells only the visits still on sale mid-season", async () => {
    const pass = await create({ inspection: true, customer: { firstName: "Late", email: "late@example.com" } }, "2027-06-15T17:00:00Z")
    expect(pass.season).toBe(2027)
    expect(pass.visits.map((v) => v.kind)).toEqual(["inspection", "blowout"])
    await expect(create({ customer: { firstName: "Gone", email: "gone@example.com" } }, "2027-11-10T17:00:00Z")).resolves.toMatchObject({ season: 2028 })
  })
  it("refuses a blowout-less moment and bad input: out-of-area town, zones, missing terms", async () => {
    await expect(create({ property: { address: "1 Main St", town: "Denver" } })).rejects.toMatchObject({ code: "invalid" })
    await expect(create({ zones: 4 })).rejects.toMatchObject({ code: "invalid" })
    await expect(create({ zones: 20 })).rejects.toMatchObject({ code: "invalid" })
    await expect(create({ consent: { termsAccepted: false } })).rejects.toMatchObject({ code: "invalid" })
    await expect(create({ customer: { firstName: "X", email: "bad" } })).rejects.toMatchObject({ code: "invalid" })
  })
  it("records needs_customer_home and the access note, and marks the visits awaiting a pick", async () => {
    const pass = await create({ needsCustomerHome: true, accessNote: "Gate code 4411", customer: { firstName: "Home", email: "home@example.com" } })
    expect(pass).toMatchObject({ needsCustomerHome: true, accessNote: "Gate code 4411" })
    expect(pass.visits.every((v) => v.awaitingPick)).toBe(true)
  })
  it("reuses a customer by email and keeps one property", async () => {
    const again = await create({ customer: { firstName: "Maya", email: "MAYA@example.com" } })
    const first = await create({ customer: { firstName: "Maya", email: "maya@example.com" } })
    expect(again.customerId).toBe(first.customerId)
    expect(again.propertyId).toBe(first.propertyId)
  })
  it("is idempotent on an Idempotency-Key and needs the write scope", async () => {
    const ctx = { ...ctxFor(db, writeKey, WINTER), idempotencyKey: "pass-1" }
    const input = body({ customer: { firstName: "Key", email: "key@example.com" } })
    const a = await callApi(ctx, passesCreate, input)
    const b = await callApi(ctx, passesCreate, input)
    expect(b.id).toBe(a.id)
    await expect(callApi(ctxFor(db, readKey, WINTER), passesCreate, body())).rejects.toMatchObject({ code: "forbidden" })
  })
})

describe("passes.list and passes.get", () => {
  it("leaks no email, access note, address or Stripe id to a read key", async () => {
    await create({ accessNote: "Gate code 9999", customer: { firstName: "Leak", email: "leak@example.com" } })
    const list = JSON.stringify(await callApi(ctxFor(db, readKey), passesList, { limit: 100 }))
    for (const secret of ["leak@example.com", "Gate code 9999", "stripe", "Elm St", "email"]) expect(list.toLowerCase()).not.toContain(secret.toLowerCase())
    const [leak] = (await db.select().from(s.customer).where(eq(s.customer.email, "leak@example.com")))
    const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.customerId, leak!.id))
    const detail = JSON.stringify(await callApi(ctxFor(db, readKey), passesGet, { id: pass!.id }))
    for (const secret of ["leak@example.com", "Gate code 9999", "Elm St"]) expect(detail).not.toContain(secret)
    expect(JSON.stringify(await callApi(ctxFor(db, writeKey), passesGet, { id: pass!.id }))).toContain("leak@example.com")
  })
  it("filters by season, status, town and preference", async () => {
    expect((await callApi(ctxFor(db, readKey), passesList, { season: 2027, status: "cancelled" })).data.map((p) => p.number)).toEqual(["TH-2027-0009"])
    const erie = await callApi(ctxFor(db, readKey), passesList, { town: "Erie", season: 2027, limit: 100 })
    expect(erie.data.every((p) => p.town === "Erie")).toBe(true)
    expect((await callApi(ctxFor(db, readKey), passesList, { preference: "later", limit: 100 })).data.every((p) => p.turnOnPreference === "later" || p.blowoutPreference === "later")).toBe(true)
    await expect(callApi(ctxFor(db, readKey), passesList, { town: "Boulder" })).rejects.toMatchObject({ code: "invalid" })
  })
  it("gives a customer only their own pass", async () => {
    await expect(callApi(ctxFor(db, customerPerson("c100")), passesGet, { id: "p1" })).resolves.toMatchObject({ number: "TH-2027-0001" })
    await expect(callApi(ctxFor(db, customerPerson("c100")), passesGet, { id: "p2" })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, readKey), passesGet, { id: "missing" })).rejects.toMatchObject({ code: "not_found" })
  })
})

describe("passes.cancel", () => {
  it("is refused to a read key and cancels the unstarted visits only", async () => {
    await expect(callApi(ctxFor(db, readKey), passesCancel, { id: "p1" })).rejects.toMatchObject({ code: "forbidden", status: 403 })
    const out = await callApi(ctxFor(db, writeKey), passesCancel, { id: "p1", reason: "moving" })
    expect(out).toEqual({ id: "p1", status: "cancelled", cancelledVisits: 2 })
    const visits = await db.select().from(s.visit).where(eq(s.visit.passId, "p1"))
    expect(visits.map((v) => v.status).sort()).toEqual(["cancelled", "cancelled", "completed"])
    expect(await callApi(ctxFor(db, writeKey), passesCancel, { id: "p1" })).toMatchObject({ cancelledVisits: 0 })
    expect(await db.select().from(s.passChange).where(eq(s.passChange.passId, "p1"))).toHaveLength(1)
  })
  it("lets a customer cancel their own pass and no one else's", async () => {
    await expect(callApi(ctxFor(db, customerPerson("c121")), passesCancel, { id: "p3" })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, customerPerson("c121")), passesCancel, { id: "p2" })).resolves.toMatchObject({ status: "cancelled" })
  })
})

describe("passes.updatePreference", () => {
  it("lets a customer change it before the window opens and logs the change", async () => {
    const out = await callApi(ctxFor(db, customerPerson("c140"), "2027-02-01T17:00:00Z"), passesUpdatePreference, { id: "p3", kind: "turn-on", preference: "earlier" })
    expect(out.preference).toBe("earlier")
    const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, "p3"))
    expect(pass!.turnOnPreference).toBe("earlier")
    const [visit] = await db.select().from(s.visit).where(eq(s.visit.id, "p3-turn-on"))
    expect(visit!.preference).toBe("earlier")
    expect(await db.select().from(s.passChange).where(eq(s.passChange.passId, "p3"))).toHaveLength(1)
  })
  it("refuses a customer once the window has opened or the visit has a day, but not an admin", async () => {
    await expect(callApi(ctxFor(db, customerPerson("c140"), "2027-05-01T17:00:00Z"), passesUpdatePreference, { id: "p3", kind: "turn-on", preference: "later" })).rejects.toMatchObject({ code: "unprocessable" })
    await expect(callApi(ctxFor(db, writeKey, "2027-05-01T17:00:00Z"), passesUpdatePreference, { id: "p3", kind: "turn-on", preference: "later" })).resolves.toMatchObject({ preference: "later" })
    await expect(callApi(ctxFor(db, readKey), passesUpdatePreference, { id: "p3", kind: "turn-on", preference: "later" })).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, writeKey), passesUpdatePreference, { id: "p3", kind: "inspection", preference: "later" })).rejects.toMatchObject({ code: "invalid" })
  })
})

describe("passes.addInspection", () => {
  it("adds the July visit before July 1 and refuses a second time", async () => {
    const out = await callApi(ctxFor(db, customerPerson("c167"), "2027-06-01T17:00:00Z"), passesAddInspection, { id: "p4" })
    const [seeded] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, "p4"))
    expect(out).toMatchObject({ inspection: true, amount: 145 + Math.max(0, seeded!.zones - 8) * 10 })
    await expect(callApi(ctxFor(db, customerPerson("c167"), "2027-06-01T17:00:00Z"), passesAddInspection, { id: "p4" })).rejects.toMatchObject({ code: "conflict" })
    const [pass] = await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, "p4"))
    expect(pass!.inspection).toBe(true)
  })
  it("refuses a customer on July 1 but lets an admin while July is open", async () => {
    await expect(callApi(ctxFor(db, customerPerson("c197"), "2027-07-01T17:00:00Z"), passesAddInspection, { id: "p5" })).rejects.toMatchObject({ code: "unprocessable" })
    await expect(callApi(ctxFor(db, adminKey, "2027-07-01T17:00:00Z"), passesAddInspection, { id: "p5" })).resolves.toMatchObject({ inspection: true })
    await expect(callApi(ctxFor(db, readKey), passesAddInspection, { id: "p6" })).rejects.toMatchObject({ code: "forbidden" })
  })
})

describe("passes.skipVisit", () => {
  it("skips an unscheduled visit and frees a scheduled one", async () => {
    expect(await callApi(ctxFor(db, customerPerson("c104")), passesSkipVisit, { id: "p6", kind: "blowout" })).toMatchObject({ status: "skipped" })
    await db.update(s.visit).set({ status: "scheduled", scheduledOn: "2027-05-10", truckId: "truck-1" }).where(eq(s.visit.id, "p6-turn-on"))
    await callApi(ctxFor(db, writeKey), passesSkipVisit, { id: "p6", kind: "turn-on" })
    const [visit] = await db.select().from(s.visit).where(eq(s.visit.id, "p6-turn-on"))
    expect(visit).toMatchObject({ status: "skipped", scheduledOn: null, truckId: null })
  })
  it("refuses a completed visit and a customer on another pass", async () => {
    await expect(callApi(ctxFor(db, writeKey), passesSkipVisit, { id: "p1", kind: "turn-on" })).rejects.toMatchObject({ code: "unprocessable" })
    await expect(callApi(ctxFor(db, customerPerson("c104")), passesSkipVisit, { id: "p7", kind: "blowout" })).rejects.toMatchObject({ code: "forbidden" })
  })
})

describe("stubs", () => {
  it("answers not_implemented for the Stripe and messaging calls, with the scope still enforced", async () => {
    await expect(callApi(ctxFor(db, writeKey), passesActivate, { id: "p1", setupSessionId: "cs_1" })).rejects.toMatchObject({ code: "not_implemented", status: 501 })
    await expect(callApi(ctxFor(db, writeKey), passesResendConfirmation, { id: "p1" })).rejects.toMatchObject({ code: "not_implemented" })
    await expect(callApi(ctxFor(db, writeKey), passesSendCardUpdateLink, { id: "p1" })).rejects.toMatchObject({ code: "not_implemented" })
    await expect(callApi(ctxFor(db, readKey), passesActivate, { id: "p1", setupSessionId: "cs_1" })).rejects.toMatchObject({ code: "forbidden" })
  })
})
