// @vitest-environment node
import { NO_TAX } from "@/lib/jobs/tax"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { and, eq, isNull, sql } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "../../core/call"
import { adminKey, apiDb, ctxFor, customerPerson, eventsOf, jobIdOfPassId, linesOfPass, passJobOf, passViewOf, readKey, writeKey } from "../../test-helpers"
import { jobTotal } from "@/lib/jobs/lines"
import { customersGet } from "../customers/handlers"
import { SERVICES } from "@/lib/services"
import {
  passesActivate, passesAddInspection, passesCancel, passesCreate, passesGet, passesList, passesResendConfirmation,
  passesSendCardUpdateLink, passesSkipVisit, passesUpdatePreference,
} from "./handlers"
import { completeSession, stubStripe } from "@/lib/stripe/test-stripe"

const { getStripe } = vi.hoisted(() => ({ getStripe: vi.fn() }))
vi.mock("@/lib/stripe/client", async (original) => ({ ...(await original<typeof import("@/lib/stripe/client")>()), getStripe }))

let db: TestDb
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
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
    expect(pass.number).toBe("TH-2027-0014")
    expect(pass.visits.map((v) => [v.kind, v.amount, v.window, v.status])).toEqual([["turn-on", 145, "May", "unscheduled"], ["blowout", 115, "October", "unscheduled"]])
    expect(pass.consent).toMatchObject({ termsVersion: "2026-11", marketingOptIn: false, source: "checkout" })
    expect(pass.customer?.email).toBe("maya@example.com")
  })
  it("writes the consent it records as a consent event about the pass's job, by the customer, and none when no consent is given", async () => {
    const pass = await create({ customer: { firstName: "Cora", lastName: "Event", email: "cora@example.com" }, consent: { termsAccepted: true, marketingOptIn: true, marketingChannels: ["email"], source: "checkout" } })
    const row = await passViewOf(db, pass.id)
    expect(await eventsOf(db, { kind: "consent", jobId: row.jobId })).toMatchObject([{ about: "job", aboutId: row.jobId, customerId: pass.customerId, who: "api", detail: { marketingOptIn: true, marketingChannels: ["email"], source: "checkout" } }])
    expect(await eventsOf(db, { jobId: row.jobId, kind: "job.sold" })).toEqual([])
  })
  it("makes the pass's job: its id is the pass id, a season and a number, no sold day yet, the visits point at it and its price is the total", async () => {
    const pass = await create({ customer: { firstName: "Jobby", lastName: "Tester", email: "jobby@example.com" } })
    const [job] = await db.select().from(s.job).where(eq(s.job.id, pass.id))
    expect(job).toMatchObject({ source: "checkout", season: 2027, passNumber: pass.number, soldOn: null, legacyPassId: null, customerId: pass.customerId })
    const visits = await db.select().from(s.visit).where(eq(s.visit.jobId, job!.id))
    expect(visits).toHaveLength(2)
    expect(visits.every((v) => v.jobId === job!.id)).toBe(true)
  })
  it("makes three visits with the inspection add-on", async () => {
    const pass = await create({ inspection: true, customer: { firstName: "Jo", lastName: "Tester", email: "jo@example.com" }, zones: 6 })
    expect(pass.visits.map((v) => [v.kind, v.amount])).toEqual([["turn-on", 145], ["inspection", 145], ["blowout", 95]])
    expect(pass.price).toBe(385)
  })
  it("sells only the visits still on sale mid-season", async () => {
    const pass = await create({ inspection: true, customer: { firstName: "Late", lastName: "Tester", email: "late@example.com" } }, "2027-06-15T17:00:00Z")
    expect(pass.season).toBe(2027)
    expect(pass.visits.map((v) => v.kind)).toEqual(["inspection", "blowout"])
    await expect(create({ customer: { firstName: "Gone", lastName: "Tester", email: "gone@example.com" } }, "2027-11-10T17:00:00Z")).resolves.toMatchObject({ season: 2028 })
  })
  it("refuses a blowout-less moment and bad input: out-of-area town, zones, missing terms", async () => {
    await expect(create({ property: { address: "1 Main St", town: "Denver" } })).rejects.toMatchObject({ code: "invalid" })
    await expect(create({ zones: 4 })).rejects.toMatchObject({ code: "invalid" })
    await expect(create({ zones: 20 })).rejects.toMatchObject({ code: "invalid" })
    await expect(create({ consent: { termsAccepted: false } })).rejects.toMatchObject({ code: "invalid" })
    await expect(create({ customer: { firstName: "X", lastName: "Tester", email: "bad" } })).rejects.toMatchObject({ code: "invalid" })
  })
  it("records needs_customer_home and the access note as a note for Ryan, and holds no visit back", async () => {
    const pass = await create({ needsCustomerHome: true, accessNote: "Gate code 4411", customer: { firstName: "Home", lastName: "Tester", email: "home@example.com" } })
    expect(pass).toMatchObject({ needsCustomerHome: true, accessNote: "Gate code 4411" })
    expect(pass.visits.some((v) => v.awaitingPick)).toBe(false)
  })
  it("reuses a customer by email and keeps one property", async () => {
    const again = await create({ customer: { firstName: "Maya", lastName: "Tester", email: "MAYA@example.com" } })
    const first = await create({ customer: { firstName: "Maya", lastName: "Tester", email: "maya@example.com" } })
    expect(again.customerId).toBe(first.customerId)
    expect(again.propertyId).toBe(first.propertyId)
  })
  it("is idempotent on an Idempotency-Key and needs the write scope", async () => {
    const ctx = { ...ctxFor(db, writeKey, WINTER), idempotencyKey: "pass-1" }
    const input = body({ customer: { firstName: "Key", lastName: "Tester", email: "key@example.com" } })
    const a = await callApi(ctx, passesCreate, input)
    const b = await callApi(ctx, passesCreate, input)
    expect(b.id).toBe(a.id)
    await expect(callApi(ctxFor(db, readKey, WINTER), passesCreate, body())).rejects.toMatchObject({ code: "forbidden" })
  })
})

describe("passes.create's lines", () => {
  it("writes the lines beside the visits, and rebuilds them when the held pending pass's answers change", async () => {
    const who = { firstName: "Lines", lastName: "Tester", email: "lines@example.com", phone: "303-555-0150" }
    const first = await create({ customer: who })
    expect((await linesOfPass(db, first.id)).map((l) => [l.visitKind, l.unitPrice, l.serviceKey])).toEqual([["turn-on", 145, "turn-on-8"], ["blowout", 115, "blowout"]])
    const again = await create({ passId: first.id, zones: 12, inspection: true, customer: who })
    expect(again.id).toBe(first.id)
    const lines = await linesOfPass(db, first.id)
    expect(lines.map((l) => [l.visitKind, l.unitPrice, l.serviceKey, l.visitStatus])).toEqual([["turn-on", 185, "turn-on-12", "unscheduled"], ["inspection", 185, "inspection-12", "unscheduled"], ["blowout", 155, "blowout", "unscheduled"]])
    expect(lines.map((l) => l.visitId).sort()).toEqual(again.visits.map((v) => v.id).sort())
  })
})

describe("passes.list and passes.get", () => {
  it("leaks no email, access note, address or Stripe id to a read key", async () => {
    await create({ accessNote: "Gate code 9999", customer: { firstName: "Leak", lastName: "Tester", email: "leak@example.com" } })
    const list = JSON.stringify(await callApi(ctxFor(db, readKey), passesList, { limit: 100 }))
    for (const secret of ["leak@example.com", "Gate code 9999", "stripe", "Elm St", "email"]) expect(list.toLowerCase()).not.toContain(secret.toLowerCase())
    const [leak] = (await db.select().from(s.customer).where(eq(s.customer.email, "leak@example.com")))
    const [pass] = await db.select().from(s.job).where(eq(s.job.customerId, leak!.id))
    const detail = JSON.stringify(await callApi(ctxFor(db, readKey), passesGet, { id: pass!.id }))
    for (const secret of ["leak@example.com", "Gate code 9999", "Elm St"]) expect(detail).not.toContain(secret)
    expect(JSON.stringify(await callApi(ctxFor(db, writeKey), passesGet, { id: pass!.id }))).toContain("leak@example.com")
  })
  it("filters by season, status, town and preference", async () => {
    expect((await callApi(ctxFor(db, readKey), passesList, { season: 2027, status: "cancelled" })).data.map((p) => p.number)).toEqual(["TH-2027-0009"])
    const erie = await callApi(ctxFor(db, readKey), passesList, { town: "Erie", season: 2027, limit: 100 })
    expect(erie.data.every((p) => p.town === "Erie")).toBe(true)
    // The season is the job's: moving a pass job to another season moves the pass in the list.
    const row = await passJobOf(db, "p3")
    await db.update(s.job).set({ season: 2099 }).where(eq(s.job.id, row.id))
    expect((await callApi(ctxFor(db, readKey), passesList, { season: 2099 })).data.map((p) => [p.id, p.season])).toEqual([[row.id, 2099]])
    await db.update(s.job).set({ season: row.season }).where(eq(s.job.id, row.id))
    expect((await callApi(ctxFor(db, readKey), passesList, { preference: "later", limit: 100 })).data.every((p) => p.turnOnPreference === "later" || p.blowoutPreference === "later")).toBe(true)
    await expect(callApi(ctxFor(db, readKey), passesList, { town: "Boulder" })).rejects.toMatchObject({ code: "invalid" })
  })
  it("reads status from the job: sold and canceled are the job's own days, a past season reads lapsed", async () => {
    const row = await passJobOf(db, "p3")
    const jobId = row.id
    const statusOf = async (id: string) => (await callApi(ctxFor(db, readKey), passesGet, { id })).status
    expect(await statusOf(jobId)).toBe("active")
    // cancelled on the job alone: `cancelled_at` is the whole fact
    await db.update(s.job).set({ cancelledAt: new Date("2027-03-01T12:00:00Z") }).where(eq(s.job.id, jobId))
    expect(await statusOf(jobId)).toBe("cancelled")
    expect((await callApi(ctxFor(db, readKey), passesList, { status: "cancelled", limit: 100 })).data.map((p) => p.id)).toContain(jobId)
    expect((await callApi(ctxFor(db, readKey), passesList, { status: "active", limit: 100 })).data.map((p) => p.id)).not.toContain(jobId)
    expect((await callApi(ctxFor(db, readKey), passesGet, { id: jobId })).cancelledAt).toBe("2027-03-01T12:00:00.000Z")
    await db.update(s.job).set({ cancelledAt: null }).where(eq(s.job.id, jobId))
    expect(await statusOf(jobId)).toBe("active")
    // a season before the current one reads lapsed, in the list filter too
    await db.update(s.job).set({ season: 2025 }).where(eq(s.job.id, jobId))
    expect(await statusOf(jobId)).toBe("lapsed")
    expect((await callApi(ctxFor(db, readKey), passesList, { status: "lapsed", limit: 100 })).data.map((p) => p.id)).toContain(jobId)
    expect((await callApi(ctxFor(db, readKey), passesList, { status: "active", limit: 100 })).data.map((p) => p.id)).not.toContain(jobId)
    await db.update(s.job).set({ season: row.season }).where(eq(s.job.id, jobId))
    // a job with no sold day reads pending, and the list filter agrees
    await db.update(s.job).set({ soldOn: null }).where(eq(s.job.id, jobId))
    expect(await statusOf(jobId)).toBe("pending")
    expect((await callApi(ctxFor(db, readKey), passesList, { status: "pending", limit: 100 })).data.map((p) => p.id)).toContain(jobId)
    await db.update(s.job).set({ soldOn: row.soldOn }).where(eq(s.job.id, jobId))
  })
  it("opens a pass by the old pass id its job kept, and says the job's id", async () => {
    const jobId = await jobIdOfPassId(db, "p3")
    expect(jobId).not.toBe("p3")
    expect(await callApi(ctxFor(db, readKey), passesGet, { id: "p3" })).toMatchObject({ id: jobId, number: (await passJobOf(db, "p3")).passNumber })
    expect(await callApi(ctxFor(db, readKey), passesGet, { id: jobId })).toMatchObject({ id: jobId })
    // visits of the pass say its job id as their pass id
    expect((await callApi(ctxFor(db, readKey), passesGet, { id: "p3" })).visits.every((v) => v.passId === jobId)).toBe(true)
  })
  it("does not find another organization's pass or a job with no season by any id", async () => {
    const [repair] = await db.select().from(s.job).where(isNull(s.job.season)).limit(1)
    if (repair) await expect(callApi(ctxFor(db, readKey), passesGet, { id: repair.id })).rejects.toMatchObject({ code: "not_found" })
    await expect(callApi(ctxFor(db, readKey), passesGet, { id: "no-such-pass" })).rejects.toMatchObject({ code: "not_found" })
  })
  it("reads the preferences from the visits and the inspection from the lines", async () => {
    const row = await passJobOf(db, "p3")
    await db.update(s.visit).set({ preference: "later" }).where(and(eq(s.visit.jobId, row.id), eq(s.visit.kind, "blowout")))
    const had = (await callApi(ctxFor(db, readKey), passesGet, { id: "p3" })).inspection
    const out = await callApi(ctxFor(db, readKey), passesGet, { id: "p3" })
    expect(out.blowoutPreference).toBe("later")
    expect(out.inspection).toBe(had)
    expect((await callApi(ctxFor(db, readKey), passesList, { preference: "later", limit: 100 })).data.map((p) => p.id)).toContain(row.id)
    // the line is the fact: flip it and the pass follows
    const [line] = await db.select().from(s.lineItem).where(and(eq(s.lineItem.jobId, row.id), eq(s.lineItem.name, had ? "Mid-season inspection" : "Spring turn-on")))
    await db.update(s.lineItem).set(had ? { cancelledAt: new Date() } : { name: "Mid-season inspection" }).where(eq(s.lineItem.id, line!.id))
    expect((await callApi(ctxFor(db, readKey), passesGet, { id: "p3" })).inspection).toBe(!had)
    await db.update(s.lineItem).set({ name: line!.name, cancelledAt: line!.cancelledAt }).where(eq(s.lineItem.id, line!.id))
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
    const jobId = await jobIdOfPassId(db, "p1")
    // an old pass id cancels the job, and the answer says the job's id
    const out = await callApi(ctxFor(db, writeKey), passesCancel, { id: "p1", reason: "moving" })
    expect(out).toEqual({ id: jobId, status: "cancelled", cancelledVisits: 2 })
    expect((await passJobOf(db, "p1")).cancelledAt).not.toBeNull()
    const visits = await db.select().from(s.visit).where(eq(s.visit.jobId, jobId))
    expect(visits.map((v) => v.status).sort()).toEqual(["cancelled", "cancelled", "completed"])
    expect(await callApi(ctxFor(db, writeKey), passesCancel, { id: "p1" })).toMatchObject({ cancelledVisits: 0 })
    const lines = await linesOfPass(db, "p1")
    expect(lines.map((l) => [l.visitStatus, l.cancelledAt !== null]).sort()).toEqual([["cancelled", true], ["cancelled", true], ["completed", false]])
    // One event for the one action: the emitted webhook name does not make a second.
    const p1 = await passViewOf(db, "p1")
    expect(await eventsOf(db, { kind: "pass.cancelled", jobId: p1.jobId })).toMatchObject([{ about: "job", aboutId: p1.jobId, customerId: p1.customerId, who: "api", detail: { reason: "moving", visits: 2 } }])
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
    const pass = await passViewOf(db, "p3")
    expect(pass.turnOnPreference).toBe("earlier")
    const [visit] = await db.select().from(s.visit).where(eq(s.visit.id, "p3-turn-on"))
    expect(visit!.preference).toBe("earlier")
    expect(await eventsOf(db, { kind: "pass.preference-changed", jobId: pass.jobId })).toMatchObject([{ about: "job", aboutId: pass.jobId, customerId: "c140", visitId: "p3-turn-on", who: "customer", detail: { visit: "turn-on", to: "earlier" } }])
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
    const seeded = await passViewOf(db, "p4")
    expect(out).toMatchObject({ inspection: true, amount: 145 + Math.max(0, (seeded.zones ?? 0) - 8) * 10 })
    await expect(callApi(ctxFor(db, customerPerson("c167"), "2027-06-01T17:00:00Z"), passesAddInspection, { id: "p4" })).rejects.toMatchObject({ code: "conflict" })
    expect((await passViewOf(db, "p4")).inspection).toBe(true)
    const line = (await linesOfPass(db, "p4")).find((l) => l.visitKind === "inspection")
    expect(line).toMatchObject({ visitId: out.visitId, name: "Mid-season inspection", unitPrice: out.amount, serviceKey: expect.stringMatching(/^inspection-(8|12|16)$/), taxable: false, cancelledAt: null })
    expect(line!.description).toBe(SERVICES[line!.serviceKey!]!.description)
    expect(await eventsOf(db, { kind: "pass.inspection-added", jobId: seeded.jobId })).toMatchObject([{ about: "job", aboutId: seeded.jobId, customerId: "c167", visitId: out.visitId, who: "customer", detail: { amount: out.amount } }])
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
    await db.update(s.visit).set({ status: "scheduled", scheduledOn: "2027-05-10", personId: "person_truck-1" }).where(eq(s.visit.id, "p6-turn-on"))
    await callApi(ctxFor(db, writeKey), passesSkipVisit, { id: "p6", kind: "turn-on" })
    const [visit] = await db.select().from(s.visit).where(eq(s.visit.id, "p6-turn-on"))
    expect(visit).toMatchObject({ status: "skipped", scheduledOn: null, personId: null })
    const lines = await linesOfPass(db, "p6")
    expect(lines.filter((l) => l.cancelledAt).map((l) => l.visitKind).sort()).toEqual(["blowout", "turn-on"])
    expect(await eventsOf(db, { kind: "visit.skipped", visitId: "p6-blowout" })).toMatchObject([{ about: "visit", aboutId: "p6-blowout", customerId: "c104", who: "customer", detail: { name: "Fall blowout", visit: "blowout" } }])
    expect(await eventsOf(db, { kind: "visit.skipped", visitId: "p6-turn-on" })).toMatchObject([{ who: "api", detail: { name: "Spring turn-on" } }])
  })
  it("takes the skipped visit's line out of the job's total and price", async () => {
    const pass = await create({ customer: { firstName: "Skip", lastName: "Tester", email: "skip@example.com", phone: "303-555-0151" }, inspection: true })
    const priceOf = async () => (await callApi(ctxFor(db, writeKey), customersGet, { id: (await db.select().from(s.job).where(eq(s.job.id, pass.id)))[0]!.customerId })).jobs.find((j) => j.id === pass.id)!.price
    expect(await priceOf()).toBe(jobTotal(await linesOfPass(db, pass.id), NO_TAX))
    await callApi(ctxFor(db, writeKey), passesSkipVisit, { id: pass.id, kind: "inspection" })
    const lines = await linesOfPass(db, pass.id)
    expect(lines.map((l) => [l.visitKind, l.cancelledAt instanceof Date])).toEqual([["turn-on", false], ["inspection", true], ["blowout", false]])
    expect(jobTotal(lines, NO_TAX)).toBe(145 + 115)
    // the job's price is its lines' total: there is no price column to say otherwise
    expect(await priceOf()).toBe(145 + 115)
  })
  it("refuses a completed visit and a customer on another pass", async () => {
    await expect(callApi(ctxFor(db, writeKey), passesSkipVisit, { id: "p1", kind: "turn-on" })).rejects.toMatchObject({ code: "unprocessable" })
    await expect(callApi(ctxFor(db, customerPerson("c104")), passesSkipVisit, { id: "p7", kind: "blowout" })).rejects.toMatchObject({ code: "forbidden" })
    expect(await eventsOf(db, { kind: "visit.skipped", visitId: "p1-turn-on" })).toEqual([])
    expect(await eventsOf(db, { kind: "visit.skipped", visitId: "p7-blowout" })).toEqual([])
  })
})

describe("passes.resendConfirmation", () => {
  it("queues the purchase confirmation again, each call its own message, with the scope enforced", async () => {
    vi.stubEnv("APP_URL", "https://www.example.com")
    const p1 = await passViewOf(db, "p1")
    await db.update(s.customer).set({ email: "resend@example.com" }).where(eq(s.customer.id, p1.customerId))
    const before = (await db.select().from(s.messageLog).where(eq(s.messageLog.kind, "purchase-confirmation"))).length
    await callApi(ctxFor(db, writeKey), passesResendConfirmation, { id: "p1" })
    await callApi(ctxFor(db, writeKey), passesResendConfirmation, { id: "p1" })
    expect((await db.select().from(s.messageLog).where(eq(s.messageLog.kind, "purchase-confirmation"))).length).toBe(before + 2)
    await expect(callApi(ctxFor(db, readKey), passesResendConfirmation, { id: "p1" })).rejects.toMatchObject({ code: "forbidden" })
  })
})

describe("passes.activate and passes.sendCardUpdateLink (Stripe stubbed)", () => {
  const fresh = (email: string) => create({ customer: { firstName: "Stripe", lastName: "Tester", email } })
  it("activates a pending pass from a finished setup session, once", async () => {
    vi.stubEnv("APP_URL", "https://site.test")
    const pass = await fresh("activate@example.com")
    const stub = stubStripe({ sessions: { cs_a: completeSession("cs_a", { purpose: "pass-setup", passId: pass.id }, { last4: "4242", customer: "cus_act" }) } })
    getStripe.mockReturnValue(stub.stripe)
    const active = await callApi(ctxFor(db, writeKey), passesActivate, { id: pass.id, setupSessionId: "cs_a" })
    expect(active).toMatchObject({ status: "active" })
    await callApi(ctxFor(db, writeKey), passesActivate, { id: pass.id, setupSessionId: "cs_a" })
    expect(stub.calls.customersUpdate).toHaveBeenCalledTimes(1)
    const [c] = await db.select().from(s.customer).where(eq(s.customer.id, pass.customer!.id))
    expect(c!.stripeCustomerId).toBe("cus_act")
    await expect(callApi(ctxFor(db, readKey), passesActivate, { id: pass.id, setupSessionId: "cs_a" })).rejects.toMatchObject({ code: "forbidden" })
    // The checkout's sale is written once, by activation (not again by the second call), with the card the customer saved.
    const row = await passViewOf(db, pass.id)
    expect(row.soldOn).toBe("2027-04-20")
    expect(await eventsOf(db, { kind: "job.sold", jobId: row.jobId })).toMatchObject([{ about: "job", aboutId: row.jobId, customerId: pass.customerId, who: "api", detail: { source: "website", name: "Season Pass", passNumber: pass.number } }])
    expect(await eventsOf(db, { kind: "card.saved", customerId: pass.customerId })).toMatchObject([{ about: "customer", aboutId: pass.customerId, who: "api", detail: { brand: "visa", last4: "4242" } }])
    expect(await eventsOf(db, { kind: "pass.bought", jobId: row.jobId })).toEqual([])
  })
  it("leaves the legacy columns empty on the migrated database: a pending pass job keeps a null sold day (migration 0021's insert trigger needs a kind, which nothing writes now), and activation sets it", async () => {
    vi.stubEnv("APP_URL", "https://site.test")
    const raw = async (id: string) => (await db.execute(sql`select "kind", "sold_on" from "job" where "id" = ${id}`)).rows[0]
    const pass = await fresh("legacy-cols@example.com")
    // Created by the checkout code: no kind, no sold day, and no season_pass row behind it.
    expect(await raw(pass.id)).toMatchObject({ kind: null, sold_on: null })
    expect((await db.execute(sql`select count(*)::int as n from "season_pass" where "job_id" = ${pass.id}`)).rows[0]).toMatchObject({ n: 0 })
    const stub = stubStripe({ sessions: { cs_l: completeSession("cs_l", { purpose: "pass-setup", passId: pass.id }, { last4: "4242", customer: "cus_leg" }) } })
    getStripe.mockReturnValue(stub.stripe)
    await callApi(ctxFor(db, writeKey), passesActivate, { id: pass.id, setupSessionId: "cs_l" })
    // Sold: the day is set by the activation itself, and the kind is still null.
    expect(await raw(pass.id)).toMatchObject({ kind: null, sold_on: "2027-04-20" })
  })
  it("queues a card-update email with a fresh link", async () => {
    const pass = await fresh("link@example.com")
    await db.update(s.customer).set({ stripeCustomerId: "cus_link" }).where(eq(s.customer.id, pass.customer!.id))
    const stub = stubStripe()
    getStripe.mockReturnValue(stub.stripe)
    vi.stubEnv("APP_URL", "https://site.test")
    await expect(callApi(ctxFor(db, writeKey), passesSendCardUpdateLink, { id: pass.id })).resolves.toEqual({ ok: true })
    const rows = await db.select().from(s.messageLog).where(eq(s.messageLog.customerId, pass.customer!.id))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ kind: "card-failed", status: "queued" })
    expect(rows[0]!.body).toContain("https://checkout.stripe.test/c/pay")
  })
})
