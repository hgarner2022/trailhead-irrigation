/**
 * The calendar behind WeekGrid and the schedule: which Monday a date belongs
 * to, the seven days of a week, a day's or a week's visits in stop order, the
 * area a town sits in and the days a truck works. Every calendar word is read
 * in the given time zone, so a 7 pm Denver visit stays on its Mountain day.
 * Day keys are YYYY-MM-DD. Pure, so it runs in jsdom and on the server.
 */
import type { AreaGroup, Town, Truck, Visit, Weekday } from "@/lib/admin/types"

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
