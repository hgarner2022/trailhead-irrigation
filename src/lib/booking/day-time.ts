// The day-and-time offer a customer picks from, pure (docs/plans/2026-11-18-scheduling-engine-design.md sections 2 and 4.4). A day with the start times still open on it,
// the soonest open day the one the calendar starts on, a time never chosen for the customer, and the words for a booked day and time. Stories use `fixtureDayTimes`; the live screens will
// read the same shape from `schedule.offerDays` and `visits.areaDays` once the slots are built. Nothing here knows about the server.
import { longDay } from "@/lib/portal/words"

/** One open start time: "HH:MM" on a 24-hour clock. `best` is the slot the engine ranks first for that day (least added driving); the customer forms mark it "Recommended" (`markBest`), and it is never selected for the customer. */
export interface StartOption {
  start: string
  best?: boolean
}

/** One offered day and the start times open on it. `note` and the day's `best` are the engine's own ranking and are never shown; the day's one mark is the soonest open day. The time marked "Recommended" is the `best` start (Hannah, Nov 25 2026). */
export interface DayTimeOffer {
  day: string
  note?: string | null
  /** the day the engine ranks first; unmarked on every screen */
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

/** Whether a pick can pass: a day and a tapped time, or (with no offers) nothing to wait for. */
export const pickComplete = (offers: readonly DayTimeOffer[], pick: DayTimePick): boolean => offers.length === 0 || (pick.day !== null && pick.start !== null)

/** "13:30" gives "1:30 pm"; "09:00" gives "9:00 am". */
export function clock12(start: string): string {
  const [h, m] = start.split(":").map(Number)
  return `${h! % 12 === 0 ? 12 : h! % 12}:${String(m).padStart(2, "0")} ${h! < 12 ? "am" : "pm"}`
}

const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`

/** The starts the office may give a visit: every half hour from 7:00 am to 5:00 pm, whatever is booked (the customer is offered only the open ones). */
export const OFFICE_STARTS: readonly StartOption[] = Array.from({ length: 21 }, (_, i) => ({ start: hhmm(7 * 60 + i * 30) }))

/** "Tuesday, April 28 at 10:00 am". */
export const dayAtTime = (day: string, start: string) => `${longDay(day)} at ${clock12(start)}`

/** The day to start selected: the soonest open one (a day with no times is not open). */
export const startDay = (offers: readonly DayTimeOffer[]): string | null => offers.filter((o) => o.times.length > 0).map((o) => o.day).sort()[0] ?? null

/** What one day holds in the fixture: every half hour from 8:00 until the visit still ends by 5:00, thinned by what is already booked. */
function timesFor(minutes: number, taken: readonly string[], best: string | null): { start: string; best?: boolean }[] {
  const out: { start: string; best?: boolean }[] = []
  for (let t = 8 * 60; t <= 17 * 60 - minutes; t += 30) {
    const start = hhmm(t)
    if (!taken.includes(start)) out.push(best === start ? { start, best: true } : { start })
  }
  return out
}

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
 * Five open days for the stories, soonest first, from `from` (the first day the visit may be offered: tomorrow, or the day its window opens, whichever is later), the first nearly full.
 * `minutes` sizes the times to the service (a 60 minute turn-on has more starts than a 120 minute repair). With no `from` they are the April days of 2027 the stories open on.
 */
export function fixtureDayTimes(minutes = 120, from = "2027-04-15"): DayTimeOffer[] {
  const busy = ["08:30", "09:30", "11:30", "13:00", "14:30"]
  const [d1, d2, d3, d4, d5] = openDays(from) as [string, string, string, string, string]
  return [
    { day: d1, times: timesFor(minutes, [...busy, "08:00", "09:00", "10:00", "10:30", "11:00", "12:00", "12:30", "13:30", "14:00"], "15:00") },
    { day: d2, times: timesFor(minutes, busy, "10:00") },
    { day: d3, times: timesFor(minutes, ["08:00", "12:00"], "09:00") },
    { day: d4, times: timesFor(minutes, ["09:00"], "10:30") },
    { day: d5, times: timesFor(minutes, [], "10:00") },
  ]
}

const toIso = (d: Date) => d.toISOString().slice(0, 10)
const plusDays = (day: string, n: number) => toIso(new Date(new Date(`${day}T12:00:00Z`).getTime() + n * 86_400_000))

/**
 * The open days for the booking form's calendar, standing in for `offerFor` (docs/plans/2026-11-18-scheduling-engine-design.md, section 4): every working day (Monday to Friday, no fixed weekdays) from
 * `from` to `until` (a service with dates is offered through its next run of dates and no further; one without looks 56 days), soonest first, with about one day in five full (no times, so the
 * calendar greys it), and no label saying where Ryan is on which day. The calendar marks the soonest open day itself.
 */
export function fixtureCalendarDays(minutes = 120, from = "2027-04-15", until?: string): DayTimeOffer[] {
  const end = until ?? plusDays(from, 55)
  const out: DayTimeOffer[] = []
  let weekday = 0
  for (let d = from; d <= end; d = plusDays(d, 1)) {
    const dow = new Date(`${d}T12:00:00Z`).getUTCDay()
    if (dow === 0 || dow === 6) continue
    weekday += 1
    if (weekday > 1 && weekday % 5 === 0) {
      out.push({ day: d, times: [] })
      continue
    }
    const busy = weekday % 3 === 0 ? ["09:00", "09:30", "11:00", "13:30"] : weekday % 2 === 0 ? ["08:30", "12:00"] : ["10:00"]
    // one best start a day, standing in for `offerFor`'s least-added-driving slot: it varies from day to day, and falls back to the first open start when the wanted one is taken
    const open = timesFor(minutes, busy, null).map((t) => t.start)
    const wanted = ["10:00", "13:00", "09:30", "14:00", "11:30"][weekday % 5]!
    const best = open.includes(wanted) ? wanted : (open.find((t) => t >= "09:00") ?? open[0] ?? null)
    out.push({ day: d, times: timesFor(minutes, busy, best) })
  }
  return out
}
