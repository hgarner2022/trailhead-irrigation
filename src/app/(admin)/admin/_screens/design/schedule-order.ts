import { hoursOf } from "@/lib/admin/people"
import type { Person } from "@/lib/admin/types"
import { clockToMinutes, type GridBlock } from "@/components/blocks/time-grid-model"
import { GRID_MINUTES, gap } from "@/lib/scheduling/offer"
import { orderStops } from "@/lib/scheduling/order"
import { drivingOf, driveBetween, routeOf, type Calendar } from "./schedule-engine"

// Order the day (docs/plans/2026-11-25-scheduler-holistic-audit.md, row 10), for one person's day: the stops with a time never move; the Any time stops are put into the gaps, in the order the
// product's own `orderStops` (src/lib/scheduling/order.ts) drives them, each at the half hour that adds the least driving and leaves the room to drive (`gap`). A stop that fits nowhere stays
// Any time and is listed as "Doesn't fit today". Nothing was promised to an Any time visit, so nothing is told. Pure.

export interface OrderPlan {
  personId: string
  day: string
  /** the day as it is, in the order it is driven, with its minutes of driving */
  before: { route: GridBlock[]; driving: number }
  /** the day once ordered: every stop that fits has a time */
  after: { route: GridBlock[]; driving: number }
  /** the Any time stops that get a time, in the order they are placed */
  moves: { id: string; start: number }[]
  /** the Any time stops that fit nowhere today */
  doesNotFit: GridBlock[]
  /** minutes of driving the order saves; never below 0 */
  saved: number
}

const overlap = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1

export function orderDay(cal: Calendar, person: Pick<Person, "id" | "hoursStart" | "hoursEnd">, day: string): OrderPlan {
  const mine = routeOf(cal.visits, person.id, day)
  const fixed = mine.filter((b) => b.start !== null)
  const loose = mine.filter((b) => b.start === null && !b.done)
  const hours = hoursOf(person)
  const hs = clockToMinutes(hours.start) ?? 540
  const he = clockToMinutes(hours.end) ?? 1020
  const off = cal.timeOff.filter((o) => o.personId === person.id && o.day === day).map((o) => [o.start ?? 0, o.end ?? 24 * 60] as const)
  const locOf = (b: GridBlock) => cal.meta[b.id]
  const origin = fixed[0] && locOf(fixed[0]) ? { lat: locOf(fixed[0])!.lat, lng: locOf(fixed[0])!.lng } : undefined
  const order = orderStops(loose.map((b) => ({ id: b.id, lat: locOf(b)?.lat ?? null, lng: locOf(b)?.lng ?? null })), origin)
  const byId = new Map(loose.map((b) => [b.id, b]))

  const placed: GridBlock[] = [...fixed]
  const moves: OrderPlan["moves"] = []
  const doesNotFit: GridBlock[] = []
  for (const id of order) {
    const b = byId.get(id)!
    const timed = [...placed].sort((x, y) => x.start! - y.start!)
    let best: { start: number; added: number } | null = null
    for (let start = hs; start + b.minutes <= he; start += GRID_MINUTES) {
      const end = start + b.minutes
      if (off.some(([a, z]) => overlap(start, end, a, z))) continue
      if (timed.some((t) => overlap(start, end, t.start!, t.start! + t.minutes))) continue
      const prev = [...timed].reverse().find((t) => t.start! + t.minutes <= start)
      const next = timed.find((t) => t.start! >= end)
      const toPrev = prev ? driveBetween(prev, b, cal.meta) : 0
      const toNext = next ? driveBetween(b, next, cal.meta) : 0
      if (prev && prev.start! + prev.minutes + gap(toPrev) > start) continue
      if (next && end + gap(toNext) > next.start!) continue
      const added = prev && next ? toPrev + toNext - driveBetween(prev, next, cal.meta) : toPrev + toNext
      if (!best || added < best.added) best = { start, added }
    }
    if (best) {
      placed.push({ ...b, start: best.start })
      moves.push({ id, start: best.start })
    } else doesNotFit.push(b)
  }

  const afterRoute = [...placed].sort((x, y) => x.start! - y.start! || x.id.localeCompare(y.id)).concat(doesNotFit)
  const before = drivingOf(mine, cal.meta).total
  const after = drivingOf(afterRoute, cal.meta).total
  return { personId: person.id, day, before: { route: mine, driving: before }, after: { route: afterRoute, driving: after }, moves, doesNotFit, saved: Math.max(0, before - after) }
}
