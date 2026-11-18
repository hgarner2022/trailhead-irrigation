// Pure wording helpers shared by the email and text templates. No imports, so a template stays a pure function.

/** What every message calls the customer's page: the one name in every link, button and sentence (`your ${ACCOUNT_NAME}`). The portal design (docs/plans/2026-11-18-customer-portal-design.md) set it. */
export const ACCOUNT_NAME = "Trailhead account"

/** The one link every money email carries to the customer's page. */
export const SEE_JOB = `See this job in your ${ACCOUNT_NAME}`

/** The line above the footer of every customer email. */
export const SIGN_OFF = "The Trailhead crew"

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

/** "Friday, November 20, with Ryan"; just the day when no one has the visit. */
export const whoWithDay = (day: string, who: string | null | undefined) => `${longDay(day)}${who ? `, with ${who}` : ""}`

/** "Tue, May 5" for a text. */
export function shortDay(day: string): string {
  const { m, d, weekday } = parts(day)
  return `${WEEKDAYS[weekday]!.slice(0, 3)}, ${MONTHS[m - 1]!.slice(0, 3)} ${d}`
}

/** "Dec 1" for a text or a line that names a due day. */
export function monthDay(day: string): string {
  const { m, d } = parts(day)
  return `${MONTHS[m - 1]!.slice(0, 3)} ${d}`
}

/** "8 to 10 am" for a visit that starts at 08:00: the two-hour window. */
export function windowText(startTime: string): string {
  const hour = Number(startTime.slice(0, 2))
  const end = hour + 2
  const word = (h: number) => `${h % 12 === 0 ? 12 : h % 12}`
  const ampm = (h: number) => (h >= 12 ? "pm" : "am")
  return ampm(hour) === ampm(end) ? `${word(hour)} to ${word(end)} ${ampm(end)}` : `${word(hour)} ${ampm(hour)} to ${word(end)} ${ampm(end)}`
}

/** "$1,234"; a credit reads "-$45", never "$-45". */
export const dollars = (n: number) => (n < 0 ? `-$${(-n).toLocaleString("en-US")}` : `$${n.toLocaleString("en-US")}`)

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
  /** the first name of the person on the visit ("Ryan"); null while the visit has no one, and then the messages say nothing about who */
  who: string | null
  /** the property's gate code and on-site contact, when it has them; no template says them yet (step 3 writes them into the facts only) */
  gateCode?: string
  contactName?: string
  /** the street address alone ("412 Ash St"), for a sentence that says where */
  address: string
  /** street address and town, for the calendar's location */
  location: string
  /** the app's signed link to the .ics file */
  icsUrl: string
  /** the signed link to this visit's page, which opens already signed in as the customer (`visitLinkUrl`); texts carry it, absent in older rows */
  visitUrl?: string
}

/** Who is coming, as a sentence subject: the person's first name, else "Ryan and the crew" while the visit has no one. */
export const whoIsComing = (v: Pick<VisitFacts, "who">) => v.who ?? "Ryan and the crew"

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

/** The money line of a pass sold by the office with no card and no link to add one: "You pay $145 after the spring turn-on and $95 after the fall blowout, by check, Venmo or cash at the visit." */
export function atVisitMoneyLine(visits: { name: string; amount: number }[]): string {
  return `You pay ${andList(visits.map((v) => `${dollars(v.amount)} after the ${v.name}`))}, by check, Venmo or cash at the visit.`
}

/** The line under the money line when the card is still to be added: the office sold the pass and emailed the link. */
export const ADD_CARD_LINE = `Add your card from the link below and we charge it after each visit. The link is good for 24 hours; your ${ACCOUNT_NAME} can make a new one any time.`

/** The line for a visit whose chosen day filled up before the card was saved. */
export const filledLine = (from: string, to: string) => `Your first choice, ${longDay(from)}, filled up, so we put it on ${longDay(to)}.`
