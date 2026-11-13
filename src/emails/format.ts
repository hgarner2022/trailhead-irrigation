// Pure wording helpers shared by the email and text templates. No imports, so a template stays a pure function.

export const BUSINESS = {
  name: "Trailhead Lawn & Irrigation",
  address: "137 Morgan Circle North, Erie, CO 80516",
  phone: "(970) 692-7270",
  phoneTel: "tel:9706927270",
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

const parts = (day: string) => {
  const [y, m, d] = day.slice(0, 10).split("-").map(Number) as [number, number, number]
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() }
}

/** "Tuesday, May 5" from an ISO day. */
export function longDay(day: string): string {
  const { m, d, weekday } = parts(day)
  return `${WEEKDAYS[weekday]}, ${MONTHS[m - 1]} ${d}`
}

/** "Tue, May 5" for a text. */
export function shortDay(day: string): string {
  const { m, d, weekday } = parts(day)
  return `${WEEKDAYS[weekday]!.slice(0, 3)}, ${MONTHS[m - 1]!.slice(0, 3)} ${d}`
}

/** "8 to 10 am" for a visit that starts at 08:00: the two-hour window. */
export function windowText(startTime: string): string {
  const hour = Number(startTime.slice(0, 2))
  const end = hour + 2
  const word = (h: number) => `${h % 12 === 0 ? 12 : h % 12}`
  const ampm = (h: number) => (h >= 12 ? "pm" : "am")
  return ampm(hour) === ampm(end) ? `${word(hour)} to ${word(end)} ${ampm(end)}` : `${word(hour)} ${ampm(hour)} to ${word(end)} ${ampm(end)}`
}

export const dollars = (n: number) => `$${n.toLocaleString("en-US")}`

/** "Tuesday, May 5, between 8 and 10 am" or just the day when no time is set. */
export function whenText(day: string, startTime: string | null): string {
  return startTime ? `${longDay(day)}, between ${windowText(startTime).replace(" to ", " and ")}` : longDay(day)
}

/** The visit as the messages know it. `name` reads in a sentence ("spring turn-on"). */
export interface VisitFacts {
  id: string
  name: string
  /** ISO day */
  day: string
  /** "08:00", or null while only the day is known */
  startTime: string | null
  /** who is coming, as a sentence subject ("Ryan's truck"); null reads as "Ryan" */
  crew: string | null
  /** street address and town, for the calendar's location */
  location: string
  /** the app's signed link to the .ics file */
  icsUrl: string
}

export const crewOf = (v: VisitFacts) => v.crew ?? "Ryan"

/** What every dated message and the done step say about confirming a visit, so no screen promises a different timeline. */
export const CONFIRM_LINE = "We confirm it by text two weeks before and remind you the day before. If it has to move, we tell you first and you can pick another day."

/** What Ryan does at each visit, one plain line, as the done step and the confirmation say it. */
export const RYAN_DOES = {
  "turn-on": "Ryan turns the water on, runs every zone and checks the heads.",
  inspection: "Ryan runs every zone and looks for coverage gaps, clogged nozzles and zones that run long, then adjusts what he finds.",
  blowout: "Ryan blows the water out of every line before the first hard freeze.",
} as const

const andList = (items: string[]) => (items.length <= 2 ? items.join(" and ") : `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`)

/** "You pay $0 today. We charge $145 after the spring turn-on and $95 after the fall blowout to the card ending 4242." */
export function moneyLine(visits: { name: string; amount: number }[], cardLast4: string | null | undefined): string {
  return `You pay $0 today. We charge ${andList(visits.map((v) => `${dollars(v.amount)} after the ${v.name}`))}${cardLast4 ? ` to the card ending ${cardLast4}` : ""}.`
}

/** The line for a visit whose chosen day filled up before the card was saved. */
export const filledLine = (from: string, to: string) => `Your first choice, ${longDay(from)}, filled up, so we put it on ${longDay(to)}.`
