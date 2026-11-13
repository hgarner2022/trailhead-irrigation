/**
 * The calendar behind WeekGrid and the schedule: which Monday a date belongs
 * to, the seven days of a week, a day's or a week's visits in stop order, the
 * area a town sits in and the days a truck works. Every calendar word is read
 * in the given time zone, so a 7 pm Denver visit stays on its Mountain day.
 * Day keys are YYYY-MM-DD. Pure, so it runs in jsdom and on the server.
 */
import type { AreaGroup, BusyBlock, Town, Truck, Visit, Weekday } from "@/lib/admin/types"

export type { BusyBlock }

export const WEEKDAYS: readonly Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
const WEEKDAY_WORDS: Record<Weekday, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" }
const DAY_MS = 86_400_000

const formatters = new Map<string, Intl.DateTimeFormat>()
const formatter = (timeZone: string) => {
  let f = formatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    formatters.set(timeZone, f)
  }
  return f
}

/** The calendar day of `iso` as YYYY-MM-DD: the prefix of a date-only string, else the day in `timeZone`. */
export function dayOf(iso: string, timeZone: string): string {
  return iso.length > 10 ? formatter(timeZone).format(new Date(iso)) : iso.slice(0, 10)
}

const utcOf = (dayIso: string) => Date.UTC(Number(dayIso.slice(0, 4)), Number(dayIso.slice(5, 7)) - 1, Number(dayIso.slice(8, 10)))

/** `dayIso` plus `n` calendar days (negative to go back). */
export function addDays(dayIso: string, n: number): string {
  return new Date(utcOf(dayIso) + n * DAY_MS).toISOString().slice(0, 10)
}

/** The weekday of a calendar day, Monday first. */
export function weekdayOf(dayIso: string): Weekday {
  return WEEKDAYS[(new Date(utcOf(dayIso)).getUTCDay() + 6) % 7]
}

/** The Monday of the week `iso` falls in, in `timeZone`. */
export function weekOf(iso: string, timeZone: string): string {
  const day = dayOf(iso, timeZone)
  return addDays(day, -WEEKDAYS.indexOf(weekdayOf(day)))
}

/** The seven days from a Monday. */
export function weekDays(weekStart: string): string[] {
  return WEEKDAYS.map((_, i) => addDays(weekStart, i))
}

/** "Mon 9" for a column header; "Monday, November 9" is `writtenDate` in ./format. */
export function dayLabel(dayIso: string): string {
  return `${WEEKDAY_WORDS[weekdayOf(dayIso)]} ${Number(dayIso.slice(8, 10))}`
}

const onCalendar = (v: Visit): v is Visit & { startAt: string } => v.status !== "cancelled" && v.startAt !== undefined
const byStop = (a: Visit, b: Visit) =>
  (a.stopOrder ?? Infinity) - (b.stopOrder ?? Infinity) || (a.startAt ?? "").localeCompare(b.startAt ?? "")

/** The visits that fall in the week starting on the Monday `weekStart`, in `timeZone`. */
export function weekVisits(visits: Visit[], weekStart: string, timeZone: string): Visit[] {
  const end = addDays(weekStart, 7)
  return visits.filter((v) => {
    if (!onCalendar(v)) return false
    const day = dayOf(v.startAt, timeZone)
    return day >= weekStart && day < end
  })
}

/** A day's visits, on one truck when `truckId` is given, by stop order then start time. */
export function dayVisits(visits: Visit[], dayIso: string, truckId: string | undefined, timeZone: string): Visit[] {
  return visits
    .filter((v) => onCalendar(v) && dayOf(v.startAt, timeZone) === dayIso && (truckId === undefined || v.truckId === truckId))
    .sort(byStop)
}

/** The area group a town belongs to; undefined when no group has it. */
export function areaOf(town: Town, areas: AreaGroup[]): AreaGroup | undefined {
  return areas.find((a) => a.towns.includes(town))
}

/** Whether a truck works on the weekday of `dayIso`. */
export function worksOn(truck: Truck, dayIso: string): boolean {
  return truck.workingDays.includes(weekdayOf(dayIso))
}

const clockFormatters = new Map<string, Intl.DateTimeFormat>()
/** The zone's offset from UTC in milliseconds at the instant `ms` (negative west of Greenwich). */
function offsetAt(ms: number, timeZone: string): number {
  let f = clockFormatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" })
    clockFormatters.set(timeZone, f)
  }
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, Number(x.value)]))
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000
}

/** The same wall-clock time (hour, minute, second) in `timeZone` as `fromIso`, on the calendar day `dayIso`, as a UTC instant ("...Z"). Across a clock change the time stays 9 am, not 9 am plus an hour. */
export function sameClockOnDay(fromIso: string, dayIso: string, timeZone: string): string {
  const local = new Date(Date.parse(fromIso) + offsetAt(Date.parse(fromIso), timeZone))
  const wall = Date.UTC(Number(dayIso.slice(0, 4)), Number(dayIso.slice(5, 7)) - 1, Number(dayIso.slice(8, 10)), local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds())
  // The offset on the new day can differ; settle on the instant whose local reading is `wall`.
  let ms = wall - offsetAt(wall, timeZone)
  ms = wall - offsetAt(ms, timeZone)
  return new Date(ms).toISOString().replace(".000Z", "Z")
}

const WEEKDAY_NAMES: Record<Weekday, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" }
/** "Thursday" for 2026-11-12. */
export const weekdayName = (dayIso: string): string => WEEKDAY_NAMES[weekdayOf(dayIso)]

/** The UTC instant whose wall-clock reading in `timeZone` is the given fields (month 1 to 12). */
export function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, timeZone: string): Date {
  const wall = Date.UTC(y, mo - 1, d, h, mi, s)
  let ms = wall - offsetAt(wall, timeZone)
  ms = wall - offsetAt(ms, timeZone)
  return new Date(ms)
}

/** A truck's working day, in the zone's wall clock: busy time inside it counts against capacity, an all-day event fills all of it. */
export const WORKDAY = { startHour: 7, endHour: 17 } as const
export const WORKDAY_MINUTES = (WORKDAY.endHour - WORKDAY.startHour) * 60

/** The working day of `dayIso` as two UTC instants. */
function workdayBounds(dayIso: string, timeZone: string): [number, number] {
  const [y, m, d] = [Number(dayIso.slice(0, 4)), Number(dayIso.slice(5, 7)), Number(dayIso.slice(8, 10))]
  return [zonedToUtc(y, m, d, WORKDAY.startHour, 0, 0, timeZone).getTime(), zonedToUtc(y, m, d, WORKDAY.endHour, 0, 0, timeZone).getTime()]
}

/** The blocks of `truckId` that overlap the working day of `dayIso`. */
export function blocksOn(blocks: BusyBlock[], truckId: string, dayIso: string, timeZone: string): BusyBlock[] {
  const [open, close] = workdayBounds(dayIso, timeZone)
  return blocks.filter((b) => b.truckId === truckId && Date.parse(b.startAt) < close && Date.parse(b.endAt) > open)
}

/** Minutes of the working day on `dayIso` that the truck's blocks cover (overlapping blocks counted once). */
export function blockedMinutes(blocks: BusyBlock[], truckId: string, dayIso: string, timeZone: string): number {
  const [open, close] = workdayBounds(dayIso, timeZone)
  const spans = blocksOn(blocks, truckId, dayIso, timeZone)
    .map((b) => [Math.max(open, Date.parse(b.startAt)), Math.min(close, Date.parse(b.endAt))] as const)
    .sort((a, b) => a[0] - b[0])
  let total = 0
  let reach = open
  for (const [from, to] of spans) {
    const start = Math.max(from, reach)
    if (to > start) { total += to - start; reach = to }
  }
  return Math.round(total / 60_000)
}

/** The capacity left on a truck-day after its busy time: all of it with no blocks, none when the day is covered, else scaled by the share of the working day still free (rounded down, so a half-booked day holds half the visits). */
export function capacityAfterBlocks(remaining: number, blockedMin: number): number {
  if (blockedMin <= 0) return remaining
  if (blockedMin >= WORKDAY_MINUTES) return 0
  return Math.floor(remaining * (1 - blockedMin / WORKDAY_MINUTES))
}
