// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb } from "@/api/test-helpers"
import { loadVisitFacts, receiptLines, receiptNumber, visitWhoDay } from "./data"

const origin = "https://site.test"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
  // The seed's pass visits have no person; Ryan Garner (person_truck-1, Truck 1) takes this one.
  await db.update(s.visit).set({ status: "scheduled", scheduledOn: "2027-05-05", startTime: "08:00", personId: "person_truck-1" }).where(eq(s.visit.id, "p4-turn-on"))
  await db.update(s.visit).set({ status: "unscheduled", scheduledOn: null, startTime: null, personId: null }).where(eq(s.visit.id, "p4-blowout"))
})
afterAll(() => db.close())

describe("loadVisitFacts", () => {
  it("carries the person's first name as who", async () => {
    const facts = await loadVisitFacts(db, "p4-turn-on", origin)
    expect(facts).toMatchObject({ id: "p4-turn-on", name: "spring turn-on", day: "2027-05-05", startTime: "08:00", who: "Ryan" })
    expect(facts).not.toHaveProperty("crew")
  })
  it("carries the street address alone, and the location the calendar uses with the town", async () => {
    const facts = await loadVisitFacts(db, "p4-turn-on", origin)
    expect(facts!.address.length).toBeGreaterThan(3)
    expect(facts!.address).not.toContain(",")
    expect(facts!.location.startsWith(`${facts!.address}, `)).toBe(true)
  })
  it("has no who when the visit has no person", async () => {
    const facts = await loadVisitFacts(db, "p4-blowout", origin, "2027-10-05")
    expect(facts).toMatchObject({ id: "p4-blowout", day: "2027-10-05", who: null })
  })
  it("is null while the visit has no day", async () => {
    expect(await loadVisitFacts(db, "p4-blowout", origin)).toBeNull()
  })
  it("names no one once the person has left, though the visit keeps its day until moved", async () => {
    await db.update(s.person).set({ active: false }).where(eq(s.person.id, "person_truck-1"))
    try {
      const facts = await loadVisitFacts(db, "p4-turn-on", origin)
      expect(facts).toMatchObject({ id: "p4-turn-on", day: "2027-05-05", who: null })
    } finally {
      await db.update(s.person).set({ active: true }).where(eq(s.person.id, "person_truck-1"))
    }
  })
})

describe("what a receipt carries", () => {
  it("numbers a receipt from the payment id's short form", () => {
    expect(receiptNumber("1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d")).toBe("R-1A2B3C4D")
  })
  it("names who did the visit and the day, and nothing for no visit", async () => {
    expect(await visitWhoDay(db, "p4-turn-on")).toEqual({ who: "Ryan", day: "2027-05-05" })
    expect(await visitWhoDay(db, "p4-blowout")).toEqual({ who: null, day: null })
    expect(await visitWhoDay(db, null)).toEqual({ who: null, day: null })
  })
  it("lists a visit's own live lines with quantity and unit price, the lines before tax and the sales tax per line", async () => {
    const [v] = await db.select().from(s.visit).where(eq(s.visit.id, "p4-turn-on"))
    const visit = await receiptLines(db, v!.organizationId, v!.jobId, "p4-turn-on")
    expect(visit.lines.length).toBeGreaterThan(0)
    for (const l of visit.lines) expect(l.amount).toBe((l.quantity ?? 1) * (l.unitPrice ?? 0))
    expect(visit.subtotal).toBe(visit.lines.reduce((sum, l) => sum + l.amount, 0))
    expect(visit.total).toBe(visit.subtotal + visit.tax)
    const whole = await receiptLines(db, v!.organizationId, v!.jobId)
    expect(whole.lines.length).toBeGreaterThanOrEqual(visit.lines.length)
  })
})
