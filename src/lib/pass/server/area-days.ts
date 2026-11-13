import "server-only"
import type { Database } from "@/db/types"
import { addDays } from "@/api/v1/shared"
import { loadTaken, loadWorld } from "@/lib/scheduling/server/inputs"
import { openSlots as openTruckSlots } from "@/lib/scheduling/slots"
import { defaultMinutes, type Town } from "@/lib/scheduling/types"

/** The earliest a customer may pick: far enough ahead for the date-set text to be news and a truck to be told. */
export const PICK_LEAD_DAYS = 2
/** How many days the pass page offers. */
export const OFFERED = 3

export interface PickVisit {
  id: string
  organizationId: string
  kind: string
  town: string
}

export interface Slot {
  truckId: string
  truckName: string
  day: string
  /** "HH:MM", the first open start on the half-hour grid; the two-hour arrival window opens then */
  start: string
  /** a truck already works this customer's area group that day */
  areaDay: boolean
}

/**
 * Truck-days this visit could take inside its window, earliest first: the scheduler's `openSlots` (a truck that works the
 * weekday, room in visits and minutes after the buffer, the visits already taken and the busy time on the truck's Jobber
 * calendar, one area group a day). Area days that already have a neighbour come before empty truck-days, so what the
 * customer is offered keeps the route dense.
 */
export async function openSlots(db: Database, visit: PickVisit, today: string, season?: number): Promise<Slot[]> {
  const probe = await loadWorld(db, visit.organizationId, today, today)
  const found = probe.settings.windows.find((w) => w.kind === visit.kind)
  if (!found) return []
  // The settings hold one season's windows; another season is the same windows a whole number of years on.
  const shift = season ? season - Number(found.opensOn.slice(0, 4)) : 0
  const year = (iso: string) => `${Number(iso.slice(0, 4)) + shift}${iso.slice(4)}`
  const window = { ...found, opensOn: year(found.opensOn), closesOn: year(found.closesOn) }
  const first = [window.opensOn.slice(0, 10), addDays(today, PICK_LEAD_DAYS)].sort().at(-1)!
  const last = window.closesOn.slice(0, 10)
  if (first > last) return []
  const loaded = await loadWorld(db, visit.organizationId, first, last)
  const world = shift ? { ...loaded, settings: { ...loaded.settings, windows: loaded.settings.windows.map((w) => ({ ...w, opensOn: year(w.opensOn), closesOn: year(w.closesOn) })) } } : loaded
  const taken = await loadTaken(db, visit.organizationId, first, last, [visit.id])
  const slots = openTruckSlots({ service: { kind: visit.kind, slotMinutes: defaultMinutes(visit.kind) }, town: visit.town as Town, ...world, from: first, to: last, taken, window })
  const names = new Map(world.trucks.map((t) => [t.id, t.name]))
  const seen = new Set<string>()
  const out: Slot[] = []
  for (const x of slots) {
    const key = `${x.day}|${x.truckId}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ truckId: x.truckId, truckName: names.get(x.truckId) ?? "", day: x.day, start: x.start, areaDay: x.areaDay })
  }
  return out
}

/** The first `OFFERED` distinct days, area days before empty ones, in date order. */
export function offeredDays(slots: Slot[]): string[] {
  const days = [...new Set(slots.filter((x) => x.areaDay).map((x) => x.day))]
  for (const d of new Set(slots.map((x) => x.day))) if (days.length < OFFERED && !days.includes(d)) days.push(d)
  return days.slice(0, OFFERED).sort()
}

/** The truck for a picked day: one already working the area, else the first with room. */
export const truckFor = (slots: Slot[], day: string): Slot | undefined => slots.find((x) => x.day === day && x.areaDay) ?? slots.find((x) => x.day === day)

/**
 * The days the checkout offers for one visit: the earliest open day, one near the middle of what is open and the last one,
 * each on the truck `truckFor` would pick. Fewer open days than three returns the days there are; none returns none.
 */
export function spreadDays(slots: Slot[]): Slot[] {
  const days = [...new Set(slots.map((x) => x.day))].sort()
  const at = new Set([0, Math.round((days.length - 1) / 2), days.length - 1])
  return [...at].filter((i) => i >= 0 && days[i]).map((i) => {
    const mine = slots.filter((x) => x.day === days[i])
    const pool = mine.some((x) => x.areaDay) ? mine.filter((x) => x.areaDay) : mine
    return [...pool].sort((a, b) => a.start.localeCompare(b.start) || a.truckId.localeCompare(b.truckId))[0]!
  })
}
