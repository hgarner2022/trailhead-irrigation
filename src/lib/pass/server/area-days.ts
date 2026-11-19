import "server-only"
import type { Database } from "@/db/types"
import { routePeople } from "@/api/v1/people/handlers"
import { loadOpenDays } from "@/lib/scheduling/server/offers"
import type { Town } from "@/lib/scheduling/types"

/** How many days the pass page and the checkout offer. */
export const OFFERED = 3
/** The most a screen may ask for (the portal's Reschedule asks for this many); `visits.pick` accepts any day the offer would give at this count. */
export const MAX_OFFERED = 5

export interface PickVisit {
  id: string
  organizationId: string
  kind: string
  town: string
}

export interface Slot {
  personId: string
  personName: string
  day: string
  /** "HH:MM", the person's first open start that day */
  start: string
  /** the person already has visits that day */
  areaDay: boolean
}

/**
 * Open days for this visit, earliest first, one entry per person who has room: the offer rule's open days (docs/plans/2026-11-18-scheduling-engine-design.md,
 * section 4: tomorrow at the earliest, the service's bookable dates, hours per person, a gap of the service's length after the drive
 * cushion, under the person's cap, the visit itself leaving its present day). The person whose slot adds the least drive comes first on a
 * day, so `personFor` takes them; `areaDay` marks a person who already has visits that day.
 */
export async function openSlots(db: Database, visit: PickVisit, today: string, season?: number): Promise<Slot[]> {
  const { open, inputs } = await loadOpenDays(db, { organizationId: visit.organizationId, kind: visit.kind, town: visit.town as Town, visitId: visit.id || undefined, season, today })
  const names = new Map((await routePeople({ db, organizationId: visit.organizationId })).map((p) => [p.id, p.name]))
  const out: Slot[] = []
  for (const o of open) {
    const seen = new Set<string>()
    // slots are ordered by least added drive: the first person met is the best for the day
    for (const x of o.slots) {
      if (seen.has(x.personId)) continue
      seen.add(x.personId)
      const mine = o.slots.filter((y) => y.personId === x.personId).map((y) => y.start).sort()
      out.push({ personId: x.personId, personName: names.get(x.personId) ?? "", day: o.day, start: mine[0]!, areaDay: inputs.booked.some((b) => b.personId === x.personId && b.day === o.day) })
    }
  }
  return out
}

/** The person for a picked day: one already working that day, else the first with room (the one whose slot adds the least drive). */
export const personFor = (slots: Slot[], day: string): Slot | undefined => slots.find((x) => x.day === day && x.areaDay) ?? slots.find((x) => x.day === day)
