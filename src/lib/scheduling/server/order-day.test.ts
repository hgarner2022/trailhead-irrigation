// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq, inArray } from "drizzle-orm"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb } from "@/api/test-helpers"
import { orderDay } from "./order-day"

let db: TestDb
beforeAll(async () => {
  db = await apiDb()
})
afterAll(() => db.close())

describe("orderDay", () => {
  it("stores stop order and start times from 8:00, each visit after the one before it, the unlocated one last", async () => {
    const visits = (await db.select().from(s.visit).where(eq(s.visit.status, "unscheduled"))).filter((v) => v.kind === "blowout").slice(0, 4)
    expect(visits).toHaveLength(4)
    const [a, b, c, d] = visits as [typeof visits[number], ...typeof visits]
    const points: Record<string, [number | null, number | null]> = { [a.id]: [40.05, -105.05], [b.id]: [40.0, -105.0], [c.id]: [40.02, -105.02], [d.id]: [null, null] }
    for (const v of visits) {
      await db.update(s.property).set({ town: "Erie", lat: points[v.id]![0], lng: points[v.id]![1] }).where(eq(s.property.id, v.propertyId))
      await db.update(s.visit).set({ status: "scheduled", truckId: "truck-1", scheduledOn: "2027-10-05", durationMinutes: 30 }).where(eq(s.visit.id, v.id))
    }
    const order = await orderDay(db, { truckId: "truck-1", day: "2027-10-05" })
    expect(order).toHaveLength(4)
    expect(order.at(-1)).toBe(d.id)
    const stored = await db.select().from(s.visit).where(inArray(s.visit.id, order))
    const by = new Map(stored.map((v) => [v.id, v]))
    expect(order.map((id) => by.get(id)!.stopOrder)).toEqual([1, 2, 3, 4])
    expect(order.map((id) => by.get(id)!.startTime)).toEqual(["08:00", "08:30", "09:00", "09:30"])
  })

  it("leaves a day with nothing on it alone", async () => {
    expect(await orderDay(db, { truckId: "truck-2", day: "2027-10-06" })).toEqual([])
  })
})
