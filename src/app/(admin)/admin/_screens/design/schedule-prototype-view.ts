import { addDays, weekdayOf, WEEKDAYS, worksOn } from "@/lib/admin/calendar"
import { dayFill, fillWords } from "@/lib/admin/day-fill"
import type { Person, Visit } from "@/lib/admin/types"
import { monthOf, shiftMonth, type MonthDay } from "@/components/blocks/month-grid-model"
import { dayColumns } from "@/components/blocks/scheduler-calendar-fixtures"
import type { GridBlock, TimeOff } from "@/components/blocks/time-grid-model"
import type { GridColumn } from "@/components/blocks/time-grid-types"
import { dayShort } from "@/components/blocks/find-a-time-model"
import type { Meta } from "./schedule-prototype-model"

// What the Schedule prototype draws, derived from its state: the days of a week, the columns, the words over them, the map's stops, the month's cells.
// Pure; the screen holds the view and the day, this reads them.

export type View = "week" | "day" | "month" | "list"
export const TIME_ZONE = "America/Denver"

/** The Monday of the week a day is in. */
export const mondayOf = (day: string): string => addDays(day, -WEEKDAYS.indexOf(weekdayOf(day)))

/** Monday to Friday, plus a weekend day that holds a visit or has someone who works it. */
export function weekDaysShown(week: string, people: readonly Person[], visits: readonly GridBlock[]): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(week, i)).filter((d, i) => i < 5 || people.some((p) => worksOn(p, d)) || visits.some((v) => v.day === d))
}

const long = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })
const short = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })

/** "Week of Nov 23", "Wednesday, November 25", "November 2026". */
export function rangeWords(view: View, day: string): string {
  if (view === "week" || view === "list") return `Week of ${short(mondayOf(day))}`
  if (view === "day") return long(day)
  return new Date(`${monthOf(day)}-01T12:00:00Z`).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
}

/** One step back or forward: a day, a week or a month. Month keeps the day of the month where it can. */
export function shift(view: View, day: string, n: number): string {
  if (view === "day") return addDays(day, n)
  if (view === "month") return `${shiftMonth(monthOf(day), n)}-01`
  return addDays(day, 7 * n)
}

/** A visit as the map and the day's fill read it: a point, a stop order and a start. */
export function visitsOf(blocks: readonly GridBlock[], meta: Record<string, Meta>, day?: string): Visit[] {
  const mine = blocks.filter((b) => !day || b.day === day)
  return mine.map((b) => {
    const order = blocks.filter((o) => o.day === b.day && o.personId === b.personId).sort((x, y) => (x.start ?? 1e9) - (y.start ?? 1e9) || x.id.localeCompare(y.id)).findIndex((o) => o.id === b.id)
    const at = b.start ?? 12 * 60
    const m = meta[b.id]
    return {
      id: b.id, clientId: `client_${b.id}`, clientName: m?.customer ?? b.name, town: b.town, kind: b.kind, status: b.done ? "completed" : "scheduled", isPass: false, jobberUrl: "",
      scheduledOn: b.day, personId: b.personId, minutes: b.minutes, stopOrder: order + 1, lat: m?.lat, lng: m?.lng,
      startAt: `${b.day}T${String(Math.floor(at / 60)).padStart(2, "0")}:${String(at % 60).padStart(2, "0")}:00-07:00`,
    }
  })
}

/** The columns over the clock: a Week's days with their counts, or a Day's one column with its fill ("4 stops, 5 h open"). */
export function columnsFor(view: View, day: string, people: readonly Person[], blocks: readonly GridBlock[], meta: Record<string, Meta>, today: string): GridColumn[] {
  if (view === "day") {
    const fill = fillWords(dayFill(visitsOf(blocks, meta, day), day, [...people], TIME_ZONE))
    return dayColumns([day]).map((c) => ({ ...c, today: day === today, count: undefined, caption: fill }))
  }
  const days = weekDaysShown(mondayOf(day), people, blocks)
  // each day reads as the live day header does ("5 stops, 3 h open", `fillWords`), not as "5 visits"
  return dayColumns(days).map((c) => ({ ...c, today: c.day === today, caption: fillWords(dayFill(visitsOf(blocks, meta, c.day), c.day, [...people], TIME_ZONE)) }))
}

/** The month's cells, read from the state alone: a day with a visit or a time off has a cell with its count and towns; the days with neither are empty. */
export function monthDays(blocks: readonly GridBlock[], timeOff: readonly TimeOff[], people: readonly Person[]): MonthDay[] {
  const days = new Set([...blocks.map((b) => b.day), ...timeOff.map((o) => o.day)])
  return [...days].sort().map((day) => {
    const mine = blocks.filter((b) => b.day === day)
    const counts = new Map<GridBlock["town"], number>()
    for (const b of mine) counts.set(b.town, (counts.get(b.town) ?? 0) + 1)
    const off = timeOff.filter((o) => o.day === day)
    const working = people.filter((p) => worksOn(p, day))
    const wholeOff = new Set(off.filter((o) => o.start === null || o.end === null).map((o) => o.personId))
    return {
      day, stops: mine.length, towns: [...counts].sort((a, b) => b[1] - a[1]).map(([t]) => t), personIds: [...new Set(mine.map((b) => b.personId))],
      offIds: [...new Set(off.map((o) => o.personId))], allOff: working.length > 0 && working.every((p) => wholeOff.has(p.id)), notTold: mine.some((b) => b.notTold),
    }
  })
}

/** The day the map shows: the open day, else today when it is in the week, else Monday. */
export function mapDayOf(view: View, day: string, today: string): string {
  if (view === "day") return day
  const week = mondayOf(day)
  return mondayOf(today) === week ? today : week
}

export const mapDayWords = (day: string) => dayShort(day)
