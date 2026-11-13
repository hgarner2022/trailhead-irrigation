/**
 * The "Your days" step's data, pure: the days the server offers for each visit, the day the customer holds for each, and the
 * words for a day and its window. The first offer is preselected, so Continue with nothing touched gives good dates.
 */
import { writtenDate } from "@/lib/admin/format"

export type DayKind = "turn-on" | "inspection" | "blowout"

/** One offered day: the day, the truck behind it, where its two-hour window opens and the window in words ("8 to 10 am"). */
export interface DayOffer {
  day: string
  truckId: string
  start: string
  window: string
}

/** What the server offered per visit; a visit with no entry (or none open) gets its day from Ryan. */
export type Offers = Partial<Record<DayKind, DayOffer[]>>

/** The day the customer holds for one visit. */
export interface DayChoice extends DayOffer {
  kind: DayKind
}

export const DAY_KINDS: readonly DayKind[] = ["turn-on", "inspection", "blowout"]

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

/** "Tuesday, May 5": the day as it is written on a card and in the done step. */
export const dayWords = (iso: string) => `${WEEKDAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()]}, ${writtenDate(iso)}`

/** "between 8 and 10 am" from "8 to 10 am". */
export const windowWords = (window: string) => `between ${window.replace(" to ", " and ")}`

/** The heading over each visit's three cards. */
export const DAY_HEADINGS: Record<DayKind, string> = { "turn-on": "Your spring turn-on", inspection: "Your July inspection", blowout: "Your fall blowout" }

const same = (a: DayOffer, b: DayOffer) => a.day === b.day && a.truckId === b.truckId

/**
 * The days held after a fresh set of offers: a day the customer already chose stays when it is still offered; every other visit
 * with offers takes the first one. A visit with no offers holds nothing.
 */
export function choicesAfterOffer(offers: Offers, held: readonly DayChoice[]): DayChoice[] {
  return DAY_KINDS.flatMap((kind) => {
    const list = offers[kind] ?? []
    const keep = held.find((h) => h.kind === kind && list.some((o) => same(o, h)))
    const pick = keep ?? list[0]
    return pick ? [{ kind, day: pick.day, truckId: pick.truckId, start: pick.start, window: pick.window }] : []
  })
}

/** The held days with one visit's choice replaced. */
export const withChoice = (held: readonly DayChoice[], offer: DayOffer, kind: DayKind): DayChoice[] => [...held.filter((h) => h.kind !== kind), { kind, ...offer }]

/** Whether every visit that has offers also has a held day: the step can pass. A visit with no offers needs nothing. */
export const daysComplete = (offers: Offers | null, held: readonly DayChoice[]): boolean =>
  offers !== null && DAY_KINDS.every((kind) => (offers[kind]?.length ?? 0) === 0 || held.some((h) => h.kind === kind))

const nextWeekday = (iso: string, weekday: number): string => {
  const d = new Date(`${iso}T12:00:00Z`)
  while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** Stand-in offers for the stories and the unwired prototype, in the shape the server gives: early, middle and late in each window. */
export function fixtureOffers(season: number, kinds: readonly DayKind[]): Offers {
  const make = (picks: [string, number][]) => picks.map(([from, weekday]) => ({ day: nextWeekday(from, weekday), truckId: "truck-1", start: "08:00", window: "8 to 10 am" }))
  const all: Offers = {
    "turn-on": make([[`${season}-05-04`, 2], [`${season}-05-17`, 4], [`${season}-05-24`, 2]]),
    inspection: make([[`${season}-07-06`, 3], [`${season}-07-15`, 2], [`${season}-07-27`, 4]]),
    blowout: make([[`${season}-10-05`, 2], [`${season}-10-14`, 4], [`${season}-10-26`, 2]]),
  }
  return Object.fromEntries(kinds.map((k) => [k, all[k]])) as Offers
}
