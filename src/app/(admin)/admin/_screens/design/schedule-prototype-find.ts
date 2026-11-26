import { addDays, worksOn } from "@/lib/admin/calendar"
import { hoursOf } from "@/lib/admin/people"
import type { Person, Town } from "@/lib/admin/types"
import type { OfferSlot } from "@/lib/scheduling/offer"
import type { Opening } from "@/components/blocks/scheduler-panels-types"
import { clockToMinutes, clockWords } from "@/components/blocks/time-grid-model"
import { offersFor, placeProblems, slotsOn, type Calendar } from "./schedule-engine"

// Find a time for the prototype (docs/plans/2026-11-25-scheduler-design.md, 2.2 and 7.7), now the product's own rule: `offerFor` (src/lib/scheduling/offer.ts) over the calendar as it stands,
// one opening per offered day (the slot that adds the least driving), the recommended day first, plus a few places that break a rule, each with its words. Never shown to a customer.

export interface FindInput {
  state: Pick<Calendar, "visits" | "timeOff"> & Partial<Pick<Calendar, "meta">>
  people: readonly Person[]
  town: Town
  point?: { lat: number; lng: number } | null
  minutes: number
  kind?: string
  today: string
  excludeId?: string
  dates?: { bookableFrom?: string | null; bookableTo?: string | null }
}

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
const calOf = (i: FindInput): Calendar => ({ people: i.people, visits: i.state.visits, meta: i.state.meta ?? {}, timeOff: i.state.timeOff })

/** The opening a slot is: the engine's added drive in whole minutes and its reason line ("Next to another Erie visit."). */
function openingOf(day: string, slot: OfferSlot, people: readonly Person[], score: number, reason?: string | null): Opening {
  return { id: `o-${day}-${slot.start}-${slot.personId}`, day, start: slot.start, end: slot.end, personId: slot.personId, personName: people.find((p) => p.id === slot.personId)?.name ?? slot.personId, addedMinutes: Math.round(slot.added), score, nextTo: slot.label ?? reason ?? undefined }
}

/** Up to five clear openings, one per offered day, and a few forced ones that break a rule. */
export function openingsFor(i: FindInput): { openings: Opening[]; forced: Opening[] } {
  const cal = calOf(i)
  const ask = { today: i.today, town: i.town, point: i.point, minutes: i.minutes, kind: i.kind ?? "repair", excludeId: i.excludeId, dates: i.dates }
  const offers = offersFor(cal, ask)
  const order = [...offers].sort((a, b) => Number(b.best) - Number(a.best) || a.day.localeCompare(b.day))
  const openings = order.flatMap((o, n) => {
    const slot = o.slots[0]
    return slot ? [openingOf(o.day, slot, i.people, o.best ? 0 : n + slot.added / 1000, o.label)] : []
  })
  const days = offers.length ? offers.map((o) => o.day) : searchDays(i.people, i.today)
  return { openings, forced: forcedFor(i, ask, days.slice(0, 2)) }
}

/** Every open time of one day, least added driving first, and the places of that day that break a rule (greyed, with their words). */
export function dayOpenings(i: FindInput, day: string): { openings: Opening[]; forced: Opening[] } {
  const cal = calOf(i)
  const ask = { today: i.today, town: i.town, point: i.point, minutes: i.minutes, kind: i.kind ?? "repair", excludeId: i.excludeId, dates: i.dates }
  const slots = slotsOn(cal, ask, day)
  const openings = slots.map((s, n) => openingOf(day, s, i.people, n))
  return { openings, forced: forcedFor(i, ask, [day], 4) }
}

/** The days from tomorrow that someone works. */
export function searchDays(people: readonly Person[], from: string, count = 6): string[] {
  const out: string[] = []
  for (let n = 1; out.length < count && n < 30; n++) {
    const day = addDays(from, n)
    if (people.some((p) => worksOn(p, day))) out.push(day)
  }
  return out
}

/** Starts that break a rule, each with the first thing it breaks; one per kind of break so the list teaches the rules. */
function forcedFor(i: FindInput, ask: { minutes: number; kind: string; town: Town; point?: { lat: number; lng: number } | null }, days: readonly string[], max = 3): Opening[] {
  const cal = calOf(i)
  const seen = new Set<string>()
  const out: Opening[] = []
  for (const day of days) {
    for (const p of i.people) {
      if (!worksOn(p, day)) continue
      const h = hoursOf(p)
      const lo = clockToMinutes(h.start) ?? 540
      const hi = clockToMinutes(h.end) ?? 1020
      for (let start = lo; start + ask.minutes <= hi && out.length < max; start += 30) {
        const why = placeProblems(cal, { id: "new", day, personId: p.id, start, minutes: ask.minutes, town: ask.town, kind: ask.kind, point: ask.point, driving: false })[0]
        const key = why?.replace(/\d.*$/, "").replace(/ at .*$/, "")
        if (!why || seen.has(key!)) continue
        seen.add(key!)
        out.push({ id: `f-${day}-${start}-${p.id}`, day, start: hhmm(start), end: hhmm(start + ask.minutes), personId: p.id, personName: p.name, addedMinutes: 0, score: 10 + out.length, conflict: why })
      }
    }
  }
  return out
}

/** The minutes an opening starts at. */
export const startOf = (o: Pick<Opening, "start">): number => clockToMinutes(o.start) ?? 540
export const startWords = (o: Pick<Opening, "start">): string => clockWords(startOf(o))
