// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "@/api/core/call"
import { apiDb, ctxFor, ORG, owner, readKey } from "@/api/test-helpers"
import { visitsMove } from "@/api/v1/visits/handlers"
import snapshot from "./fixtures/snapshot.json"
import { getLiveAdminData } from "./live"
import type { AdminData } from "./types"

const fixture = snapshot as AdminData
let db: TestDb
let data: AdminData

beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  await db.update(s.truck).set({ calendarFeedUrl: "https://calendar.example.com/t1.ics" }).where(eq(s.truck.id, "truck-1"))
  await db.insert(s.jobberVisit).values({ id: "feed:truck-1:a", organizationId: ORG, truckId: "truck-1", title: "Day off", startAt: new Date("2027-05-06T13:00:00Z"), endAt: new Date("2027-05-06T23:00:00Z"), isBlock: true })
  await db.update(s.seasonPass).set({ cardFailedAt: new Date("2027-04-19T10:00:00Z") }).where(eq(s.seasonPass.id, "p3"))
  await callApi(ctxFor(db, owner), visitsMove, { id: "p4-turn-on", truckId: "truck-1", scheduledOn: "2027-05-05", startTime: "09:30" })
  await db.insert(s.queueItem).values({ organizationId: ORG, kind: "geocode", key: "bad", status: "failed", lastError: "Nominatim answered 429", attempts: 5 })
  await db.update(s.seasonPass).set({ status: "cancelled", cancelledAt: new Date("2027-04-19T12:00:00Z") }).where(eq(s.seasonPass.id, "p5"))
  await db.insert(s.adminAlert).values({ organizationId: ORG, kind: "pass-cancelled", key: "p5", passId: "p5", message: "Season Pass TH-2027-0005 cancelled: Sam, Erie" })
  data = await getLiveAdminData(ctxFor(db, owner))
})
afterAll(() => db.close())

describe("getLiveAdminData", () => {
  it("carries every part of AdminData, scoped to the organization", () => {
    expect(Object.keys(data).sort()).toEqual([...Object.keys(fixture), "blocks"].sort())
    expect(data.organizationId).toBe(ORG)
    expect(Number.isNaN(Date.parse(data.syncedAt))).toBe(false)
  })
  it("has the fixture's passes, clients and quotes and invoices from the mirror", () => {
    expect(data.passes.map((p) => p.number).sort()).toEqual(fixture.passes.map((p) => p.number).sort())
    expect(data.clients).toHaveLength(fixture.clients.length)
    expect(new Set(data.clients.map((c) => c.id)).size).toBe(data.clients.length)
    expect(data.quotes).toHaveLength(fixture.quotes.length)
    expect(data.invoices).toHaveLength(fixture.invoices.length)
    expect(data.clients.filter((c) => c.hasPass).length).toBeGreaterThan(5)
  })
  it("shapes a pass with its visits in order, its consent and its card", () => {
    const p1 = data.passes.find((p) => p.id === "p1")!
    expect(p1.visits.map((v) => v.kind)).toEqual(["turn-on", "inspection", "blowout"])
    expect(p1.visits[0]).toMatchObject({ window: "May", amount: 145 })
    // The fixture keeps only the day, so a scheduled visit with no time reads as 08:00 Mountain.
    expect(p1.visits[0]!.scheduledAt).toBe("2027-05-03T14:00:00Z")
    expect(p1.consent).toMatchObject({ termsVersion: "2026-11", marketingOptIn: true, source: "checkout" })
    expect(p1.cardLast4).toBe("4242")
    expect(p1.accessNote).toBeTruthy()
  })
  it("lists app visits and the mirror's visits, with the truck and the stop", () => {
    const moved = data.visits.find((v) => v.id === "p4-turn-on")!
    expect(moved).toMatchObject({ isPass: true, truckId: "truck-1", status: "scheduled", startAt: "2027-05-05T15:30:00Z" })
    expect(data.visits.filter((v) => !v.isPass).length).toBeGreaterThan(100)
    expect(data.visits.every((v) => v.id && v.clientId !== undefined && v.town)).toBe(true)
  })
  it("reads trucks, areas, settings and the change log through the handlers", () => {
    expect(data.settings.trucks.map((t) => t.id)).toEqual(["truck-1", "truck-2"])
    expect(data.settings.areas).toHaveLength(fixture.settings.areas.length)
    expect(data.settings.windows).toHaveLength(fixture.settings.windows.length)
    expect(data.settings.messages.length).toBe(fixture.settings.messages.length)
    expect(data.settingsChanges).toEqual([])
  })
  it("shows the pass-cancel task's alert once as a pass-cancelled row, not also the computed one", () => {
    const rows = data.attention.filter((a) => a.kind === "pass-cancelled" && a.passId === "p5")
    expect(rows).toHaveLength(1)
    expect(rows[0]!.message).toBe("Season Pass TH-2027-0005 cancelled: Sam, Erie")
  })

  it("raises attention rows for a failed card and a failed queue item", () => {
    expect(data.attention).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "charge-failed", passId: "p3" }),
      expect.objectContaining({ kind: "jobs-failed", message: expect.stringContaining("429") }),
    ]))
  })
  it("totals the months and returns the calendar blocks", () => {
    expect(data.monthTotals.length).toBeGreaterThan(3)
    expect(data.monthTotals.every((m) => m.month >= 1 && m.month <= 12 && m.revenue >= 0)).toBe(true)
    expect(data.blocks).toEqual([{ truckId: "truck-1", title: "Day off", startAt: "2027-05-06T13:00:00.000Z", endAt: "2027-05-06T23:00:00.000Z" }])
  })
})

describe("a read-only caller", () => {
  it("gets the screens' data without the contact details the handlers hide", async () => {
    const limited = await getLiveAdminData(ctxFor(db, readKey))
    expect(limited.passes.find((p) => p.id === "p1")!.accessNote).toBeUndefined()
    expect(limited.passes).toHaveLength(data.passes.length)
  })
})
