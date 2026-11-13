/**
 * The pure derivations behind ScheduleScreen: the week's visits by truck and
 * day, the counts the header reads and its context line, the move reducer
 * the grid's drag-and-drop calls and the approval that clears the proposed
 * flags. The calendar itself (`weekOf`, `dayVisits` and the rest) lives in
 * `src/lib/admin/calendar.ts`.
 */
import type { Truck, Visit } from "@/lib/admin/types"
import { shortDate, writtenDate } from "@/lib/admin/format"
import { dayOf, dayVisits, sameClockOnDay, weekdayName, worksOn } from "@/lib/admin/calendar"

const onCalendar = (v: Visit): v is Visit & { startAt: string } => v.status !== "cancelled" && v.startAt !== undefined

export const proposedCount = (visits: Visit[]): number => visits.filter((v) => v.proposed).length
export const exceptionCount = (visits: Visit[]): number => visits.filter((v) => v.exception).length

/** "Week of Nov 9. 8 proposed, 2 moved in Jobber." Only the counts that are not zero are named; "Nothing on the calendar." with no visits. */
export function weekContext(weekStart: string, visits: Visit[]): string {
  const counts: [number, string][] = [
    [proposedCount(visits), "proposed"],
    [exceptionCount(visits), "moved in Jobber"],
  ]
  const parts = counts.filter(([n]) => n > 0).map(([n, word]) => `${n} ${word}`)
  const tail = visits.length === 0 ? "Nothing on the calendar." : parts.length ? `${parts.join(", ")}.` : `${visits.length} visit${visits.length === 1 ? "" : "s"}.`
  return `Week of ${shortDate(weekStart)}. ${tail}`
}



/**
 * The visit on another truck or day, keeping its clock time and landing last in
 * its new truck-day; the rest of that day closes the gap it left. A move onto a
 * day the truck does not work is refused and the list comes back unchanged.
 */
export function moveVisit(visits: Visit[], visitId: string, truckId: string, dayIso: string, trucks: Truck[], timeZone: string): Visit[] {
  const visit = visits.find((v) => v.id === visitId)
  const truck = trucks.find((t) => t.id === truckId)
  if (!visit || !onCalendar(visit) || !truck || !worksOn(truck, dayIso)) return visits
  const fromDay = dayOf(visit.startAt, timeZone)
  if (fromDay === dayIso && visit.truckId === truckId) return visits
  const startAt = sameClockOnDay(visit.startAt, dayIso, timeZone)
  const stopOrder = dayVisits(visits, dayIso, truckId, timeZone).filter((v) => v.id !== visitId).length + 1
  const vacated = dayVisits(visits, fromDay, visit.truckId, timeZone).filter((v) => v.id !== visitId)
  return visits.map((v) => {
    if (v.id === visitId) return { ...v, truckId, startAt, stopOrder }
    const gap = vacated.indexOf(v)
    return gap === -1 ? v : { ...v, stopOrder: gap + 1 }
  })
}

export interface MoveOutcome {
  visits: Visit[]
  moved: boolean
  /** one sentence for the status line: where it went, or why it stayed */
  message: string
}

const sentenceDay = (dayIso: string) => `${weekdayName(dayIso)}, ${writtenDate(dayIso)}`

/** `moveVisit` plus the words for the screen's status line; a refused move returns the same list. */
export function moveOutcome(visits: Visit[], visitId: string, truckId: string, dayIso: string, trucks: Truck[], timeZone: string): MoveOutcome {
  const visit = visits.find((v) => v.id === visitId)
  const truck = trucks.find((t) => t.id === truckId)
  if (!visit || !onCalendar(visit) || !truck) return { visits, moved: false, message: "That visit cannot be moved." }
  const name = visit.clientName
  if (!worksOn(truck, dayIso)) {
    return { visits, moved: false, message: `${truck.name} does not work ${weekdayName(dayIso)}, so ${name} stays on ${sentenceDay(dayOf(visit.startAt, timeZone))}.` }
  }
  const next = moveVisit(visits, visitId, truckId, dayIso, trucks, timeZone)
  if (next === visits) return { visits, moved: false, message: `${name} is already on ${truck.name} on ${sentenceDay(dayIso)}.` }
  return { visits: next, moved: true, message: `Moved ${name} to ${truck.name} on ${sentenceDay(dayIso)}.` }
}

/** Every proposed visit in the list approved: the flag comes off and nothing else changes. */
export function approveVisits(visits: Visit[], ids: Set<string>): Visit[] {
  return visits.map((v) => (v.proposed && ids.has(v.id) ? { ...v, proposed: undefined } : v))
}

