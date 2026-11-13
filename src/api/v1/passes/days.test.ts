// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import type { PublicPrincipal } from "@/lib/auth/types"
import { completeSession, stubStripe } from "@/lib/stripe/test-stripe"
import { callApi } from "../../core/call"
import { apiDb, ctxFor, ORG } from "../../test-helpers"
import { scheduleOfferDays } from "../schedule/handlers"
import { passesActivate, passesCreate } from "./handlers"

const { getStripe, reachable } = vi.hoisted(() => ({ getStripe: vi.fn(), reachable: vi.fn() }))
vi.mock("@/lib/stripe/client", async (original) => ({ ...(await original<typeof import("@/lib/stripe/client")>()), getStripe }))
vi.mock("@/lib/pass/server/create", async (original) => ({ ...(await original<typeof import("@/lib/pass/server/create")>()), emailDomainReachable: reachable }))

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
  vi.stubEnv("APP_URL", "https://site.test")
  reachable.mockResolvedValue(true)
})
afterAll(() => db.close())

const visitor = (passId?: string): PublicPrincipal => ({ kind: "public", id: "checkout", organizationId: ORG, scopes: ["checkout"], ...(passId ? { passId } : {}) })
const NOW = "2026-12-01T17:00:00Z"
const offer = (kind: "turn-on" | "blowout") => callApi(ctxFor(db, visitor(), NOW), scheduleOfferDays, { town: "Erie", kind, season: 2027, zones: 8 })
const start = async (email: string, days: Record<string, unknown>[]) =>
  callApi(ctxFor(db, visitor(), NOW), passesCreate, { customer: { firstName: "Dana", email, phone: "(303) 555-0101" }, property: { address: "5 Pine St", town: "Erie", state: "CO", zip: "80516" }, zones: 8, days })
const activate = (passId: string, session: string) => {
  getStripe.mockReturnValue(stubStripe({ sessions: { [session]: completeSession(session, { purpose: "pass-setup", passId }, { customer: `cus_${session}` }) } }).stripe)
  return callApi(ctxFor(db, visitor(passId), NOW), passesActivate, { id: passId, setupSessionId: session, consent: { termsAccepted: true, marketingOptIn: false, marketingChannels: [] } })
}

describe("the days picked at checkout", () => {
  it("are held on the pending pass's visits, then scheduled with their window when the card is saved", async () => {
    const [turnOn, blowout] = [(await offer("turn-on")).days[1]!, (await offer("blowout")).days[0]!]
    const pass = await start("days1@example.com", [{ kind: "turn-on", day: turnOn.day, truckId: turnOn.truckId, start: turnOn.start }, { kind: "blowout", day: blowout.day, truckId: blowout.truckId, start: blowout.start }])
    let rows = await db.select().from(s.visit).where(eq(s.visit.passId, pass.id))
    expect(rows.map((v) => [v.kind, v.status, v.scheduledOn, v.truckId])).toEqual(expect.arrayContaining([["turn-on", "unscheduled", turnOn.day, turnOn.truckId], ["blowout", "unscheduled", blowout.day, blowout.truckId]]))
    const active = await activate(pass.id, "cs_d1")
    expect(active.visits.map((v) => [v.kind, v.status, v.scheduledOn])).toEqual(expect.arrayContaining([["turn-on", "scheduled", turnOn.day], ["blowout", "scheduled", blowout.day]]))
    rows = await db.select().from(s.visit).where(eq(s.visit.passId, pass.id))
    expect(rows.every((v) => v.startTime && v.stopOrder)).toBe(true)
    const mail = (await db.select().from(s.messageLog).where(eq(s.messageLog.customerId, pass.customerId)))[0]!
    expect(mail.body).toContain("Google Calendar:")
    expect(await db.select().from(s.passChange).where(eq(s.passChange.passId, pass.id))).not.toContainEqual(expect.objectContaining({ kind: "day-filled" }))
    await activate(pass.id, "cs_d1")
    expect((await db.select().from(s.visit).where(eq(s.visit.passId, pass.id))).filter((v) => v.status === "scheduled")).toHaveLength(2)
  })

  it("drops a day that is not open, and leaves that visit with no day", async () => {
    const pass = await start("days2@example.com", [{ kind: "turn-on", day: "2027-05-08", truckId: "truck-1", start: "08:00" }])
    const rows = await db.select().from(s.visit).where(eq(s.visit.passId, pass.id))
    expect(rows.find((v) => v.kind === "turn-on")).toMatchObject({ scheduledOn: null, truckId: null })
  })

  it("move to the next open day when theirs filled up in between, and the change is recorded", async () => {
    const pick = (await offer("turn-on")).days[0]!
    const pass = await start("days3@example.com", [{ kind: "turn-on", day: pick.day, truckId: pick.truckId, start: pick.start }])
    const trucks = await db.select().from(s.truck)
    await db.insert(s.jobberVisit).values(trucks.map((t, i) => ({ id: `gone-${i}`, organizationId: ORG, truckId: t.id, isBlock: true, title: "Out", startAt: new Date(`${pick.day}T06:00:00Z`), endAt: new Date(`${pick.day}T23:59:00Z`) })))
    const active = await activate(pass.id, "cs_d3")
    const visit = active.visits.find((v) => v.kind === "turn-on")!
    expect(visit.status).toBe("scheduled")
    expect(visit.scheduledOn! > pick.day).toBe(true)
    const changes = await db.select().from(s.passChange).where(eq(s.passChange.passId, pass.id))
    expect(changes.find((c) => c.kind === "day-filled")?.detail).toMatchObject({ visit: "turn-on", from: pick.day, to: visit.scheduledOn })
    const mail = (await db.select().from(s.messageLog).where(eq(s.messageLog.customerId, pass.customerId)))[0]!
    expect(mail.body).toContain("filled up")
  })
})
