/**
 * The offer rule (docs/plans/2026-11-18-scheduling-engine-design.md, section 4), pure: no database, no clock, no network. Given
 * what a customer asks for, where they live and what is already booked, it answers the soonest open days, each with the open
 * start times of that day. Soonest comes first; nearness to work already on the road orders the days inside the soon range
 * and breaks ties. A day is open when some person who works it has a gap of the service's length inside their hours, with the
 * drive cushion `gap(drive)` to the timed visits on either side, under their cap for the kind. Untimed ("Any time") visits
 * take minutes from the day without a place in it. Drive time is the straight line at 1.95 minutes a kilometre between two
 * points, or between the two town centres when either has no point.
 */
import { TOWN_CENTRES } from "@/components/blocks/day-map-helpers"
import type { Town, Weekday } from "@/lib/admin/types"
import { inBookableWindow } from "@/lib/services-window"
import { addDays, weekdayOf } from "./calendar"
import { haversine, type LatLng } from "./order"

/** Slots start every 30 minutes from the person's first hour. */
export const GRID_MINUTES = 30
/** Days looked at for a service with no dates, and the most for one with dates. */
export const HORIZON_DAYS = 56
const DATED_HORIZON_DAYS = 400
/** The soonest open days the rule ranks; `count` of them are offered. */
export const SOON = 5
export const SHOWN = 3
/** Within this many minutes' drive a stop is close (tier 1); fixed in code, no setting. */
export const NEAR_MINUTES = 10
/** Minutes a kilometre: 1.3 road factor at 40 km/h. */
export const MINUTES_PER_KM = 1.95
export const DEFAULT_HOURS = { start: "09:00", end: "17:00" } as const

export type Tier = 0 | 1 | 2

export interface OfferLocus {
  town: Town
  point?: LatLng | null
}

export interface OfferPerson {
  id: string
  workingDays: Weekday[]
  /** "HH:MM"; null reads as 09:00 */
  hoursStart?: string | null
  hoursEnd?: string | null
  /** the typed count per capacity kind, a ceiling only; a kind not listed has no ceiling */
  capsByKind: Partial<Record<string, number>>
  active?: boolean
}

export interface BookedVisit extends OfferLocus {
  personId: string
  day: string
  /** "HH:MM"; null or missing is an "Any time" visit, busy time without a place in the day */
  start?: string | null
  minutes: number
  /** the visit's kind, for the cap; missing counts toward no cap */
  kind?: string
}

export interface BlockedSpan {
  personId: string
  day: string
  /** "HH:MM"; both missing blocks the whole day */
  start?: string | null
  end?: string | null
}

export interface OfferInputs {
  /** Mountain "YYYY-MM-DD"; tomorrow is the first day offered */
  today: string
  service: { minutes: number; kind: string; bookableFrom?: string | null; bookableTo?: string | null }
  property: OfferLocus
  people: OfferPerson[]
  booked: BookedVisit[]
  blocked: BlockedSpan[]
  /** how many days to offer, default 3 */
  count?: number
  /** 0 is the soonest five days; 1 the next five, ranked the same way */
  page?: number
  /** days never offered (a visit's present day when it is being moved) */
  excludeDays?: string[]
}

export interface OfferSlot {
  start: string
  end: string
  personId: string
  /** minutes of drive this slot adds to the person's day */
  added: number
  /** "Next to another Erie visit." and the like; never a name or an address */
  label: string | null
}

export interface Offer {
  day: string
  label: string | null
  tier: Tier
  /** the one day to preselect; the customer still taps */
  best: boolean
  /** stops already on this day in the customer's town, and the drive minutes to the nearest stop (null: none) */
  same: number
  near: number | null
  /** least added drive first, then earliest */
  slots: OfferSlot[]
}

const minutesOf = (hhmm: string): number => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
const clock = (m: number): string => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
const ceil5 = (n: number): number => Math.ceil(n / 5) * 5

/** The room two visits need between them for a drive of `d` minutes: a 25 percent cushion, never under 10. */
export const gap = (d: number): number => Math.max(10, ceil5(1.25 * d))

const centre = (town: Town): LatLng => ({ lat: TOWN_CENTRES[town][1], lng: TOWN_CENTRES[town][0] })

/** Drive minutes between two places: the straight line between their points, else between their town centres (zero inside one town). */
export function driveMinutes(a: OfferLocus, b: OfferLocus): number {
  if (a.point && b.point) return haversine(a.point, b.point) * MINUTES_PER_KM
  if (a.town === b.town) return 0
  return haversine(centre(a.town), centre(b.town)) * MINUTES_PER_KM
}

/** Capacity kinds: the four with a typed count, everything else "other". */
const capacityKind = (kind: string): string => (kind === "turn-on" || kind === "inspection" || kind === "blowout" || kind === "repair" ? kind : "other")

const round1 = (n: number): number => Math.round(n * 10) / 10

interface Timed {
  start: number
  end: number
  at: OfferLocus
}

/** Open slots of one person on one day, each with the added drive and the neighbour that set it. Pure. */
function personSlots(input: OfferInputs, person: OfferPerson, day: string, mine: BookedVisit[], blocked: BlockedSpan[]): OfferSlot[] {
  const minutes = input.service.minutes
  const dayStart = minutesOf(person.hoursStart ?? DEFAULT_HOURS.start)
  const dayEnd = minutesOf(person.hoursEnd ?? DEFAULT_HOURS.end)
  const kind = capacityKind(input.service.kind)
  const cap = person.capsByKind[kind]
  if (cap !== undefined && mine.filter((v) => v.kind !== undefined && capacityKind(v.kind) === kind).length >= cap) return []

  const spans: [number, number][] = blocked.map((b) => [b.start ? minutesOf(b.start) : 0, b.end ? minutesOf(b.end) : 24 * 60])
  const timed: Timed[] = mine.filter((v) => v.start).map((v) => ({ start: minutesOf(v.start!), end: minutesOf(v.start!) + v.minutes, at: v })).sort((a, b) => a.start - b.start)
  const untimedMinutes = mine.filter((v) => !v.start).reduce((sum, v) => sum + v.minutes, 0)
  const timedMinutes = timed.reduce((sum, t) => sum + (t.end - t.start), 0)
  // Blocked time counts once, clipped to the person's hours.
  const merged: [number, number][] = []
  for (const [a, z] of [...spans].sort((x, y) => x[0] - y[0])) {
    const lo = Math.max(a, dayStart)
    const hi = Math.min(z, dayEnd)
    if (hi <= lo) continue
    const last = merged.at(-1)
    if (last && lo <= last[1]) last[1] = Math.max(last[1], hi)
    else merged.push([lo, hi])
  }
  const blockedMinutes = merged.reduce((sum, [a, z]) => sum + (z - a), 0)
  const freeAfterSlot = dayEnd - dayStart - blockedMinutes - timedMinutes - untimedMinutes - minutes
  if (freeAfterSlot < 0) return []

  const stops: OfferLocus[] = mine.map((v) => v)
  const out: OfferSlot[] = []
  for (let start = dayStart; start + minutes <= dayEnd; start += GRID_MINUTES) {
    const end = start + minutes
    if (spans.some(([a, z]) => start < z && end > a)) continue
    if (timed.some((t) => start < t.end && end > t.start)) continue
    const prev = [...timed].reverse().find((t) => t.end <= start)
    const next = timed.find((t) => t.start >= end)
    const toPrev = prev ? driveMinutes(prev.at, input.property) : null
    const toNext = next ? driveMinutes(input.property, next.at) : null
    if (prev && prev.end + gap(toPrev!) > start) continue
    if (next && end + gap(toNext!) > next.start) continue
    let added: number
    let nearest: { at: OfferLocus; d: number } | null = null
    if (prev && next) {
      added = toPrev! + toNext! - driveMinutes(prev.at, next.at)
      nearest = toPrev! <= toNext! ? { at: prev.at, d: toPrev! } : { at: next.at, d: toNext! }
    } else if (prev || next) {
      added = (prev ? toPrev : toNext)!
      nearest = { at: (prev ?? next)!.at, d: added }
    } else if (stops.length) {
      for (const s of stops) {
        const d = driveMinutes(s, input.property)
        if (!nearest || d < nearest.d) nearest = { at: s, d }
      }
      added = nearest!.d
    } else {
      added = 0
    }
    const label = nearest ? (nearest.at.town === input.property.town ? `Next to another ${input.property.town} visit.` : nearest.d <= NEAR_MINUTES ? "Close to another visit." : null) : null
    out.push({ start: clock(start), end: clock(end), personId: person.id, added: round1(Math.max(0, added)), label })
  }
  return out
}

/** Every open slot of the day across people: per start, the person already working that day, then least added, then the first listed. */
function daySlots(input: OfferInputs, day: string): OfferSlot[] {
  const weekday = weekdayOf(day)
  const byStart = new Map<string, { slot: OfferSlot; working: boolean; order: number }>()
  input.people.forEach((person, order) => {
    if (person.active === false || !person.workingDays.includes(weekday)) return
    const mine = input.booked.filter((v) => v.personId === person.id && v.day === day)
    const blocked = input.blocked.filter((b) => b.personId === person.id && b.day === day)
    for (const slot of personSlots(input, person, day, mine, blocked)) {
      const have = byStart.get(slot.start)
      const working = mine.length > 0
      const better = !have || (working && !have.working) || (working === have.working && (slot.added < have.slot.added || (slot.added === have.slot.added && order < have.order)))
      if (better) byStart.set(slot.start, { slot, working, order })
    }
  })
  return [...byStart.values()].map((x) => x.slot).sort((a, b) => a.added - b.added || a.start.localeCompare(b.start))
}

export interface Open {
  day: string
  slots: OfferSlot[]
  same: number
  near: number | null
  tier: Tier
}

const tierOf = (same: number, near: number | null): Tier => (same > 0 ? 0 : near !== null && near <= NEAR_MINUTES ? 1 : 2)

/** Every open day from tomorrow, soonest first, until `need` are found; the days a screen or a check reads, before any ranking. */
export function openDaysFor(input: OfferInputs, need: number): Open[] {
  const dated = Boolean(input.service.bookableFrom || input.service.bookableTo)
  const first = addDays(input.today, 1)
  const horizon = dated ? DATED_HORIZON_DAYS : HORIZON_DAYS
  const open: Open[] = []
  // A service with dates is offered through its next run of dates and no further (LAST is `bookable_to`).
  let entered = false
  for (let i = 0; i < horizon && open.length < need; i++) {
    const day = addDays(first, i)
    if (!inBookableWindow(input.service, day)) {
      if (entered) break
      continue
    }
    entered = true
    if (input.excludeDays?.includes(day)) continue
    const slots = daySlots(input, day)
    if (!slots.length) continue
    const here = input.booked.filter((v) => v.day === day)
    const same = here.filter((v) => v.town === input.property.town).length
    const near = here.length ? Math.min(...here.map((v) => driveMinutes(v, input.property))) : null
    open.push({ day, slots, same, near, tier: tierOf(same, near) })
  }
  return open
}

/**
 * The offers for one booking: up to `count` days chosen from the soonest five open days, ranked by nearness inside them, sorted
 * by date, one marked `best`. A repair is always offered the earliest open day first. Nothing open returns nothing.
 */
export function offerFor(input: OfferInputs): Offer[] {
  const count = Math.max(1, input.count ?? SHOWN)
  const page = Math.max(0, input.page ?? 0)
  const soonSize = Math.max(SOON, count)
  const need = soonSize * (page + 1)
  const open = openDaysFor(input, need)
  const soon = open.slice(page * soonSize, (page + 1) * soonSize)
  const rank = [...soon].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier
    if (a.tier === 0 && a.same !== b.same) return b.same - a.same
    if (a.tier === 1 && a.near !== b.near) return a.near! - b.near!
    return a.day.localeCompare(b.day)
  })
  const repairFirst = input.service.kind === "repair" && page === 0 && soon[0]
  const chosen = repairFirst ? [soon[0]!, ...rank.filter((o) => o !== soon[0])].slice(0, count) : rank.slice(0, count)
  const soonest = page === 0 ? soon[0] : undefined
  return chosen
    .map((o, i): Offer => ({
      day: o.day,
      tier: o.tier,
      best: i === 0,
      same: o.same,
      near: o.near === null ? null : round1(o.near),
      slots: o.slots,
      label:
        repairFirst && o === soon[0] ? "Soonest we can come."
        : o.tier === 0 ? `We're already in ${input.property.town} that day.`
        : o.tier === 1 ? "We're close by that day."
        : o === soonest ? (input.service.kind === "repair" ? "Soonest we can come." : "Soonest open day.")
        : null,
    }))
    .sort((a, b) => a.day.localeCompare(b.day))
}
