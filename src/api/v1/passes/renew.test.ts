// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import type { PublicPrincipal } from "@/lib/auth/types"
import { callApi } from "../../core/call"
import { apiDb, ctxFor, ORG } from "../../test-helpers"
import { scheduleOfferDays } from "../schedule/handlers"
import { passesCreate } from "./handlers"

let db: TestDb
const NOW = "2027-11-02T17:00:00Z"
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  await db.update(s.seasonPass).set({ stripePaymentMethodId: "pm_old" }).where(eq(s.seasonPass.id, "p1"))
  await db.update(s.customer).set({ email: "p1@example.com" }).where(eq(s.customer.id, (await db.select().from(s.seasonPass).where(eq(s.seasonPass.id, "p1")))[0]!.customerId))
})
afterAll(() => db.close())

const visitor = (renewPassId?: string): PublicPrincipal => ({ kind: "public", id: "checkout", organizationId: ORG, scopes: ["checkout"], ...(renewPassId ? { renewPassId } : {}) })
const answers = (over: Record<string, unknown> = {}) => ({
  customer: { firstName: "Andrea", email: "p1@example.com", phone: "3035550101" },
  property: { address: "5 Pine St", town: "Erie", state: "CO", zip: "80516" },
  zones: 6,
  consent: { termsAccepted: true as const, marketingOptIn: false, marketingChannels: [] },
  ...over,
})
const renew = (principal: PublicPrincipal, passId: string, over: Record<string, unknown> = {}) => callApi(ctxFor(db, principal, NOW), passesCreate, answers({ renewOf: passId, ...over }))

describe("passes.create with renewOf", () => {
  it("is refused to a visitor who has not been checked as that pass's customer", async () => {
    await expect(renew(visitor(), "p1")).rejects.toMatchObject({ code: "forbidden" })
    await expect(renew(visitor("p2"), "p1")).rejects.toMatchObject({ code: "forbidden" })
  })

  it("makes next season's pass active on the card on file, schedules the picked days and queues the confirmation", async () => {
    const offer = await callApi(ctxFor(db, visitor(), NOW), scheduleOfferDays, { town: "Erie", kind: "turn-on", season: 2028, zones: 6 })
    const pick = offer.days[1]!
    expect(pick.day.startsWith("2028-")).toBe(true)
    const pass = await renew(visitor("p1"), "p1", { days: [{ kind: "turn-on", day: pick.day, truckId: pick.truckId, start: pick.start }] })
    expect(pass).toMatchObject({ season: 2028, status: "active", cardLast4: "4242" })
    expect(pass.visits.find((v) => v.kind === "turn-on")).toMatchObject({ status: "scheduled", scheduledOn: pick.day })
    expect(pass.visits.find((v) => v.kind === "blowout")).toMatchObject({ status: "unscheduled", scheduledOn: null })
    const mail = await db.select().from(s.messageLog).where(eq(s.messageLog.customerId, pass.customerId))
    expect(mail.find((m) => m.kind === "purchase-confirmation" && m.body.includes("Google Calendar:"))).toBeTruthy()
    expect(mail.find((m) => m.kind === "purchase-confirmation")!.body).toContain("Ryan sets the days that are missing")
    expect((await db.select().from(s.passChange).where(eq(s.passChange.passId, pass.id))).map((c) => c.kind)).toContain("renewed")
  })

  it("refuses a second reservation of the same season, a pass with no card on file, and a visitor who has not accepted the terms", async () => {
    await expect(renew(visitor("p1"), "p1")).rejects.toMatchObject({ code: "unprocessable", message: expect.stringContaining("already reserved") })
    await expect(renew(visitor("p2"), "p2")).rejects.toMatchObject({ code: "unprocessable", message: expect.stringContaining("no card on file") })
    await db.update(s.seasonPass).set({ stripePaymentMethodId: "pm_two" }).where(eq(s.seasonPass.id, "p2"))
    await expect(callApi(ctxFor(db, visitor("p2"), NOW), passesCreate, answers({ renewOf: "p2", consent: undefined }))).rejects.toMatchObject({ code: "invalid" })
  })
})
