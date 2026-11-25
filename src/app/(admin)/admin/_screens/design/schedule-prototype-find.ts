import { addDays, worksOn } from "@/lib/admin/calendar"
import { hoursOf } from "@/lib/admin/people"
import type { Person, Town } from "@/lib/admin/types"
import type { Opening } from "@/components/blocks/scheduler-panels-types"
import { clockToMinutes, clockWords, type GridBlock } from "@/components/blocks/time-grid-model"
import { placementProblems, type ProtoState } from "./schedule-prototype-model"

// Find a time for the prototype (docs/plans/2026-11-25-scheduler-design.md, 2.2 and 7.7): the real week above, scanned for the best opening of each person's
// day, scored with the design's mix of soonness and added driving (a day later costs 6 minutes of driving), plus a few forced rows that break a rule, each with
// its words. Prototype arithmetic over fixtures: the engine does this on the server. Never shown to a customer.

const DAY_COST = 6
const EARLY_COST = 0.01
const NEAR: Partial<Record<Town, Town[]>> = { Erie: ["Lafayette", "Louisville", "Firestone"], Lafayette: ["Erie", "Louisville", "Broomfield"], Louisville: ["Lafayette", "Broomfield", "Erie"], Longmont: ["Firestone"], Firestone: ["Longmont", "Erie"], Broomfield: ["Louisville", "Lafayette"] }

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`

/** Minutes of driving a visit in `town` adds next to this neighbour: the same town 3, a town beside it 15, any other 25. */
const driveBetween = (a: Town, b: Town) => (a === b ? 3 : NEAR[a]?.includes(b) ? 15 : 25)

interface Slot { day: string; personId: string; start: number }

/** The open days from tomorrow: days someone works, skipping weekends. */
export function searchDays(people: readonly Person[], from: string, count = 6): string[] {
  const out: string[] = []
  for (let n = 1; out.length < count && n < 30; n++) {
    const day = addDays(from, n)
    if (people.some((p) => worksOn(p, day))) out.push(day)
  }
  return out
}

function neighbourOf(visits: readonly GridBlock[], s: Slot): GridBlock | undefined {
  return visits.filter((b) => b.day === s.day && b.personId === s.personId && b.start !== null).sort((a, b) => Math.abs(a.start! - s.start) - Math.abs(b.start! - s.start))[0]
}

export interface FindInput { state: Pick<ProtoState, "visits" | "timeOff">; people: readonly Person[]; town: Town; minutes: number; today: string }

/** Up to five clear openings, the best slot of each person's day, scored and in no particular order (Find a time sorts them); and three forced ones. */
export function openingsFor(i: FindInput): { openings: Opening[]; forced: Opening[] } {
  const days = searchDays(i.people, i.today)
  const found: Opening[] = []
  days.forEach((day, dayIndex) => {
    for (const p of i.people) {
      if (!worksOn(p, day)) continue
      const h = hoursOf(p)
      const lo = clockToMinutes(h.start) ?? 540
      const hi = clockToMinutes(h.end) ?? 1020
      let best: { start: number; added: number; next?: GridBlock } | null = null
      for (let start = lo; start + i.minutes <= hi; start += 30) {
        if (placementProblems(i.state, i.people, { id: "new", day, personId: p.id, start, minutes: i.minutes }).length) continue
        const near = neighbourOf(i.state.visits, { day, personId: p.id, start })
        const added = near ? driveBetween(i.town, near.town) : 30
        if (!best || added < best.added) best = { start, added, next: near }
      }
      if (!best) continue
      const end = best.start + i.minutes
      found.push({
        id: `o-${day}-${p.id}`, day, start: hhmm(best.start), end: hhmm(end), personId: p.id, personName: p.name, addedMinutes: best.added,
        score: Number((DAY_COST * dayIndex + best.added + EARLY_COST * ((best.start - lo) / 30)).toFixed(2)),
        nextTo: best.next && best.next.town === i.town ? `Next to ${/^[AEIOU]/.test(best.next.town) ? "an" : "a"} ${best.next.town} visit` : undefined,
      })
    }
  })
  const openings = found.sort((a, b) => a.score - b.score).slice(0, 5)
  return { openings, forced: forcedFor(i, days) }
}

/** A few slots that break a rule, each with the engine's words for the first thing it breaks. */
function forcedFor(i: FindInput, days: readonly string[]): Opening[] {
  const [first, second] = days
  if (!first || !second) return []
  const tries: (Slot & { id: string })[] = [
    { id: "f-1", day: first, personId: i.people[0]!.id, start: 14 * 60 },
    { id: "f-2", day: first, personId: i.people[1]?.id ?? i.people[0]!.id, start: 10 * 60 },
    { id: "f-3", day: second, personId: i.people[1]?.id ?? i.people[0]!.id, start: 15 * 60 + 30 },
  ]
  return tries.flatMap((t) => {
    const person = i.people.find((p) => p.id === t.personId)
    const why = placementProblems(i.state, i.people, { id: "new", day: t.day, personId: t.personId, start: t.start, minutes: i.minutes })[0]
    return person && why ? [{ id: t.id, day: t.day, start: hhmm(t.start), end: hhmm(t.start + i.minutes), personId: t.personId, personName: person.name, addedMinutes: 6, score: 10, conflict: why }] : []
  })
}

/** The minutes an opening starts at. */
export const startOf = (o: Pick<Opening, "start">): number => clockToMinutes(o.start) ?? 540
export const startWords = (o: Pick<Opening, "start">): string => clockWords(startOf(o))
