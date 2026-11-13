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
  /** a truck already works this customer's area group that day */
  areaDay: boolean
}

/**
 * Truck-days this visit could take inside its window, earliest first: the scheduler's `openSlots` (a truck that works the
 * weekday, room in visits and minutes after the buffer, the visits already taken and the busy time on the truck's Jobber
 * calendar, one area group a day). Area days that already have a neighbour come before empty truck-days, so what the
 * customer is offered keeps the route dense.
 */
export async function openSlots(db: Database, visit: PickVisit, today: string): Promise<Slot[]> {
  const probe = await loadWorld(db, visit.organizationId, today, today)
  const window = probe.settings.windows.find((w) => w.kind === visit.kind)
  if (!window) return []
  const first = [window.opensOn.slice(0, 10), addDays(today, PICK_LEAD_DAYS)].sort().at(-1)!
  const last = window.closesOn.slice(0, 10)
  if (first > last) return []
  const world = await loadWorld(db, visit.organizationId, first, last)
  const taken = await loadTaken(db, visit.organizationId, first, last, [visit.id])
  const slots = openTruckSlots({ service: { kind: visit.kind, slotMinutes: defaultMinutes(visit.kind) }, town: visit.town as Town, ...world, from: first, to: last, taken, window })
  const names = new Map(world.trucks.map((t) => [t.id, t.name]))
  const seen = new Set<string>()
  const out: Slot[] = []
  for (const x of slots) {
    const key = `${x.day}|${x.truckId}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ truckId: x.truckId, truckName: names.get(x.truckId) ?? "", day: x.day, areaDay: x.areaDay })
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
