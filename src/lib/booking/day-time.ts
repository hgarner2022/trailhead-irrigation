// The day-and-time offer a customer picks from, pure (docs/plans/2026-11-18-scheduling-engine-design.md sections 2 and 4.4). A day with the start times still open on it,
// the best day and the best time marked but never selected for the customer, and the words for a booked day and time. Stories use `fixtureDayTimes`; the live screens will
// read the same shape from `schedule.offerDays` and `visits.areaDays` once the slots are built. Nothing here knows about the server.
import { longDay } from "@/lib/portal/words"

/** One open start time: "HH:MM" on a 24-hour clock. `best` is the slot the engine ranks first for that day ("Best fit"); it is marked, never selected. */
export interface StartOption {
  start: string
  best?: boolean
}

/** One offered day: the day, why it is a good one when it is ("We're already in Erie that day."), and the start times open on it. */
export interface DayTimeOffer {
  day: string
  note?: string | null
  /** the day the engine ranks first: the day card that starts selected */
  best?: boolean
  times: StartOption[]
}

/** The day and start the customer holds; `start` stays null until a time is tapped. */
export interface DayTimePick {
  day: string | null
  start: string | null
}

export const NO_PICK: DayTimePick = { day: null, start: null }

export const DAYS_FULL = "These days are full. We'll call you to find one."
export const NONE_FIT = "None of these work? Tell us when"

/** "13:30" gives "1:30 pm"; "09:00" gives "9:00 am". */
export function clock12(start: string): string {
  const [h, m] = start.split(":").map(Number)
  return `${h! % 12 === 0 ? 12 : h! % 12}:${String(m).padStart(2, "0")} ${h! < 12 ? "am" : "pm"}`
}

const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`

/** "Tuesday, April 28 at 10:00 am". */
export const dayAtTime = (day: string, start: string) => `${longDay(day)} at ${clock12(start)}`

/** The day to start selected: the best one, else the soonest. */
export const startDay = (offers: readonly DayTimeOffer[]): string | null => (offers.find((o) => o.best) ?? offers[0])?.day ?? null

/** What one day holds in the fixture: every half hour from 8:00 until the visit still ends by 5:00, thinned by what is already booked. */
function timesFor(minutes: number, taken: readonly string[], best: string | null): { start: string; best?: boolean }[] {
  const out: { start: string; best?: boolean }[] = []
  for (let t = 8 * 60; t <= 17 * 60 - minutes; t += 30) {
    const start = hhmm(t)
    if (!taken.includes(start)) out.push(best === start ? { start, best: true } : { start })
  }
  return out
}

/** The days the offer rule gives a customer (docs/plans/2026-11-18-scheduling-engine-design.md, 4.2), as it labels them. The stories draw these labels; the live screen reads them from `offerFor`. */
export const LABEL_SOONEST = "Soonest open day."
export const labelSameCity = (town: string) => `We're already in ${town} that day.`

/**
 * Five open days for the stories, standing in for `offerFor`: working days (Monday to Friday, no fixed weekdays) on or after `from`, the soonest first, with a few days skipped because they are full.
 * Which weekdays are open is whatever the schedule leaves; nothing here says where Ryan is on which day.
 */
function openDays(from: string): string[] {
  const weekdays: string[] = []
  const d = new Date(`${from}T12:00:00Z`)
  while (weekdays.length < 7) {
    if (d.getUTCDay() >= 1 && d.getUTCDay() <= 5) weekdays.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return [0, 1, 3, 4, 6].map((i) => weekdays[i]!)
}

/**
 * Five open days for the stories, soonest first, from `from` (the first day the visit may be offered: tomorrow, or the day its window opens, whichever is later). The first is "Soonest open day.",
 * the third is the ranked best with "We're already in Erie that day." and its best time "10:30 am", the first nearly full. `minutes` sizes the times to the service (a 60 minute turn-on has more
 * starts than a 120 minute repair). With no `from` they are the April days of 2027 the stories open on.
 */
export function fixtureDayTimes(minutes = 120, town = "Erie", from = "2027-04-15"): DayTimeOffer[] {
  const busy = ["08:30", "09:30", "11:30", "13:00", "14:30"]
  const [d1, d2, d3, d4, d5] = openDays(from) as [string, string, string, string, string]
  return [
    { day: d1, note: LABEL_SOONEST, times: timesFor(minutes, [...busy, "08:00", "09:00", "10:00", "10:30", "11:00", "12:00", "12:30", "13:30", "14:00"], null) },
    { day: d2, times: timesFor(minutes, busy, null) },
    { day: d3, best: true, note: labelSameCity(town), times: timesFor(minutes, ["08:00", "12:00"], "10:30") },
    { day: d4, times: timesFor(minutes, ["09:00"], null) },
    { day: d5, times: timesFor(minutes, [], null) },
  ]
}
