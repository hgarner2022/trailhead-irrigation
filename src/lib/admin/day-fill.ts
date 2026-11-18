/**
 * How full a day is, for the Schedule's day headers (docs/plans/2026-11-18-admin-holistic-design.md, 5.2): the stops in it, the
 * time still open and the towns already in it, so Ryan sees the day filling by neighbourhood. Derived on read from the visits and
 * the people; nothing is stored. Open time is each working person's day (9 to 5 until People carries hours, step 6) less the
 * minutes the day's visits take. Pure.
 */
import type { Person, Town, Visit } from "./types"
import { dayVisits, worksOn } from "./calendar"
import { defaultMinutes } from "@/lib/scheduling/types"

/** A person's working day in minutes: 9 to 5. Step 6 reads it from the person. */
export const DEFAULT_DAY_MINUTES = 8 * 60

export interface DayFill {
  stops: number
  /** how many people work the day */
  working: number
  /** working minutes still unbooked, over everyone who works the day */
  openMinutes: number
  /** the towns already in the day, the most stops first */
  towns: { town: Town; count: number }[]
}

export function dayFill(visits: Visit[], day: string, people: Pick<Person, "workingDays" | "seasonStart" | "seasonEnd">[], timeZone: string): DayFill {
  const stops = dayVisits(visits, day, undefined, timeZone)
  const working = people.filter((p) => worksOn(p, day) && (!p.seasonStart || day >= p.seasonStart.slice(0, 10)) && (!p.seasonEnd || day <= p.seasonEnd.slice(0, 10))).length
  const booked = stops.reduce((n, v) => n + (v.minutes ?? defaultMinutes(v.kind)), 0)
  const counts = new Map<Town, number>()
  for (const v of stops) counts.set(v.town, (counts.get(v.town) ?? 0) + 1)
  const towns = [...counts].map(([town, count]) => ({ town, count })).sort((a, b) => b.count - a.count || a.town.localeCompare(b.town))
  return { stops: stops.length, working, openMinutes: Math.max(0, working * DEFAULT_DAY_MINUTES - booked), towns }
}

/** "3 h", "45 min", "3 h 30 min". */
export function hoursWords(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ") || "0 min"
}

/** The line under a day's name: "5 stops, 3 h open", "No stops", "Day off" when no one works it, "5 stops, full" when nothing is open. */
export function fillWords(fill: DayFill): string {
  if (fill.stops === 0) return fill.working === 0 ? "Day off" : "No stops"
  const count = `${fill.stops} ${fill.stops === 1 ? "stop" : "stops"}`
  return fill.openMinutes === 0 ? `${count}, full` : `${count}, ${hoursWords(fill.openMinutes)} open`
}

/** "Erie 3, Lafayette 2"; empty for an empty day. */
export const townsWords = (fill: DayFill): string => fill.towns.map((t) => `${t.town} ${t.count}`).join(", ")
