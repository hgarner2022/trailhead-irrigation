import "server-only"
import { and, eq } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { hoursOf } from "@/lib/admin/people"
import { mapPoint } from "@/lib/geocode"
import { orderStops } from "../order"
import { defaultMinutes } from "../types"

const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`

/**
 * Orders one person's day and stores it: `stop_order` from 1, and `start_time` from the person's day start (9:00 unless their hours say otherwise), each Season Pass visit starting when
 * the one before it ends (its own length, or the kind's usual one). A one-off job's visit gets its stop order and keeps the
 * time it was given: none means "Any time", and ordering the day never turns that into 8:00 (the office picks a time or the
 * customer is told a day only). App-computed from the visits' geocoded points; a visit with no point goes last. The person
 * starts at the centre of the day's most common town. Returns the visit ids in order.
 */
export async function orderDay(db: Database, { personId, day }: { personId: string; day: string }): Promise<string[]> {
  const rows = await db
    .select({ visit: s.visit, town: s.property.town, lat: s.property.lat, lng: s.property.lng, season: s.job.season })
    .from(s.visit)
    .innerJoin(s.property, eq(s.property.id, s.visit.propertyId))
    .innerJoin(s.job, eq(s.job.id, s.visit.jobId))
    .where(and(eq(s.visit.personId, personId), eq(s.visit.scheduledOn, day), eq(s.visit.status, "scheduled")))
  if (rows.length === 0) return []
  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r.town, (counts.get(r.town) ?? 0) + 1)
  const town = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]![0] as (typeof rows)[number]["town"]
  const { lat, lng } = mapPoint({ lat: null, lng: null, town })
  const order = orderStops(rows.map((r) => ({ id: r.visit.id, lat: r.lat, lng: r.lng })), { lat, lng })
  // The day starts when the person's day starts (`hoursOf`: their saved hours, else 9 to 5), the one truth for hours.
  const [person] = await db.select({ hoursStart: s.person.hoursStart, hoursEnd: s.person.hoursEnd }).from(s.person).where(eq(s.person.id, personId))
  const start = hoursOf(person ?? {}).start
  let minute = Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5))
  for (const [i, id] of order.entries()) {
    const { visit, season } = rows.find((r) => r.visit.id === id)!
    // A job with a season is a Season Pass: the app times its visits. Any other job's visit keeps its own time, or none.
    if (season === null) {
      await db.update(s.visit).set({ stopOrder: i + 1 }).where(eq(s.visit.id, id))
      continue
    }
    await db.update(s.visit).set({ stopOrder: i + 1, startTime: clock(minute) }).where(eq(s.visit.id, id))
    minute += visit.durationMinutes ?? defaultMinutes(visit.kind)
  }
  return order
}
