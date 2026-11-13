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
