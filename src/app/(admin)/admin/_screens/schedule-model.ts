/**
 * The pure derivations behind ScheduleScreen: the week's visits by truck and
 * day, the counts the header reads and its context line, the move reducer
 * the grid's drag-and-drop calls and the Schedule button that places the
 * tray. The calendar itself (`weekOf`, `dayVisits` and the rest) lives in
 * `src/lib/admin/calendar.ts`.
 */
import type { AdminData, Pass, PassVisit, TimingPreference, Truck, Visit } from "@/lib/admin/types"
import { TIMING_PREFERENCES, TIME_ZONE, fullName, preferenceOf, shortDate, writtenDate } from "@/lib/admin/format"
import { passVisitJob } from "@/lib/admin/jobs"
import { visitMonth } from "@/lib/admin/metrics"
import { addDays, dayOf, dayVisits, sameClockOnDay, weekDays, weekOf, weekdayName, worksOn } from "@/lib/admin/calendar"

const onCalendar = (v: Visit): v is Visit & { startAt: string } => v.status !== "cancelled" && v.startAt !== undefined

export const exceptionCount = (visits: Visit[]): number => visits.filter((v) => v.exception).length

/** "Week of Nov 9. 12 visits, 2 moved." or "Week of Nov 9. 25 visits."; "Nothing on the calendar." with no visits. */
export function weekContext(weekStart: string, visits: Visit[]): string {
  if (visits.length === 0) return `Week of ${shortDate(weekStart)}. Nothing on the calendar.`
  const count = `${visits.length} visit${visits.length === 1 ? "" : "s"}`
  const moved = exceptionCount(visits)
  return `Week of ${shortDate(weekStart)}. ${count}${moved ? `, ${moved} moved` : ""}.`
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
  if (!visit || !truck) return { visits, moved: false, message: "We couldn't find that visit or truck." }
  if (!onCalendar(visit)) return { visits, moved: false, message: "That visit has no day to move from." }
  const name = visit.clientName
  if (!worksOn(truck, dayIso)) {
    return { visits, moved: false, message: `${truck.name} does not work ${weekdayName(dayIso)}, so ${name} stays on ${sentenceDay(dayOf(visit.startAt, timeZone))}.` }
  }
  const next = moveVisit(visits, visitId, truckId, dayIso, trucks, timeZone)
  if (next === visits) return { visits, moved: false, message: `${name} is already on ${truck.name} on ${sentenceDay(dayIso)}.` }
  return { visits: next, moved: true, message: `Moved ${name} to ${truck.name} on ${sentenceDay(dayIso)}.` }
}

/** A job that needs a day: a visit of an active pass with no day. */
export interface TrayItem {
  id: string
  clientId: string
  clientName: string
  town: Visit["town"]
  kind: Visit["kind"]
  /** "May", "July", "October" */
  window: string
  preference?: TimingPreference
  passId?: string
  /** the customer must be there and picks the day themselves; Schedule leaves it in the list. The tray no longer sets it (a job that needs a day is a job that needs a day), but a caller may. */
  awaitingPick?: boolean
  /** sortable: the first day of the window's month in the pass's season */
  sortKey: string
}

const rank = (p?: TimingPreference) => (p ? TIMING_PREFERENCES.indexOf(p) : 1)

function passItem(pass: Pass, visit: PassVisit): TrayItem {
  const month = visitMonth(visit)
  const preference = preferenceOf(pass, visit.kind) ?? undefined
  return {
    // The visit's own id when the pass carries it, so Place moves the real visit; a stand-in only in the catalog's fixtures.
    id: visit.id ?? `tray-${pass.id}-${visit.kind}`,
    clientId: pass.clientId,
    clientName: fullName(pass.firstName, pass.lastName),
    town: pass.town,
    kind: visit.kind,
    window: visit.window,
    // Used to put earlier customers first inside a window; never shown (the list says what each job needs, a day).
    preference: visit.kind === "inspection" ? undefined : preference,
    passId: pass.id,
    sortKey: `${pass.season}-${String(month ?? 12).padStart(2, "0")}-01`,
  }
}

/**
 * What the "Needs a day" list shows: the jobs that have no day, for ACTIVE
 * passes only. A job with a day is never here (the state is read off the
 * visit row by `passVisitJob`, the one derivation), a pending pass's jobs
 * never are (an unpaid attempt is not a customer), and neither are open
 * jobs from the calendar feed (the app cannot place them). Earliest window first, earlier
 * preferences before later ones inside a window. A visit the screen has put
 * on the calendar since the data was read is left out by its id.
 */
export function trayItems(data: Pick<AdminData, "visits" | "passes">): TrayItem[] {
  const placedIds = new Set(data.visits.filter((v) => v.startAt && v.status !== "cancelled").map((v) => v.id))
  return data.passes
    .filter((p) => p.status === "active")
    .flatMap((p) => p.visits.filter((v) => passVisitJob(p, v, "", TIME_ZONE).state === "needs-a-day").map((v) => passItem(p, v)))
    .filter((item) => !placedIds.has(item.id))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey) || rank(a.preference) - rank(b.preference) || a.clientName.localeCompare(b.clientName))
}

/** The Monday of the first week that has a job on or after this week; this week when none does. The Schedule opens here. */
export function firstJobWeek(visits: Visit[], today: string, timeZone: string): string {
  const thisWeek = weekOf(today, timeZone)
  const days = visits.filter((v) => v.status !== "cancelled" && v.startAt).map((v) => dayOf(v.startAt!, timeZone)).filter((d) => d >= thisWeek)
  return days.length ? weekOf(days.sort()[0], timeZone) : thisWeek
}

/** The Monday of the next week after `weekStart` that has a job, or undefined when no later week does. */
export function nextJobsWeek(visits: Visit[], weekStart: string, timeZone: string): string | undefined {
  const after = addDays(weekStart, 7)
  const days = visits.filter((v) => v.status !== "cancelled" && v.startAt).map((v) => dayOf(v.startAt!, timeZone)).filter((d) => d >= after)
  return days.length ? weekOf(days.sort()[0], timeZone) : undefined
}

/** The first day of the visible week the truck works, else the Monday. */
export function firstWorkingDay(truck: Truck, weekStart: string): string {
  return weekDays(weekStart).find((day) => worksOn(truck, day)) ?? weekStart
}

/**
 * A tray item placed on a truck-day at nine in the morning (Mountain), last
 * in that day's order. Placed is scheduled, and the customer gets the date.
 * An item already on the calendar is left alone.
 */
export function placeVisit(visits: Visit[], item: TrayItem, truckId: string, dayIso: string, timeZone: string): Visit[] {
  const existing = visits.find((v) => v.id === item.id)
  if (existing?.startAt) return visits
  const startAt = sameClockOnDay("2027-05-03T15:00:00Z", dayIso, timeZone)
  const stopOrder = dayVisits(visits, dayIso, truckId, timeZone).length + 1
  // A visit the data already holds is the existing row given a day; a fixture's pass visit becomes a new row.
  if (existing) return visits.map((v) => (v.id === item.id ? { ...v, status: "scheduled", startAt, scheduledOn: dayIso, truckId, stopOrder, awaitingPick: undefined } : v))
  const visit: Visit = {
    id: item.id,
    clientId: item.clientId,
    clientName: item.clientName,
    town: item.town,
    kind: item.kind,
    status: "scheduled",
    startAt,
    scheduledOn: dayIso,
    isPass: item.passId !== undefined,
    jobberUrl: "",
    truckId,
    stopOrder,
  }
  return [...visits, visit]
}

/**
 * The Schedule button: every tray item that is not waiting for its customer
 * goes onto the visible week, round-robin across the trucks and the days
 * they work, in tray order. The real scheduler (wiring plan, Phase 10) adds
 * areas, capacity and the customer's preference; this is the prototype's
 * stand-in so the week fills with one press.
 */
export function scheduleItems(visits: Visit[], items: TrayItem[], trucks: Truck[], weekStart: string, timeZone: string): { visits: Visit[]; placed: number; waiting: number } {
  const slots = trucks.flatMap((truck) => weekDays(weekStart).filter((day) => worksOn(truck, day)).map((day) => ({ truck, day })))
  const waiting = items.filter((i) => i.awaitingPick).length
  if (slots.length === 0) return { visits, placed: 0, waiting }
  let next = visits
  let placed = 0
  items
    .filter((i) => !i.awaitingPick)
    .forEach((item, i) => {
      const slot = slots[i % slots.length]
      const before = next
      next = placeVisit(next, item, slot.truck.id, slot.day, timeZone)
      if (next !== before) placed += 1
    })
  return { visits: next, placed, waiting }
}

