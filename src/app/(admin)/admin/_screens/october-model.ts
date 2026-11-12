/**
 * The pure derivations behind OctoberScreen: the header's context line and
 * which passes sit in a blowout week. Kept out of the screen so they can be
 * unit tested.
 */
import type { BlowoutWeek, Pass } from "@/lib/admin/types"
import { shortDate } from "@/lib/admin/format"

/** The active passes whose blowout is reserved for the week starting on that Monday, in the order they were sold. */
export function passesInWeek(passes: Pass[], weekStart: string): Pass[] {
  return passes.filter((p) => p.status === "active" && p.blowoutWeek === weekStart)
}

/** A week with more blowouts reserved than it has room for, as after the capacity is lowered. */
export const isOverCapacity = (week: BlowoutWeek) => week.taken > week.capacity

/** A typed capacity as a whole number no lower than zero; anything unreadable is 0. */
export function clampCapacity(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
}

/**
 * "Blowout weeks for 2027. 20 spots a week." A range when the weeks differ,
 * "No blowout weeks yet." with none, and a sentence per week that is over
 * capacity, so the header says so wherever the cards are.
 */
export function octoberContext(weeks: BlowoutWeek[]): string {
  if (weeks.length === 0) return "No blowout weeks yet."
  const season = Math.max(...weeks.map((w) => w.season))
  const capacities = weeks.map((w) => w.capacity)
  const low = Math.min(...capacities)
  const high = Math.max(...capacities)
  const spots = low === high ? `${low} spots a week` : `${low} to ${high} spots a week`
  const over = weeks.filter(isOverCapacity).map((w) => ` Week of ${shortDate(w.weekStart)} is over capacity.`)
  return `Blowout weeks for ${season}. ${spots}.${over.join("")}`
}

/** The week to open with: the first one, by Monday. */
export function firstWeek(weeks: BlowoutWeek[]): string | undefined {
  return [...weeks].sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1))[0]?.weekStart
}
