import { hoursOf } from "@/lib/admin/people"
import type { Person } from "@/lib/admin/types"
import { clockToMinutes, type GridBlock } from "@/components/blocks/time-grid-model"
import { orderStops } from "@/lib/scheduling/order"
import { drivingOf, routeOf, type Calendar } from "./schedule-engine"

// Order the day (docs/plans/2026-11-25-scheduler-holistic-audit.md, row 10), for one person's day. A booked time is a promise, so no stop is given one: the stops with a time never move, and each
// Any time stop gets its place in the order and nothing else. The order comes from the product's own `orderStops` (src/lib/scheduling/order.ts); each stop is slotted into the gap between two timed stops
// (or before the first, or after the last) where it fits with room to drive, at the place that leaves the day's driving shortest. A stop that fits no gap stays where it was and is listed as "Doesn't fit
// today". Nothing is told. Pure.

export interface OrderMove { id: string; /** the timed stop it follows; null: it comes first */ afterId: string | null; order: number }

export interface OrderPlan {
  personId: string
  day: string
  /** the day as it is, in the order it is driven, with its minutes of driving (the shop out and back included) */
  before: { route: GridBlock[]; driving: number }
  /** the day once ordered */
  after: { route: GridBlock[]; driving: number }
  /** where each Any time stop that fits goes; empty when the order would not change */
  moves: OrderMove[]
  /** the Any time stops that fit no gap today */
  doesNotFit: GridBlock[]
  /** minutes of driving the order saves; never below 0 */
  saved: number
}

/** Room kept between stops in a gap, in minutes. */
const ROOM = 10

export function orderDay(cal: Calendar, person: Pick<Person, "id" | "hoursStart" | "hoursEnd">, day: string): OrderPlan {
  const mine = routeOf(cal.visits, person.id, day)
  const timed = mine.filter((b) => b.start !== null)
  const loose = mine.filter((b) => b.start === null && !b.done)
  const hours = hoursOf(person)
  const hs = clockToMinutes(hours.start) ?? 540
  const he = clockToMinutes(hours.end) ?? 1020
  const off = cal.timeOff.filter((o) => o.personId === person.id && o.day === day).map((o) => [o.start ?? 0, o.end ?? 24 * 60] as const)
  const free = (k: number) => {
    const from = k === 0 ? hs : timed[k - 1]!.start! + timed[k - 1]!.minutes
    const to = k === timed.length ? he : timed[k]!.start!
    return Math.max(0, to - from - off.reduce((n, [a, z]) => n + Math.max(0, Math.min(to, z) - Math.max(from, a)), 0))
  }
  const point = (b: GridBlock) => cal.meta[b.id]
  const first = timed[0] && point(timed[0]) ? { lat: point(timed[0])!.lat, lng: point(timed[0])!.lng } : undefined
  const order = orderStops(loose.map((b) => ({ id: b.id, lat: point(b)?.lat ?? null, lng: point(b)?.lng ?? null })), first)
  const byId = new Map(loose.map((b) => [b.id, b]))

  const slots: GridBlock[][] = Array.from({ length: timed.length + 1 }, () => [])
  const routeFrom = (extra: GridBlock[]) => [...slots.flatMap((s, k) => [...s, ...(timed[k] ? [timed[k]!] : [])]), ...extra]
  const doesNotFit: GridBlock[] = []
  for (const id of order) {
    const b = byId.get(id)!
    let best: { k: number; total: number } | null = null
    for (let k = 0; k < slots.length; k++) {
      if (slots[k]!.reduce((n, x) => n + x.minutes + ROOM, 0) + b.minutes + ROOM > free(k)) continue
      slots[k]!.push(b)
      const total = drivingOf(routeFrom(doesNotFit), cal.meta).total
      slots[k]!.pop()
      if (!best || total < best.total) best = { k, total }
    }
    if (best) slots[best.k]!.push(b)
    else doesNotFit.push(b)
  }
  const afterRoute = routeFrom(doesNotFit)
  const changed = afterRoute.some((b, i) => b.id !== mine[i]?.id) || afterRoute.length !== mine.length
  const moves: OrderMove[] = changed ? slots.flatMap((s, k) => s.map((b, n) => ({ id: b.id, afterId: k === 0 ? null : timed[k - 1]!.id, order: n }))) : []
  const before = drivingOf(mine, cal.meta).total
  const after = drivingOf(afterRoute, cal.meta).total
  return { personId: person.id, day, before: { route: mine, driving: before }, after: { route: afterRoute, driving: after }, moves, doesNotFit, saved: Math.max(0, before - after) }
}
