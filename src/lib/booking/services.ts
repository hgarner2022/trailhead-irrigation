// The services a customer meets in the booking form: ONE catalogue, built from the backend's `SERVICE_LIST` (src/lib/services.ts, the rows of the `service` table), so a booking entry can only name a
// service the backend has (docs/plans/2026-11-19-booking-form-design.md, "One catalogue"). Price, length and what a visit includes are read from those rows; this file adds only how a service reads
// on the form (its name, whether it asks for zones, the questions that belong to it). Every entry carries `online`, the same three as Settings > Services' Online select: "bookable" (Book a day) is
// in the booking list, "quote" (We quote) is on the request path only, "off" appears nowhere. `online` is worked out from the rows (`bookable`, `quoteOnly`) unless Settings says otherwise, so turning
// a service Off in Settings is `bookingCatalogue({ repair: "off" })` and the card is gone. A price the catalogue does not have is never invented: it reads "Price set at the visit". Pure.
import { SERVICE_LIST, serviceCost, type ServiceDef } from "@/lib/services"
import type { PassVisitKind, VisitMode } from "@/lib/booking/pass-visits"

/** One visit on the Season Pass card in the service list: its name, its price and how it gets its day (an exact day and time now, or a preference). */
export interface PassVisitLine {
  kind: PassVisitKind
  name: string
  /** "From $145" */
  price: string
  mode: VisitMode
}

export type ServiceKind =
  /** the Season Pass: two visits, priced per zone */
  | "pass"
  /** a service with a day and time */
  | "day"
  /** not booked online: the flow ends with a request */
  | "quote"

/** Settings > Services' Online select: Book a day, We quote, Off. */
export type Online = "bookable" | "quote" | "off"

/** Which service-specific questions the details ask, besides the ones every visit has. */
export type DetailsKind = "rachio" | "efficiency" | "install"

/** The three visits that have a season: the single services read their opening day from the same windows as the pass. */
export type WindowKind = "turn-on" | "inspection" | "blowout"

export interface ServiceEntry {
  key: string
  name: string
  /** the backend `service` keys behind this entry (a service sold by zone band has one row per band); empty for the Season Pass, which is a job and not a row */
  serviceKeys: readonly string[]
  /** where the service is offered; the form's two lists are derived from this */
  online: Online
  /** "$145", "From $145" or "Price set at the visit" */
  price: string
  /** "About 2 hours" */
  length?: string
  /** what a visit includes, the catalogue's own text */
  included?: string
  kind: ServiceKind
  /** minutes a visit takes: sizes the start times */
  minutes?: number
  /** minutes for a zone count, where the catalogue's length depends on it (a turn-on is 60, 90 or 120) */
  minutesFor?: (zones: number) => number
  /** whether the price depends on the zone count: the card asks for zones */
  perZone?: boolean
  /** the price for a zone count; absent when the catalogue has no price (the visit sets it) */
  amount?: number | ((zones: number) => number)
  /** the service-specific questions on the card */
  details?: DetailsKind
  /** the season this single visit belongs to, so the days offered start when its window opens */
  window?: WindowKind
  /** the Season Pass only: the visits still ahead for the date */
  passVisits?: PassVisitLine[]
}

/** What the booking form says about a backend service: only how it reads, never a price or a length. */
interface Presentation {
  key: string
  name: string
  serviceKeys: readonly string[]
  kind: ServiceKind
  perZone?: boolean
  details?: DetailsKind
  window?: WindowKind
}

export const PRICE_AT_VISIT = "Price set at the visit"
export const REQUEST_QUOTE = "Need a quote? Request one"
export const QUOTE_DONE = "Thanks. We've got your request."

const PRESENTATION: readonly Presentation[] = [
  { key: "season-pass", name: "Season Pass", serviceKeys: [], kind: "pass", perZone: true },
  { key: "spring-turn-on", name: "Spring turn-on", serviceKeys: ["turn-on-8", "turn-on-12", "turn-on-16"], kind: "day", perZone: true, window: "turn-on" },
  { key: "fall-blowout", name: "Fall blowout", serviceKeys: ["blowout"], kind: "day", perZone: true, window: "blowout" },
  { key: "inspection", name: "Mid-season inspection", serviceKeys: ["inspection-8", "inspection-12", "inspection-16"], kind: "day", perZone: true, window: "inspection" },
  { key: "repair", name: "Sprinkler repair", serviceKeys: ["repair"], kind: "day" },
  { key: "consult", name: "Free consultation", serviceKeys: ["consult"], kind: "day" },
  { key: "rachio-install", name: "Rachio smart controller install", serviceKeys: ["rachio-install-8", "rachio-install-16"], kind: "day", perZone: true, details: "rachio" },
  { key: "water-efficiency", name: "Water efficiency and drip", serviceKeys: ["water-efficiency"], kind: "day", details: "efficiency" },
  { key: "install", name: "New sprinkler system installation", serviceKeys: ["install"], kind: "day", details: "install" },
  { key: "big-repair", name: "Larger sprinkler repair", serviceKeys: ["repair-large"], kind: "quote" },
  { key: "lights", name: "Christmas lights", serviceKeys: ["lights"], kind: "quote" },
  { key: "aeration", name: "Core aeration", serviceKeys: ["aeration"], kind: "day" },
]

export const money = (n: number) => `$${n.toLocaleString("en-US")}`

/** "About 1 hour", "About 1 hour 30 minutes", "About 30 minutes". */
export function lengthWords(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `About ${m} minutes`
  return `About ${h} hour${h === 1 ? "" : "s"}${m ? ` ${m} minutes` : ""}`
}

/** The rows' own text for what a visit includes, without the sentences that are about quotes or a return visit: the form says what the visit is, not what it is not. */
export function includedWords(description: string): string {
  const kept = description.split(/(?<=\.)\s+/).filter((s) => !/\bquot|in writing|return visit/i.test(s))
  return (kept.length ? kept : [description]).join(" ")
}

/** What Settings > Services' Online select holds for a row: Book a day (`bookable`), We quote (`quoteOnly`), or Off. */
export const onlineOfRow = (row: Pick<ServiceDef, "bookable" | "quoteOnly">): Online => (row.bookable ? "bookable" : row.quoteOnly ? "quote" : "off")

/** The row for a zone count: the band that fits, else the last band (a count above the largest band is priced at it). */
const rowFor = (rows: readonly ServiceDef[], zones: number) => rows.find((r) => (r.minZones === undefined || zones >= r.minZones) && (r.maxZones === undefined || zones <= r.maxZones)) ?? rows[rows.length - 1]!

function entryOf(p: Presentation, overrides: Partial<Record<string, Online>>): ServiceEntry {
  const rows = p.serviceKeys.map((k) => SERVICE_LIST.find((s) => s.key === k)).filter((r): r is ServiceDef => Boolean(r))
  if (p.kind !== "pass" && rows.length !== p.serviceKeys.length) throw new Error(`The booking entry ${p.key} names a service the backend does not have`)
  const first = rows[0]
  const online: Online = overrides[p.key] ?? (p.kind === "pass" ? "bookable" : onlineOfRow({ bookable: rows.some((r) => r.bookable), quoteOnly: rows.some((r) => r.quoteOnly) }))
  const priced = first?.price !== undefined
  const amount = !first || !priced ? undefined : p.perZone ? (zones: number) => serviceCost(rowFor(rows, zones), zones)! : first.price
  const lowest = typeof amount === "function" ? amount(1) : amount
  const quoted = online === "quote" || p.kind === "quote"
  return {
    key: p.key,
    name: p.name,
    serviceKeys: p.serviceKeys,
    online,
    price: p.kind === "pass" ? "" : quoted ? "" : lowest === undefined ? PRICE_AT_VISIT : lowest === 0 ? "Free" : `${p.perZone ? "From " : ""}${money(lowest)}`,
    ...(first && !quoted ? { length: lengthWords(first.slotMinutes) } : {}),
    ...(first ? { included: includedWords(first.description) } : {}),
    kind: online === "quote" ? "quote" : p.kind === "quote" ? "day" : p.kind,
    minutes: first?.slotMinutes ?? 60,
    ...(rows.length > 1 && p.window ? { minutesFor: (zones: number) => rowFor(rows, zones).slotMinutes } : {}),
    ...(p.perZone ? { perZone: true } : {}),
    ...(amount !== undefined ? { amount } : {}),
    ...(p.details ? { details: p.details } : {}),
    ...(p.window ? { window: p.window } : {}),
  }
}

/**
 * The booking catalogue for what Settings holds: every presentation entry joined to its backend rows, with `online` from the rows or from `overrides` (keyed by the entry's key). Turning a service Off
 * in Settings is an override of "off": the entry is still here, and neither list below contains it.
 */
export function bookingCatalogue(overrides: Partial<Record<string, Online>> = {}): ServiceEntry[] {
  return PRESENTATION.map((p) => entryOf(p, overrides))
}

/** The booking list of a catalogue: what is set to "Book a day", in the catalogue's order. */
export const bookableOf = (catalogue: readonly ServiceEntry[]): ServiceEntry[] => catalogue.filter((s) => s.online === "bookable")

/** What a customer asks for a quote on: the services set to "We quote". They are never in the booking list; the request path offers them. A service set to Off is in neither list. */
export const quotableOf = (catalogue: readonly ServiceEntry[]): ServiceEntry[] => catalogue.filter((s) => s.online === "quote").map((s) => ({ ...s, kind: "quote" as const, price: "" }))

export const CATALOGUE: readonly ServiceEntry[] = bookingCatalogue()
export const SERVICES: readonly ServiceEntry[] = bookableOf(CATALOGUE)
export const QUOTE_SERVICES: readonly ServiceEntry[] = quotableOf(CATALOGUE)
