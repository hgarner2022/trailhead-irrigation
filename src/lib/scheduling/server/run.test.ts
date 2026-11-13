// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { callApi } from "@/api/core/call"
import { scheduleRun } from "@/api/v1/schedule/handlers"
import { adminKey, apiDb, ctxFor, ORG } from "@/api/test-helpers"
import { drain } from "@/lib/queue"
import { handlers } from "@/lib/queue/handlers"
import { runSummary } from "./run"

let db: TestDb
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  for (const c of await db.select().from(s.customer)) await db.update(s.customer).set({ phone: `303-555-${c.id.slice(-4).padStart(4, "0")}`.slice(0, 12), email: `${c.id}@example.com` }).where(eq(s.customer.id, c.id))
})
afterAll(() => db.close())

const run = (now = "2027-05-03T15:00:00Z") => callApi(ctxFor(db, adminKey, now), scheduleRun, { window: "turn-on" })
const unscheduledTurnOns = async () => (await db.select().from(s.visit)).filter((v) => v.kind === "turn-on" && v.status === "unscheduled")

describe("runSummary", () => {
  it("reads the way the plan writes it", () => {
    expect(runSummary("turn-on", ["2027-05-05", "2027-05-04"], 12, 2)).toBe("12 turn-ons scheduled for the week of May 3; 2 could not be placed")
    expect(runSummary("blowout", ["2027-10-12"], 1, 0)).toBe("1 blowout scheduled for the week of Oct 11")
  })
})

describe("schedule.run", () => {
  let waitingId: string
  it("schedules the visits due, in one step, and leaves a visit waiting for its customer's pick", async () => {
    const open = new Set((await db.select().from(s.seasonPass)).filter((p) => p.status === "active").map((p) => p.id))
    const [waiting] = (await unscheduledTurnOns()).filter((v) => open.has(v.passId!) && !v.awaitingPick)
    waitingId = waiting!.id
    await db.update(s.visit).set({ awaitingPick: true }).where(eq(s.visit.id, waiting!.id))
    const due = (await unscheduledTurnOns()).filter((v) => open.has(v.passId!) && !v.awaitingPick && v.passId !== waiting!.passId).length
    const out = await run()
    expect(out.placed).toBe(due)
    expect(out.unplaced).toBe(0)
    const rows = await db.select().from(s.visit).where(eq(s.visit.kind, "turn-on"))
    const placed = rows.filter((v) => v.status === "scheduled" && v.scheduledOn && v.scheduledOn >= "2027-05-03")
    expect(placed.length).toBeGreaterThanOrEqual(out.placed)
    for (const v of placed.filter((p) => p.stopOrder !== null)) {
      expect(v.truckId).toMatch(/^truck-/)
      expect(v.scheduledOn! >= "2027-05-03" && v.scheduledOn! <= "2027-05-31").toBe(true)
      expect(v.startTime).toMatch(/^\d\d:\d\d$/)
    }
    const stillWaiting = rows.find((v) => v.id === waitingId)!
    expect(stillWaiting).toMatchObject({ status: "unscheduled", awaitingPick: true })
  })

  it("queues a date-set text for each placed visit and writes the run and its Home line", async () => {
    const texts = (await db.select().from(s.messageLog)).filter((m) => m.kind === "date-set" && m.channel === "sms")
    expect(texts.length).toBeGreaterThan(0)
    expect(texts.every((m) => m.status === "queued" && m.body.includes("https://site.test/account/pass"))).toBe(true)
    expect(texts.some((m) => m.visitId === waitingId)).toBe(false)
    const [row] = await db.select().from(s.scheduleRun).where(eq(s.scheduleRun.organizationId, ORG))
    expect(row).toMatchObject({ window: "turn-on", season: 2027, ranBy: "api-key:k-read-write-admin" })
    const alert = (await db.select().from(s.adminAlert).where(eq(s.adminAlert.kind, "scheduled")))[0]!
    expect(alert.message).toMatch(/^\d+ turn-ons? scheduled for the week of /)
    expect(alert.message).not.toMatch(/propos|approv/i)
  })

  it("places nothing the second time", async () => {
    expect(await run()).toEqual({ placed: 0, unplaced: 0 })
    const before = (await db.select().from(s.messageLog)).length
    await run()
    expect((await db.select().from(s.messageLog)).length).toBe(before)
  })

  it("raises a Home row for each visit that has no room, and clears it when the visit is placed", async () => {
    await db.update(s.seasonPass).set({ needsCustomerHome: false }).where(eq(s.seasonPass.id, (await db.select().from(s.visit).where(eq(s.visit.id, waitingId)))[0]!.passId!))
    await db.update(s.visit).set({ awaitingPick: false }).where(eq(s.visit.id, waitingId))
    await db.update(s.truck).set({ workingDays: [] })
    const out = await run("2027-05-20T15:00:00Z")
    expect(out).toEqual({ placed: 0, unplaced: 1 })
    const rows = await db.select().from(s.adminAlert).where(and(eq(s.adminAlert.kind, "unplaced"), eq(s.adminAlert.key, waitingId)))
    expect(rows).toHaveLength(1)
    expect(rows[0]!.message).toMatch(/could not be placed/)
    expect(rows[0]!.resolvedAt).toBeNull()
    await db.update(s.truck).set({ workingDays: ["mon", "tue", "wed", "thu", "fri"] })
    expect(await run("2027-05-20T15:00:00Z")).toEqual({ placed: 1, unplaced: 0 })
    expect((await db.select().from(s.adminAlert).where(and(eq(s.adminAlert.kind, "unplaced"), eq(s.adminAlert.key, waitingId))))[0]!.resolvedAt).not.toBeNull()
  })

  it("is the same path the queue handler takes", async () => {
    await db.update(s.visit).set({ status: "unscheduled", scheduledOn: null, truckId: null }).where(eq(s.visit.id, waitingId))
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2027-05-20T15:00:00Z") })
    try {
      await db.insert(s.queueItem).values({ organizationId: ORG, kind: "schedule-run", key: "turn-on:test", payload: { window: "turn-on" } })
      const out = await drain(db, { "schedule-run": handlers["schedule-run"]! })
      expect(out).toEqual({ done: 1, failed: 0 })
    } finally {
      vi.useRealTimers()
    }
    expect((await db.select().from(s.visit).where(eq(s.visit.id, waitingId)))[0]!.status).toBe("scheduled")
  })
})
