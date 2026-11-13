/**
 * The scheduler's calendar rules, pure: the days a truck works, whether a day is inside a window, what a truck-day holds
 * after the buffer, and the order the towns are worked in. The busy-time helpers are Phase 6's, re-exported so the scheduler
 * and the Schedule screen subtract blocks the same way.
 */
import { addDays, blockedMinutes, blocksOn, capacityAfterBlocks, WORKDAY_MINUTES, weekdayOf } from "@/lib/admin/calendar"
import type { CapacityKind, SchedArea, SchedSettings, SchedTruck, Town } from "./types"

export { addDays, blockedMinutes, blocksOn, capacityAfterBlocks, WORKDAY_MINUTES, weekdayOf }

/** Every day from `from` to `to` (inclusive) that the truck works; none for a truck out of service. */
export function workingDays(truck: Pick<SchedTruck, "workingDays" | "active">, from: string, to: string): string[] {
  const days: string[] = []
  if (truck.active === false) return days
  for (let day = from; day <= to; day = addDays(day, 1)) if (truck.workingDays.includes(weekdayOf(day))) days.push(day)
  return days
}

/** Whether `day` lies inside the window, both ends included. Windows carry ISO dates or full instants; the first ten characters are the day. */
export const isInWindow = (window: { opensOn: string; closesOn: string }, day: string): boolean => day >= window.opensOn.slice(0, 10) && day <= window.closesOn.slice(0, 10)

/** The first two weeks of a window run on the early buffer, the rest on the late one. */
export const EARLY_DAYS = 14

export interface DayCapacity {
  /** visits of the kind the day takes after the buffer */
  visits: number
  /** working minutes the day takes after the buffer */
  minutes: number
}

/**
 * What one truck-day holds for a kind once the buffer for repairs and weather is held back: the truck's visits of that kind
 * and the working minutes, each reduced by the early percent in the window's first two weeks and the late percent after
 * (the late one when no `windowStart` is given). A kind the truck has no room for stays zero; any other keeps at least one.
 */
export function capacityFor(truck: Pick<SchedTruck, "capacityByKind">, kind: CapacityKind, day: string, settings: Pick<SchedSettings, "bufferPercentEarly" | "bufferPercentLate">, windowStart?: string): DayCapacity {
  const early = windowStart !== undefined && day < addDays(windowStart.slice(0, 10), EARLY_DAYS)
  const keep = 1 - (early ? settings.bufferPercentEarly : settings.bufferPercentLate) / 100
  const base = truck.capacityByKind[kind] ?? 0
  return { visits: base > 0 ? Math.max(1, Math.floor(base * keep)) : 0, minutes: Math.floor(WORKDAY_MINUTES * keep) }
}

/** The areas in the order a season works them, by their stored season order then name. */
export function areaOrder<A extends SchedArea>(areas: A[], season: "spring" | "fall"): A[] {
  const rank = (a: A) => (season === "fall" ? a.fallOrder : a.springOrder) ?? 0
  return [...areas].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
}

/** The towns in the order a season works them: areas in season order, each area's towns as listed. */
export function townOrder(areas: SchedArea[], season: "spring" | "fall"): Town[] {
  return areaOrder(areas, season).flatMap((a) => a.towns)
}

/** The area a town sits in; a town no area lists is its own area. */
export const areaIdOf = (areas: SchedArea[], town: Town): string => areas.find((a) => a.towns.includes(town))?.id ?? town
