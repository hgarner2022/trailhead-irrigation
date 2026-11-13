import "server-only"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { mapPoint } from "@/lib/geocode"
import { orderStops } from "../order"
import { defaultMinutes } from "../types"

export const FIRST_STOP = 8 * 60

const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`

/**
 * Orders one truck-day and stores it: `stop_order` from 1, and `start_time` from 8:00, each visit starting when the one
 * before it ends (its own length, or the kind's usual one). App-computed from the visits' geocoded points; a visit with no
 * point goes last. The truck starts at the centre of the day's most common town. Returns the visit ids in order.
 */
export async function orderDay(db: Database, { truckId, day }: { truckId: string; day: string }): Promise<string[]> {
  const rows = await db
    .select({ visit: s.visit, town: s.property.town, lat: s.property.lat, lng: s.property.lng })
    .from(s.visit)
    .innerJoin(s.property, eq(s.property.id, s.visit.propertyId))
    .where(and(eq(s.visit.truckId, truckId), eq(s.visit.scheduledOn, day), eq(s.visit.status, "scheduled")))
  if (rows.length === 0) return []
  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r.town, (counts.get(r.town) ?? 0) + 1)
  const town = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]![0] as (typeof rows)[number]["town"]
  const { lat, lng } = mapPoint({ lat: null, lng: null, town })
  const order = orderStops(rows.map((r) => ({ id: r.visit.id, lat: r.lat, lng: r.lng })), { lat, lng })
  let minute = FIRST_STOP
  for (const [i, id] of order.entries()) {
    const visit = rows.find((r) => r.visit.id === id)!.visit
    await db.update(s.visit).set({ stopOrder: i + 1, startTime: clock(minute) }).where(eq(s.visit.id, id))
    minute += visit.durationMinutes ?? defaultMinutes(visit.kind)
  }
  return order
}
