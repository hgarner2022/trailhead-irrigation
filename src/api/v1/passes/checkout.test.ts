// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import type { PublicPrincipal } from "@/lib/auth/types"
import { expirePendingPasses } from "@/lib/pass/server/create"
import { completeSession, stubStripe } from "@/lib/stripe/test-stripe"
import { callApi } from "../../core/call"
import { apiDb, ctxFor, ORG } from "../../test-helpers"
import { bookingsCreate } from "../bookings/handlers"
import { scheduleSlots } from "../schedule/handlers"
import { passesActivate, passesCreate, passesList } from "./handlers"

const { getStripe, reachable } = vi.hoisted(() => ({ getStripe: vi.fn(), reachable: vi.fn() }))
vi.mock("@/lib/stripe/client", async (original) => ({ ...(await original<typeof import("@/lib/stripe/client")>()), getStripe }))
vi.mock("@/lib/pass/server/create", async (original) => ({ ...(await original<typeof import("@/lib/pass/server/create")>()), emailDomainReachable: reachable }))

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
  vi.stubEnv("APP_URL", "https://site.test")
})
afterAll(() => db.close())

const visitor = (passId?: string): PublicPrincipal => ({ kind: "public", id: "checkout", organizationId: ORG, scopes: ["checkout"], ...(passId ? { passId } : {}) })
const NOW = "2026-12-01T17:00:00Z"
const fields = (over: Record<string, unknown> = {}) => ({
  customer: { firstName: "Dana", email: "dana@example.com", phone: "(303) 555-0101" },
  property: { address: "5 Pine St", town: "Erie", state: "CO", zip: "80516" },
  zones: 8,
  ...over,
})
const create = (over: Record<string, unknown> = {}, principal = visitor(), now = NOW) => callApi(ctxFor(db, principal, now), passesCreate, fields(over))

describe("the public checkout principal", () => {
  it("is refused on every handler except the four checkout ones", async () => {
    reachable.mockResolvedValue(true)
    await expect(callApi(ctxFor(db, visitor(), NOW), passesList, {})).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, visitor(), NOW), scheduleSlots, { service: "turn-on-8", town: "Erie" })).resolves.toHaveProperty("data")
    await expect(callApi(ctxFor(db, visitor(), NOW), bookingsCreate, {})).rejects.toMatchObject({ code: "invalid" })
    await expect(create()).resolves.toMatchObject({ status: "pending" })
  })
  it("activates only its own pass, and never sees the contact details or the access note", async () => {
    reachable.mockResolvedValue(true)
    const pass = await create({ customer: { firstName: "Own", email: "own@example.com", phone: "3035550102" }, accessNote: "gate 12" })
    expect(pass.customer).toBeUndefined()
    expect(pass.accessNote).toBeUndefined()
    const other = await create({ customer: { firstName: "Other", email: "other@example.com", phone: "3035550103" } })
    const input = { id: pass.id, setupSessionId: "cs_x" }
    await expect(callApi(ctxFor(db, visitor(), NOW), passesActivate, input)).rejects.toMatchObject({ code: "forbidden" })
    await expect(callApi(ctxFor(db, visitor(other.id), NOW), passesActivate, input)).rejects.toMatchObject({ code: "forbidden" })
  })
})

describe("passes.create for the checkout", () => {
  it("holds one pending pass per email: a second call with its passId updates it", async () => {
    reachable.mockResolvedValue(true)
    const first = await create({ customer: { firstName: "Back", email: "back@example.com", phone: "3035550104" } })
    const again = await create({ passId: first.id, zones: 12, inspection: true, customer: { firstName: "Back", email: "back@example.com", phone: "3035550104" } })
    expect(again.id).toBe(first.id)
    expect(again.number).toBe(first.number)
    expect(again).toMatchObject({ zones: 12, inspection: true })
    expect(again.visits.map((v) => v.kind)).toEqual(["turn-on", "inspection", "blowout"])
    const rows = await db.select().from(s.visit).where(eq(s.visit.passId, first.id))
    expect(rows).toHaveLength(3)
  })
  it("resumes the same pending pass when the customer comes back without its id, so submit, submit, submit makes one pass", async () => {
    reachable.mockResolvedValue(true)
    const body = { customer: { firstName: "Many", email: "many@example.com", phone: "3035550105" } }
    const first = await create(body)
    const second = await create({ ...body, zones: 10 })
    const third = await create({ ...body, zones: 12 })
    expect(second.id).toBe(first.id)
    expect(third.id).toBe(first.id)
    expect(third.zones).toBe(12)
    const rows = await db.select().from(s.seasonPass).where(eq(s.seasonPass.customerId, (await db.select().from(s.customer).where(eq(s.customer.email, "many@example.com")))[0]!.id))
    expect(rows).toHaveLength(1)
    // an hour later the old one is not resumed and a fresh pending pass starts
    await db.update(s.seasonPass).set({ createdAt: new Date("2026-11-30T00:00:00Z") }).where(eq(s.seasonPass.id, first.id))
    const later = await create(body)
    expect(later.id).not.toBe(first.id)
  })
  it("refuses an address outside the six towns, a missing phone and an unreachable email", async () => {
    reachable.mockResolvedValue(true)
    await expect(create({ property: { address: "9 Elm", town: "Erie", state: "CO", zip: "80516" }, customer: { firstName: "No", email: "nophone@example.com" } })).rejects.toMatchObject({ code: "invalid", issues: [{ message: "contact" }] })
    reachable.mockResolvedValue(false)
    await expect(create({ customer: { firstName: "Bad", email: "bad@nowhere.test", phone: "3035550106" } })).rejects.toMatchObject({ issues: [{ path: "reason", message: "email-unreachable" }] })
  })
  it("does not hold an admin key to the checkout's rules", async () => {
    const { writeKey } = await import("../../test-helpers")
    await expect(callApi(ctxFor(db, writeKey, NOW), passesCreate, fields({ customer: { firstName: "Admin", email: "admin-made@example.com" } }))).resolves.toMatchObject({ status: "pending" })
  })
})

describe("passes.activate for the checkout", () => {
  it("appends the consent once, queues pass-onboard and the confirmation, and a repeat adds nothing", async () => {
    reachable.mockResolvedValue(true)
    const pass = await create({ customer: { firstName: "Cora", email: "cora@example.com", phone: "3035550107" } })
    getStripe.mockReturnValue(stubStripe({ sessions: { cs_c: completeSession("cs_c", { purpose: "pass-setup", passId: pass.id }, { customer: "cus_cora" }) } }).stripe)
    const input = { id: pass.id, setupSessionId: "cs_c", consent: { termsAccepted: true, marketingOptIn: true, marketingChannels: ["email", "sms"] } }
    const active = await callApi(ctxFor(db, visitor(pass.id), NOW), passesActivate, input)
    expect(active).toMatchObject({ status: "active", cardLast4: "4242" })
    expect(active.consent).toMatchObject({ termsVersion: "2026-11", marketingOptIn: true, marketingChannels: ["email", "sms"], source: "checkout" })
    await callApi(ctxFor(db, visitor(pass.id), NOW), passesActivate, input)
    const consents = await db.select().from(s.consent).where(eq(s.consent.customerId, pass.customerId))
    expect(consents).toHaveLength(1)
    const queue = await db.select().from(s.queueItem).where(eq(s.queueItem.key, pass.id))
    expect(queue.map((q) => [q.kind, q.status])).toEqual([["pass-onboard", "pending"]])
    const mail = await db.select().from(s.messageLog).where(eq(s.messageLog.customerId, pass.customerId))
    expect(mail).toHaveLength(1)
    expect(mail[0]).toMatchObject({ kind: "purchase-confirmation", status: "queued", to: "cora@example.com" })
    expect(mail[0]!.body).toContain("https://site.test/account/pass")
  })
  it("drops the text channel when the customer has no phone", async () => {
    reachable.mockResolvedValue(true)
    const { writeKey } = await import("../../test-helpers")
    const pass = await callApi(ctxFor(db, writeKey, NOW), passesCreate, fields({ customer: { firstName: "Nora", email: "nora@example.com" } }))
    getStripe.mockReturnValue(stubStripe({ sessions: { cs_n: completeSession("cs_n", { purpose: "pass-setup", passId: pass.id }) } }).stripe)
    const active = await callApi(ctxFor(db, visitor(pass.id), NOW), passesActivate, { id: pass.id, setupSessionId: "cs_n", consent: { termsAccepted: true, marketingOptIn: true, marketingChannels: ["email", "sms"] } })
    expect(active.consent).toMatchObject({ marketingChannels: ["email"] })
  })
})

describe("expirePendingPasses", () => {
  it("removes pending passes older than an hour with their visits and keeps active and recent ones", async () => {
    reachable.mockResolvedValue(true)
    const old = await create({ customer: { firstName: "Old", email: "old@example.com", phone: "3035550108" } })
    const fresh = await create({ customer: { firstName: "Fresh", email: "fresh@example.com", phone: "3035550109" } })
    await db.update(s.seasonPass).set({ createdAt: new Date(Date.now() - 61 * 60_000) }).where(eq(s.seasonPass.id, old.id))
    const removed = await expirePendingPasses(db, new Date())
    expect(removed).toBeGreaterThanOrEqual(1)
    expect(await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, old.id))).toHaveLength(0)
    expect(await db.select().from(s.visit).where(eq(s.visit.passId, old.id))).toHaveLength(0)
    expect(await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, fresh.id))).toHaveLength(1)
    const actives = await db.select().from(s.seasonPass).where(eq(s.seasonPass.status, "active"))
    expect(actives.length).toBeGreaterThan(0)
  })
})
