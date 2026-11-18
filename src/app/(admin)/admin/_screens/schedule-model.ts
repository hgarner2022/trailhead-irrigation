/**
 * The pure derivations behind ScheduleScreen: the week's visits by person and
 * day, the counts the header reads and its context line, the move reducer
 * the grid's drag-and-drop calls and the placement of a tray item (`place-model.ts` chooses where). The calendar itself (`weekOf`, `dayVisits` and the rest) lives in
 * `src/lib/admin/calendar.ts`.
 */
import type { AdminData, Pass, PassVisit, Person, TimingPreference, Visit } from "@/lib/admin/types"
import { TIMING_PREFERENCES, TIME_ZONE, fullName, preferenceOf, shortDate, writtenDate } from "@/lib/admin/format"
import { passVisitJob } from "@/lib/admin/jobs"
import { visitMonth } from "@/lib/admin/metrics"
import { addDays, dayOf, dayVisits, sameClockOnDay, weekOf, weekdayName, worksOn } from "@/lib/admin/calendar"

const onCalendar = (v: Visit): v is Visit & { startAt: string } => v.status !== "cancelled" && v.startAt !== undefined

export const exceptionCount = (visits: Visit[]): number => visits.filter((v) => v.exception).length

/** "Week of Nov 9. 12 stops, 2 moved." or "Week of Nov 9. 25 stops."; "Nothing on the calendar." with no visits. */
export function weekContext(weekStart: string, visits: Visit[]): string {
  if (visits.length === 0) return `Week of ${shortDate(weekStart)}. Nothing on the calendar.`
  const count = `${visits.length} stop${visits.length === 1 ? "" : "s"}`
  const moved = exceptionCount(visits)
  return `Week of ${shortDate(weekStart)}. ${count}${moved ? `, ${moved} moved` : ""}.`
}



/**
 * The visit on another person or day, keeping its clock time and landing last in
 * that person's new day; the rest of the day it left closes the gap. A move onto
 * a day the person does not work is refused and the list comes back unchanged.
 */
export function moveVisit(visits: Visit[], visitId: string, personId: string, dayIso: string, people: Person[], timeZone: string): Visit[] {
  const visit = visits.find((v) => v.id === visitId)
  const person = people.find((p) => p.id === personId)
  if (!visit || !onCalendar(visit) || !person || !worksOn(person, dayIso)) return visits
  const fromDay = dayOf(visit.startAt, timeZone)
  if (fromDay === dayIso && visit.personId === personId) return visits
  const startAt = sameClockOnDay(visit.startAt, dayIso, timeZone)
  const stopOrder = dayVisits(visits, dayIso, personId, timeZone).filter((v) => v.id !== visitId).length + 1
  const vacated = dayVisits(visits, fromDay, visit.personId, timeZone).filter((v) => v.id !== visitId)
  return visits.map((v) => {
    if (v.id === visitId) return { ...v, personId, personName: person.name, startAt, stopOrder }
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
export function moveOutcome(visits: Visit[], visitId: string, personId: string, dayIso: string, people: Person[], timeZone: string): MoveOutcome {
  const visit = visits.find((v) => v.id === visitId)
  const person = people.find((p) => p.id === personId)
  if (!visit || !person) return { visits, moved: false, message: "We couldn't find that stop or person." }
  if (!onCalendar(visit)) return { visits, moved: false, message: "That stop has no day to move from." }
  const name = visit.clientName
  if (!worksOn(person, dayIso)) {
    return { visits, moved: false, message: `${person.name} does not work ${weekdayName(dayIso)}, so ${name} stays on ${sentenceDay(dayOf(visit.startAt, timeZone))}.` }
  }
  const next = moveVisit(visits, visitId, personId, dayIso, people, timeZone)
  if (next === visits) return { visits, moved: false, message: `${name} is already with ${person.name} on ${sentenceDay(dayIso)}.` }
  return { visits: next, moved: true, message: `Moved ${name} to ${sentenceDay(dayIso)} with ${person.name}.` }
}

/** A visit that needs a day: one of an active pass, or the first visit of a one-off job taken with no day. */
export interface TrayItem {
  id: string
  clientId: string
  clientName: string
  town: Visit["town"]
  kind: Visit["kind"]
  /** "May", "July", "October"; empty for a one-off job, which has no window */
  window: string
  preference?: TimingPreference
  /** set for a visit of a Season Pass, absent for a one-off job's visit */
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

/** A one-off job's visit with no day: the office took the call and has not given it a day yet. */
function oneOffItem(visit: Visit): TrayItem {
  return { id: visit.id, clientId: visit.clientId, clientName: visit.clientName, town: visit.town, kind: visit.kind, window: "", awaitingPick: visit.awaitingPick, sortKey: "0" }
}

/**
 * What the "Unscheduled" list shows: every visit that has no day. The visits of ACTIVE passes (a job with a day is never
 * here, the state is read off the visit row by `passVisitJob`, the one derivation, and a pending pass's jobs never are: an
 * unpaid attempt is not a customer) and the visits of one-off jobs the app owns (a call taken with no day). Open jobs
 * from the calendar feed are left out (the app cannot place them). One-off visits first (a customer is waiting for a
 * call back), then the earliest window, earlier preferences before later ones inside a window. A visit the screen has
 * put on the calendar since the data was read is left out by its id.
 */
export function trayItems(data: Pick<AdminData, "visits" | "passes">): TrayItem[] {
  const placedIds = new Set(data.visits.filter((v) => v.startAt && v.status !== "cancelled").map((v) => v.id))
  const oneOffs = data.visits.filter((v) => v.jobId && !v.isPass && !v.passId && v.status === "unscheduled" && !v.startAt).map(oneOffItem)
  return [
    ...data.passes
      .filter((p) => p.status === "active")
      .flatMap((p) => p.visits.filter((v) => passVisitJob(p, v, "", TIME_ZONE).state === "needs-a-day").map((v) => passItem(p, v))),
    ...oneOffs,
  ]
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

/**
 * A tray item placed on a person's day at nine in the morning (Mountain), last
 * in that day's order. Placed is scheduled, and the customer gets the date.
 * An item already on the calendar is left alone.
 */
export function placeVisit(visits: Visit[], item: TrayItem, person: Pick<Person, "id" | "name">, dayIso: string, timeZone: string): Visit[] {
  const existing = visits.find((v) => v.id === item.id)
  if (existing?.startAt) return visits
  const startAt = sameClockOnDay("2027-05-03T15:00:00Z", dayIso, timeZone)
  const stopOrder = dayVisits(visits, dayIso, person.id, timeZone).length + 1
  // A visit the data already holds is the existing row given a day; a fixture's pass visit becomes a new row.
  if (existing) return visits.map((v) => (v.id === item.id ? { ...v, status: "scheduled", startAt, scheduledOn: dayIso, personId: person.id, personName: person.name, stopOrder, awaitingPick: undefined } : v))
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
    personId: person.id,
    personName: person.name,
    stopOrder,
  }
  return [...visits, visit]
}
