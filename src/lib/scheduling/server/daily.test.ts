// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ORG } from "@/api/test-helpers"
import { daily } from "./daily"

let db: TestDb
// Wednesday May 5 2027, 5 am Mountain.
const NOW = new Date("2027-05-05T11:00:00Z")
beforeAll(async () => {
  vi.stubEnv("APP_URL", "https://site.test")
  db = await apiDb()
  await db.update(s.customer).set({ phone: "303-555-0100", email: "c@example.com" }).where(eq(s.customer.id, "c167"))
})
afterAll(() => db.close())

const messages = async (kind: string) => (await db.select().from(s.messageLog)).filter((m) => m.kind === kind)

describe("daily", () => {
  it("flags a past visit nobody closed, leaves a closed one and a future one", async () => {
    await db.update(s.visit).set({ status: "scheduled", scheduledOn: "2027-05-04", truckId: "truck-1", completedOn: null }).where(eq(s.visit.id, "p3-turn-on"))
    await db.update(s.visit).set({ status: "scheduled", scheduledOn: "2027-05-04", truckId: "truck-1", completedOn: null }).where(eq(s.visit.id, "p6-turn-on"))
    await db.update(s.visit).set({ status: "scheduled", scheduledOn: "2027-05-06", truckId: "truck-1", startTime: "08:00" }).where(eq(s.visit.id, "p4-turn-on"))
    await db.update(s.visit).set({ status: "scheduled", scheduledOn: "2027-05-06", truckId: "truck-2", startTime: "09:00" }).where(eq(s.visit.id, "p7-turn-on"))
    const out = await daily(db, NOW)
    expect(out.notClosed).toBeGreaterThanOrEqual(2)
    expect((await db.select().from(s.visit).where(eq(s.visit.id, "p3-turn-on")))[0]!.status).toBe("not-closed")
    expect((await db.select().from(s.visit).where(eq(s.visit.id, "p4-turn-on")))[0]!.status).toBe("scheduled")
  })

  it("texts tomorrow's customers the day before with their window, and emails the one with no phone", async () => {
    const [p4] = await db.select().from(s.visit).where(eq(s.visit.id, "p4-turn-on"))
    const [p7] = await db.select().from(s.visit).where(eq(s.visit.id, "p7-turn-on"))
    await db.update(s.customer).set({ phone: "303-555-0104", email: "a@example.com" }).where(eq(s.customer.id, p4!.customerId))
    await db.update(s.customer).set({ phone: null, email: "b@example.com" }).where(eq(s.customer.id, p7!.customerId))
    await db.delete(s.messageLog)
    await daily(db, NOW)
    const rows = await messages("day-before")
    const four = rows.find((m) => m.visitId === "p4-turn-on")!
    expect(four).toMatchObject({ channel: "sms", to: "303-555-0104" })
    expect(four.body).toContain("Thu, May 6")
    expect(four.body).toContain("8 to 10 am")
    expect(rows.find((m) => m.visitId === "p7-turn-on")).toMatchObject({ channel: "email", to: "b@example.com" })
    expect(rows.every((m) => m.visitId !== "p3-turn-on")).toBe(true)
  })

  it("queues the crew note for each admin, as the plan words it and with nothing about approvals", async () => {
    const [item] = (await db.select().from(s.queueItem)).filter((q) => q.kind === "message" && q.key.startsWith("admin-alert:crew-summary:2027-05-06:"))
    expect(item).toBeDefined()
    const body = (item!.payload as { data: { detail: string } }).data.detail
    expect(body).toMatch(/^Tomorrow: 2 visits, Truck 1 in .+ \(1\), Truck 2 in .+ \(1\)\./)
    expect(body).toMatch(/2 visits from yesterday not marked done\.$/)
    expect(body).not.toMatch(/approv|propos/i)
    expect((item!.payload as { to: string }).to).toBe("owner@example.com")
  })

  it("queues a Schedule run for a window inside its lead weeks that has not run, once", async () => {
    const runs = (await db.select().from(s.queueItem)).filter((q) => q.kind === "schedule-run")
    expect(runs.map((q) => q.key)).toEqual(["turn-on:2027:first"])
    await db.insert(s.scheduleRun).values({ organizationId: ORG, season: 2027, window: "blowout" })
    await db.delete(s.queueItem)
    await daily(db, new Date("2027-09-20T11:00:00Z"))
    expect((await db.select().from(s.queueItem)).filter((q) => q.kind === "schedule-run")).toEqual([])
  })

  it("adds nothing when it runs a second time the same day", async () => {
    await daily(db, NOW)
    const before = [(await db.select().from(s.messageLog)).length, (await db.select().from(s.queueItem)).length]
    await daily(db, NOW)
    expect([(await db.select().from(s.messageLog)).length, (await db.select().from(s.queueItem)).length]).toEqual(before)
  })
})

describe("two weeks before", () => {
  const setDay = (id: string, day: string) => db.update(s.visit).set({ status: "scheduled", scheduledOn: day, truckId: "truck-1", startTime: "08:00" }).where(eq(s.visit.id, id))
  it("texts a visit 14 days out once, however often the daily run goes, and none at 13 or 15 days", async () => {
    await db.delete(s.messageLog)
    await setDay("p1-turn-on", "2027-05-19")
    await setDay("p2-turn-on", "2027-05-18")
    await setDay("p5-turn-on", "2027-05-20")
    for (const id of ["p1-turn-on", "p2-turn-on", "p5-turn-on"]) {
      const [v] = await db.select().from(s.visit).where(eq(s.visit.id, id))
      await db.update(s.customer).set({ phone: `303-555-${id.slice(1, 2)}000`, email: `${id}@example.com` }).where(eq(s.customer.id, v!.customerId))
    }
    const first = await daily(db, NOW)
    await daily(db, NOW)
    const rows = await messages("date-confirm")
    expect(first.dateConfirm).toBe(1)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ visitId: "p1-turn-on", channel: "sms", key: "date-confirm:p1-turn-on" })
    expect(rows[0]!.body).toContain("Wed, May 19, 8 to 10 am")
    expect(rows[0]!.body).toContain("Need a different day?")
    expect(rows[0]!.body).toContain("Reply STOP to opt out.")
  })
})

