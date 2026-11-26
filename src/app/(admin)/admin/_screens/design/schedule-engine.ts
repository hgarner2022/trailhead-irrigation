import { addDays, worksOn } from "@/lib/admin/calendar"
import { hoursMinutes, hoursOf } from "@/lib/admin/people"
import type { Person, Town } from "@/lib/admin/types"
import { clockToMinutes, clockWords, hoursSpan, type GridBlock, type TimeOff } from "@/components/blocks/time-grid-model"
import { TOWN_CENTRES } from "@/components/blocks/day-map-helpers"
import { driveMinutes, gap, offerFor, openDaysFor, type OfferSlot, type BlockedSpan, type BookedVisit, type Offer, type OfferInputs, type OfferLocus, type OfferPerson } from "@/lib/scheduling/offer"
import type { Meta } from "./schedule-prototype-model"

// The Schedule prototype's one rule (docs/plans/2026-11-25-scheduler-holistic-audit.md, row 26): the product's own pure engine, `offerFor` / `openDaysFor` and `driveMinutes`
// (src/lib/scheduling/offer.ts, the straight line at 1.95 minutes a kilometre, no network), fed from the calendar the screen is drawing. The best times, the suggestion on an
// Unscheduled row, the Recommended row, the checks on a drop, the driving between stops and Order the day all read it, so none of them can disagree. Pure; no React.

/** The calendar the rule reads: the people with their Settings hours and Most per day, the visits, where each yard is, and time off. */
export interface Calendar {
  people: readonly Person[]
  visits: readonly GridBlock[]
  meta: Readonly<Record<string, Meta>>
  timeOff: readonly TimeOff[]
}

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
const round = (n: number) => Math.round(n)

/** A visit's place for the drive rule: its town and, when the calendar knows it, its point. */
export function locOf(b: Pick<GridBlock, "id" | "town">, meta: Calendar["meta"]): OfferLocus {
  const m = meta[b.id]
  return { town: b.town, point: m && Number.isFinite(m.lat) ? { lat: m.lat, lng: m.lng } : null }
}

/** Minutes of driving between two visits, whole minutes. */
export const driveBetween = (a: Pick<GridBlock, "id" | "town">, b: Pick<GridBlock, "id" | "town">, meta: Calendar["meta"]): number => round(driveMinutes(locOf(a, meta), locOf(b, meta)))

export function offerPeople(people: readonly Person[]): OfferPerson[] {
  return people.map((p) => ({ id: p.id, workingDays: p.workingDays, hoursStart: p.hoursStart ?? null, hoursEnd: p.hoursEnd ?? null, capsByKind: { ...p.capacityByKind }, from: p.seasonStart?.slice(0, 10) ?? null, to: p.seasonEnd?.slice(0, 10) ?? null }))
}

export function bookedOf(cal: Pick<Calendar, "visits" | "meta">, excludeId?: string): BookedVisit[] {
  return cal.visits.filter((b) => b.id !== excludeId).map((b) => ({ ...locOf(b, cal.meta), personId: b.personId, day: b.day, start: b.start === null ? null : hhmm(b.start), minutes: b.minutes, kind: b.kind }))
}

export function blockedOf(timeOff: readonly TimeOff[]): BlockedSpan[] {
  return timeOff.map((o) => ({ personId: o.personId, day: o.day, start: o.start === null || o.end === null ? null : hhmm(o.start), end: o.start === null || o.end === null ? null : hhmm(o.end) }))
}

export interface Ask {
  today: string
  town: Town
  point?: { lat: number; lng: number } | null
  minutes: number
  kind: string
  /** the visit being moved: its own place does not count */
  excludeId?: string
  /** how many days to offer */
  count?: number
  /** the service's own dates ("MM-DD"), for a Season Pass visit, which is offered inside its season; a one-off is not held to them */
  dates?: { bookableFrom?: string | null; bookableTo?: string | null }
}

/** The engine's inputs for one ask over the calendar. The office may book any day of the year, so a service's dates are not passed (they are a note, see `outsideDates`). */
export function inputsFor(cal: Calendar, a: Ask): OfferInputs {
  return {
    today: a.today,
    service: { minutes: a.minutes, kind: a.kind, ...a.dates },
    property: { town: a.town, point: a.point ?? null },
    people: offerPeople(cal.people),
    booked: bookedOf(cal, a.excludeId),
    blocked: blockedOf(cal.timeOff),
    count: a.count,
  }
}

const placeAs = (cal: Calendar, a: Ask) => ({ id: "__new", town: a.town, point: a.point ?? null })

/** A slot's added driving counted from the shop: the day with the new stop at that start less the day without it, first and last legs included, so an empty day costs its round trip. */
function withShop(cal: Calendar, a: Ask, day: string, slots: OfferSlot[]): OfferSlot[] {
  const here = placeAs(cal, a)
  const meta = { ...cal.meta, __new: { customer: "", lat: a.point?.lat ?? NaN, lng: a.point?.lng ?? NaN } }
  const visits = cal.visits.filter((b) => b.id !== a.excludeId)
  return slots
    .map((s) => {
      const [h, m] = s.start.split(":").map(Number) as [number, number]
      const mine: GridBlock = { id: "__new", day, personId: s.personId, start: h * 60 + m, minutes: a.minutes, title: "", name: "", kind: "other", town: here.town, service: "" }
      const total = (v: readonly GridBlock[]) => drivingOf(routeOf(v, s.personId, day), meta).total
      return { ...s, added: round1(Math.max(0, total([...visits, mine]) - total(visits))) }
    })
    .sort((x, y) => x.added - y.added || x.start.localeCompare(y.start))
}
const round1 = (n: number) => Math.round(n * 10) / 10

/** The offered days, with `best` on the one the rule recommends; each day's slots count their driving from the shop. */
export const offersFor = (cal: Calendar, a: Ask): Offer[] => offerFor(inputsFor(cal, { count: 5, ...a })).map((o) => ({ ...o, slots: withShop(cal, a, o.day, o.slots) }))

/** Every open start of one day, least added driving first (the engine's own slots, counted from the shop); empty when no one has room. */
export function slotsOn(cal: Calendar, a: Ask, day: string) {
  return withShop(cal, a, day, openDaysFor({ ...inputsFor(cal, a), today: addDays(day, -1) }, 1).find((o) => o.day === day)?.slots ?? [])
}

// ------------------------------------------------------------------------------------------------------------ driving

/** Where every person's day starts and ends: the shop, in Erie (the Erie town centre, the one place the map already knows). */
export const SHOP: OfferLocus = { town: "Erie", point: { lat: TOWN_CENTRES.Erie[1], lng: TOWN_CENTRES.Erie[0] } }

/**
 * One person's day in the order it is driven: the visits with a time by start, each Any time stop where Order the day put it (after the timed stop it follows, `afterId`, in `order`), and
 * the Any time stops nobody has placed last, by id (as the map numbers them).
 */
export function routeOf(visits: readonly GridBlock[], personId: string, day: string): GridBlock[] {
  const mine = visits.filter((b) => b.personId === personId && b.day === day)
  const timed = mine.filter((b) => b.start !== null).sort((x, y) => x.start! - y.start! || x.id.localeCompare(y.id))
  const loose = mine.filter((b) => b.start === null)
  const known = new Set<string | null>([null, ...timed.map((b) => b.id)])
  const placed = loose.filter((b) => b.afterId !== undefined && known.has(b.afterId))
  const tail = loose.filter((b) => !placed.includes(b)).sort((x, y) => x.id.localeCompare(y.id))
  const after = (id: string | null) => placed.filter((b) => b.afterId === id).sort((x, y) => (x.order ?? 0) - (y.order ?? 0) || x.id.localeCompare(y.id))
  return [...after(null), ...timed.flatMap((t) => [t, ...after(t.id)]), ...tail]
}

export interface Leg { fromId: string; toId: string; minutes: number }

/** The drive between each pair of consecutive stops, and the day's total: those legs plus the first leg out of the shop and the last one back. */
export function drivingOf(route: readonly GridBlock[], meta: Calendar["meta"]): { legs: Leg[]; total: number } {
  const legs: Leg[] = []
  let total = 0
  for (let i = 1; i < route.length; i++) {
    const minutes = driveBetween(route[i - 1]!, route[i]!, meta)
    legs.push({ fromId: route[i - 1]!.id, toId: route[i]!.id, minutes })
    total += minutes
  }
  if (route.length) total += round(driveMinutes(SHOP, locOf(route[0]!, meta))) + round(driveMinutes(locOf(route.at(-1)!, meta), SHOP))
  return { legs, total }
}

/** What each timed block's drive from the timed stop before it reads, by id, along the whole route: an Any time stop slotted in between adds its legs to the line. */
export function driveLines(visits: readonly GridBlock[], meta: Calendar["meta"], personId: string, day: string): Map<string, number> {
  const route = routeOf(visits, personId, day)
  const out = new Map<string, number>()
  let acc = 0
  let seen = false
  route.forEach((b, i) => {
    if (i > 0) acc += driveBetween(route[i - 1]!, b, meta)
    if (b.start === null) return
    if (seen && acc > 0) out.set(b.id, acc)
    seen = true
    acc = 0
  })
  return out
}

/** "38 min driving", "1 h 10 min driving"; empty with fewer than two stops. */
export const drivingWords = (minutes: number, hours: (m: number) => string): string => (minutes > 0 ? `${hours(minutes)} driving` : "")

/** The driving a visit moved to `to` adds to the world: the destination day with it less without it, less what its old day saved. Negative when the move saves driving. */
export function netDriving(cal: Calendar, v: GridBlock, to: { day: string; personId: string; start: number | null }): number {
  const total = (visits: readonly GridBlock[], personId: string, day: string) => drivingOf(routeOf(visits, personId, day), cal.meta).total
  const others = cal.visits.filter((b) => b.id !== v.id)
  const placed: GridBlock = { ...v, ...to }
  const added = total([...others, placed], to.personId, to.day) - total(others, to.personId, to.day)
  const here = cal.visits.some((b) => b.id === v.id)
  const saved = here ? total(cal.visits, v.personId, v.day) - total(others, v.personId, v.day) : 0
  return round(added - saved)
}

// ------------------------------------------------------------------------------------------------------------ the day's fill

export interface PersonDay {
  personId: string
  stops: number
  driving: number
  /** working minutes still open, 0 when the person is off or full */
  openMinutes: number
  /** at or over a "Most per day" for a kind, or no open time */
  full: boolean
  working: boolean
}

const capKey = (kind: string) => (kind === "turn-on" || kind === "inspection" || kind === "blowout" || kind === "repair" ? kind : "other")

/** Whether one more visit of `kind` is over the person's Most per day on that day (the visit `exceptId` does not count). */
export function atCap(person: Pick<Person, "capacityByKind">, visits: readonly GridBlock[], personId: string, day: string, kind: string, exceptId?: string): boolean {
  const cap = person.capacityByKind[capKey(kind) as keyof Person["capacityByKind"]]
  if (cap === undefined) return false
  return visits.filter((b) => b.id !== exceptId && b.personId === personId && b.day === day && capKey(b.kind) === capKey(kind)).length >= cap
}

export function personDay(cal: Calendar, person: Person, day: string): PersonDay {
  const mine = routeOf(cal.visits, person.id, day)
  const working = worksOn(person, day)
  const hours = hoursOf(person)
  const hs = clockToMinutes(hours.start) ?? 540
  const he = clockToMinutes(hours.end) ?? 1020
  const off = cal.timeOff.filter((o) => o.personId === person.id && o.day === day).reduce((n, o) => (o.start === null || o.end === null ? n + (he - hs) : n + Math.max(0, Math.min(he, o.end) - Math.max(hs, o.start))), 0)
  const open = working ? Math.max(0, hoursMinutes(person) - mine.reduce((n, b) => n + b.minutes, 0) - off) : 0
  const kinds = [...new Set(mine.map((b) => capKey(b.kind)))]
  const capped = kinds.some((k) => person.capacityByKind[k as keyof Person["capacityByKind"]] !== undefined && mine.filter((b) => capKey(b.kind) === k).length >= person.capacityByKind[k as keyof Person["capacityByKind"]]!)
  const wholeOff = cal.timeOff.some((o) => o.personId === person.id && o.day === day && (o.start === null || o.end === null))
  return { personId: person.id, stops: mine.length, driving: drivingOf(mine, cal.meta).total, openMinutes: open, working, full: working && !wholeOff && (open === 0 || capped) }
}

// ------------------------------------------------------------------------------------------------------------ what a place breaks

export interface Place { /** false leaves the added-driving line out, where the row already says it */ driving?: boolean; id: string; day: string; personId: string; start: number | null; minutes: number; town?: Town; kind?: string; point?: { lat: number; lng: number } | null }

/** The most added driving that goes without a word on a drop, in minutes. */
export const DRIVING_WARNING = 15

/** What a place breaks, in plain words: a day the person does not work, their hours, a visit or time off in the way, the room to drive between visits (`gap`), a full day, and 15 minutes or more of added driving. */
export function placeProblems(cal: Calendar, p: Place): string[] {
  const person = cal.people.find((x) => x.id === p.personId)
  if (!person) return []
  const who = person.name.split(" ")[0] ?? "They"
  if (!worksOn(person, p.day)) return [`${who} does not work that day.`]
  const out: string[] = []
  const here = cal.visits.find((b) => b.id === p.id)
  const kind = p.kind ?? here?.kind ?? "other"
  const full = atCap(person, cal.visits, p.personId, p.day, kind, p.id) || personDay({ ...cal, visits: cal.visits.filter((b) => b.id !== p.id) }, person, p.day).full
  if (p.start === null) return full ? [`${who} is full that day.`] : out
  const end = p.start + p.minutes
  const hours = hoursOf(person)
  const hs = clockToMinutes(hours.start) ?? 540
  const he = clockToMinutes(hours.end) ?? 1020
  if (p.start < hs) out.push(`${who} starts at ${clockWords(hs)}.`)
  if (end > he) out.push(`${who} works until ${clockWords(he)}.`)
  const timed = cal.visits.filter((b) => b.id !== p.id && b.day === p.day && b.personId === p.personId && b.start !== null && !b.planned)
  for (const b of timed) if (p.start < b.start! + b.minutes && b.start! < end) out.push(`${who} has ${b.title} at ${clockWords(b.start!)}.`)
  for (const o of cal.timeOff) {
    if (o.day !== p.day || o.personId !== p.personId) continue
    const whole = o.start === null || o.end === null
    if (whole || (p.start < o.end! && o.start! < end)) out.push(`${who} is off ${whole ? "all day" : hoursSpan(o.start!, o.end!)}.`)
  }
  if (out.length === 0) {
    // the room two visits need between them for the drive (the offer rule's `gap`)
    const mine: GridBlock = { id: p.id, day: p.day, personId: p.personId, start: p.start, minutes: p.minutes, title: here?.title ?? "", name: "", kind: (kind as GridBlock["kind"]), town: p.town ?? here?.town ?? "Erie", service: "" }
    const meta = p.point ? { ...cal.meta, [p.id]: { customer: "", lat: p.point.lat, lng: p.point.lng } } : cal.meta
    const prev = [...timed].filter((b) => b.start! + b.minutes <= p.start!).sort((a, b) => b.start! - a.start!)[0]
    const next = timed.filter((b) => b.start! >= end).sort((a, b) => a.start! - b.start!)[0]
    if (prev) { const g = gap(driveMinutes(locOf(prev, meta), locOf(mine, meta))); if (prev.start! + prev.minutes + g > p.start) out.push(`${who} needs ${g} minutes to drive from ${prev.title}.`) }
    if (next) { const g = gap(driveMinutes(locOf(mine, meta), locOf(next, meta))); if (end + g > next.start!) out.push(`${who} needs ${g} minutes to drive to ${next.title}.`) }
    if (!out.length && !full && p.driving !== false) {
      const base = cal.visits.find((b) => b.id === p.id) ?? mine
      const added = netDriving({ ...cal, meta }, { ...base, town: mine.town }, { day: p.day, personId: p.personId, start: p.start })
      if (added >= DRIVING_WARNING) out.push(`Adds ${added} min of driving.`)
    }
  }
  if (full) out.push(`${who} is full that day.`)
  return out
}

