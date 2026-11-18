// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import type { PublicPrincipal } from "@/lib/auth/types"
import { callApi } from "../../core/call"
import { apiDb, ctxFor, eventsOf, jobIdOfPassId, linesOfPass, ORG, passJobOf, passViewOf } from "../../test-helpers"
import { scheduleOfferDays } from "../schedule/handlers"
import { passesCreate } from "./handlers"

let db: TestDb
const NOW = "2027-11-02T17:00:00Z"
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  // The card on file is the customer's.
  const owner = (await passJobOf(db, "p1")).customerId
  await db.update(s.customer).set({ email: "p1@example.com", stripePaymentMethodId: "pm_old" }).where(eq(s.customer.id, owner))
})
afterAll(() => db.close())

const visitor = (renewPassId?: string): PublicPrincipal => ({ kind: "public", id: "checkout", organizationId: ORG, scopes: ["checkout"], ...(renewPassId ? { renewPassId } : {}) })
const answers = (over: Record<string, unknown> = {}) => ({
  customer: { firstName: "Andrea", lastName: "Anderson", email: "p1@example.com", phone: "3035550101" },
  property: { address: "5 Pine St", town: "Erie", state: "CO", zip: "80516" },
  zones: 6,
  consent: { termsAccepted: true as const, marketingOptIn: false, marketingChannels: [] },
  ...over,
})
const renew = (principal: PublicPrincipal, passId: string, over: Record<string, unknown> = {}) => callApi(ctxFor(db, principal, NOW), passesCreate, answers({ renewOf: passId, ...over }))

describe("passes.create with renewOf", () => {
  it("is refused to a visitor who has not been checked as that pass's customer", async () => {
    const before = (await db.select().from(s.event)).length
    await expect(renew(visitor(), "p1")).rejects.toMatchObject({ code: "forbidden" })
    await expect(renew(visitor("p2"), "p1")).rejects.toMatchObject({ code: "forbidden" })
    expect((await db.select().from(s.event)).length).toBe(before)
  })

  it("makes next season's pass active on the card on file, schedules the picked days and queues the confirmation", async () => {
    const offer = await callApi(ctxFor(db, visitor(), NOW), scheduleOfferDays, { town: "Erie", kind: "turn-on", season: 2028, zones: 6 })
    const pick = offer.days[1]!
    expect(pick.day.startsWith("2028-")).toBe(true)
    const pass = await renew(visitor("p1"), "p1", { days: [{ kind: "turn-on", day: pick.day, personId: pick.personId, start: pick.start }] })
    expect(pass).toMatchObject({ season: 2028, status: "active", cardLast4: "4242" })
    // the card is the customer's; the new pass is sold today (its job's sold day) and renews the old job
    expect((await passViewOf(db, pass.id)).stripePaymentMethodId).toBe("pm_old")
    expect(await passJobOf(db, pass.id)).toMatchObject({ soldOn: "2027-11-02", source: "renewal", renewsJobId: await jobIdOfPassId(db, "p1"), legacyPassId: null })
    expect(pass.visits.find((v) => v.kind === "turn-on")).toMatchObject({ status: "scheduled", scheduledOn: pick.day })
    expect(pass.visits.find((v) => v.kind === "blowout")).toMatchObject({ status: "unscheduled", scheduledOn: null })
    const mail = await db.select().from(s.messageLog).where(eq(s.messageLog.customerId, pass.customerId))
    expect(mail.find((m) => m.kind === "purchase-confirmation" && m.body.includes("Google Calendar:"))).toBeTruthy()
    expect(mail.find((m) => m.kind === "purchase-confirmation")!.body).toContain("Ryan sets the days that are missing")
    // One `job.sold` for the renewal, carrying the job it renews; the `pass.bought` webhook name and the activation add no second.
    const row = await passViewOf(db, pass.id)
    const old = await passViewOf(db, "p1")
    expect(await eventsOf(db, { kind: "job.sold", jobId: row.jobId })).toMatchObject([{ about: "job", aboutId: row.jobId, customerId: pass.customerId, who: "customer", detail: { source: "renewal", renewsJobId: old.jobId, passNumber: pass.number, season: 2028 } }])
    expect(await eventsOf(db, { kind: "consent", jobId: row.jobId })).toMatchObject([{ about: "job", who: "customer", detail: { source: "checkout", marketingOptIn: false } }])
    expect(await eventsOf(db, { kind: "visit.scheduled", jobId: row.jobId })).toMatchObject([{ who: "system", detail: { day: pick.day } }])
    const lines = await linesOfPass(db, pass.id)
    expect(lines.map((l) => [l.visitKind, l.unitPrice, l.serviceKey])).toEqual([["turn-on", 145, "turn-on-8"], ["blowout", 95, "blowout"]])
    expect(lines[0]!.visitId).toBe(pass.visits.find((v) => v.kind === "turn-on")!.id)
  })

  it("refuses a customer whose card was detached, with the same words, and renews again once a card is back", async () => {
    const owner = (await passJobOf(db, "p1")).customerId
    await db.update(s.customer).set({ stripePaymentMethodId: null, cardBrand: null, cardLast4: null, cardExpires: null }).where(eq(s.customer.id, owner))
    await expect(renew(visitor("p1"), "p1")).rejects.toMatchObject({ code: "unprocessable", message: expect.stringContaining("no card on file") })
    await db.update(s.customer).set({ stripePaymentMethodId: "pm_old", cardLast4: "4242" }).where(eq(s.customer.id, owner))
  })

  it("refuses a second reservation of the same season, a pass with no card on file, and a visitor who has not accepted the terms", async () => {
    await expect(renew(visitor("p1"), "p1")).rejects.toMatchObject({ code: "unprocessable", message: expect.stringContaining("already reserved") })
    const two = (await passJobOf(db, "p2")).customerId
    // A last four with no Stripe method is not a card.
    await db.update(s.customer).set({ stripePaymentMethodId: null }).where(eq(s.customer.id, two))
    await expect(renew(visitor("p2"), "p2")).rejects.toMatchObject({ code: "unprocessable", message: expect.stringContaining("no card on file") })
    await db.update(s.customer).set({ stripePaymentMethodId: "pm_two" }).where(eq(s.customer.id, two))
    await expect(callApi(ctxFor(db, visitor("p2"), NOW), passesCreate, answers({ renewOf: "p2", consent: undefined }))).rejects.toMatchObject({ code: "invalid" })
  })
})
