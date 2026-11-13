import "server-only"
import { and, eq, inArray, ne, notInArray } from "drizzle-orm"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { addDays, capacityKind, weekdayOf } from "@/api/v1/shared"

/** The earliest a customer may pick: far enough ahead for the date-set text to be news and a truck to be told. */
export const PICK_LEAD_DAYS = 2
/** How many days the pass page offers. */
export const OFFERED = 3

export interface PickVisit {
  id: string
  organizationId: string
  kind: (typeof s.visitKindEnum.enumValues)[number]
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
 * Truck-days this visit could take inside its window, earliest first: a truck that works the weekday, has room for the
 * visit's kind and either has no visits yet or already works the customer's area group (the scheduler's hard rules,
 * `visits.move`). Area days that already have a neighbour come before empty truck-days, so what the customer is offered
 * keeps the route dense. The Jobber calendar's busy blocks are not read here; the scheduler and Ryan own those.
 */
export async function openSlots(db: Database, visit: PickVisit, today: string): Promise<Slot[]> {
  const [org] = await db.select({ settings: s.organization.settings }).from(s.organization).where(eq(s.organization.id, visit.organizationId))
  const window = org?.settings.windows.find((w) => w.kind === visit.kind)
  if (!window) return []
  const first = [window.opensOn.slice(0, 10), addDays(today, PICK_LEAD_DAYS)].sort().at(-1)!
  const last = window.closesOn.slice(0, 10)
  if (first > last) return []
  const [trucks, areas] = await Promise.all([
    db.select().from(s.truck).where(and(eq(s.truck.organizationId, visit.organizationId), eq(s.truck.active, true))),
    db.select().from(s.area).where(eq(s.area.organizationId, visit.organizationId)),
  ])
  const areaOf = (town: string) => areas.find((a) => a.towns.includes(town as never))?.id ?? town
  const booked = await db
    .select({ truckId: s.visit.truckId, day: s.visit.scheduledOn, kind: s.visit.kind, town: s.property.town })
    .from(s.visit)
    .innerJoin(s.property, eq(s.property.id, s.visit.propertyId))
    .where(and(eq(s.visit.organizationId, visit.organizationId), inArray(s.visit.truckId, trucks.map((t) => t.id).concat("none")), ne(s.visit.id, visit.id), notInArray(s.visit.status, ["cancelled", "skipped"])))
  const mine = areaOf(visit.town)
  const kind = capacityKind(visit.kind)
  const slots: Slot[] = []
  for (let day = first; day <= last; day = addDays(day, 1)) {
    const weekday = weekdayOf(day)
    for (const truck of trucks.filter((t) => t.workingDays.includes(weekday))) {
      const others = booked.filter((b) => b.truckId === truck.id && b.day === day)
      if (others.some((o) => areaOf(o.town) !== mine)) continue
      if (others.filter((o) => capacityKind(o.kind) === kind).length >= truck.capacityByKind[kind]) continue
      slots.push({ truckId: truck.id, truckName: truck.name, day, areaDay: others.length > 0 })
    }
  }
  return slots
}

/** The first `OFFERED` distinct days, area days before empty ones, in date order. */
export function offeredDays(slots: Slot[]): string[] {
  const days = [...new Set(slots.filter((x) => x.areaDay).map((x) => x.day))]
  for (const d of new Set(slots.map((x) => x.day))) if (days.length < OFFERED && !days.includes(d)) days.push(d)
  return days.slice(0, OFFERED).sort()
}

/** The truck for a picked day: one already working the area, else the first with room. */
export const truckFor = (slots: Slot[], day: string): Slot | undefined => slots.find((x) => x.day === day && x.areaDay) ?? slots.find((x) => x.day === day)
