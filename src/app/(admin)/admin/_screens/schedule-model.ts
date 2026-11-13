/**
 * The pure derivations behind ScheduleScreen: the week's visits by truck and
 * day, the counts the header reads and its context line, the move reducer
 * the grid's drag-and-drop calls and the approval that clears the proposed
 * flags. The calendar itself (`weekOf`, `dayVisits` and the rest) lives with
 * the WeekGrid block and is re-exported here so the screen has one import.
 */
import type { Truck, Visit } from "@/lib/admin/types"
import { shortDate } from "@/lib/admin/format"
import { addDays, dayOf, dayVisits, weekDays, weekVisits, worksOn } from "@/components/blocks/week-grid-days"

export { WEEKDAYS, addDays, areaOf, dayLabel, dayOf, dayVisits, weekDays, weekOf, weekVisits, weekdayOf, worksOn } from "@/components/blocks/week-grid-days"
export { hullOf, type Point } from "@/components/blocks/day-map-helpers"

const utcOf = (dayIso: string) => Date.UTC(Number(dayIso.slice(0, 4)), Number(dayIso.slice(5, 7)) - 1, Number(dayIso.slice(8, 10)))
const onCalendar = (v: Visit): v is Visit & { startAt: string } => v.status !== "cancelled" && v.startAt !== undefined

/** Every truck's visits for every day of the week, in stop order; a truck with nothing that day maps to an empty list. */
export function visitsByTruckAndDay(visits: Visit[], weekStart: string, trucks: Truck[], timeZone: string): Map<string, Map<string, Visit[]>> {
  const days = weekDays(weekStart)
  const inWeek = weekVisits(visits, weekStart, timeZone)
  return new Map(trucks.map((truck) => [truck.id, new Map(days.map((day) => [day, dayVisits(inWeek, day, truck.id, timeZone)]))]))
}

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
  const startAt = new Date(Date.parse(visit.startAt) + (utcOf(dayIso) - utcOf(fromDay))).toISOString().replace(".000Z", "Z")
  const stopOrder = dayVisits(visits, dayIso, truckId, timeZone).filter((v) => v.id !== visitId).length + 1
  const vacated = dayVisits(visits, fromDay, visit.truckId, timeZone).filter((v) => v.id !== visitId)
  return visits.map((v) => {
    if (v.id === visitId) return { ...v, truckId, startAt, stopOrder }
    const gap = vacated.indexOf(v)
    return gap === -1 ? v : { ...v, stopOrder: gap + 1 }
  })
}

/** Every proposed visit in the list approved: the flag comes off and nothing else changes. */
export function approveVisits(visits: Visit[], ids: Set<string>): Visit[] {
  return visits.map((v) => (v.proposed && ids.has(v.id) ? { ...v, proposed: undefined } : v))
}

