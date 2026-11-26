import type { Person, Town } from "@/lib/admin/types"
import { shortDay } from "@/emails/format"
import { firstNameOf } from "@/lib/admin/people"
import { recommendedId } from "@/components/blocks/find-a-time-model"
import { clockWords } from "@/components/blocks/time-grid-model"
import type { BestTimes } from "@/components/blocks/best-times"
import { dayOpenings, openingsFor } from "./schedule-prototype-find"
import { windowLines } from "./schedule-window"
import { outsideDates } from "./walkthrough/walk-settings"
import { placementProblems, type ProtoJob, type ProtoState } from "./schedule-prototype-model"

// The best times for one job over the calendar as it stands (the product's offer rule in `schedule-engine.ts`, dressed for the Schedule dialog): the clear openings ranked by the
// dialog, each with the engine's reason line and the minutes of driving it adds, the ones that break a rule, the day's booked stops, one chosen day's own openings, and the words
// of what a chosen place breaks. Pure.

export interface BestInput { /** Edit visit: the visit's own place, the dialog opens on it */ current?: BestTimes["current"]; state: Pick<ProtoState, "visits" | "timeOff"> & Partial<Pick<ProtoState, "meta">>; people: readonly Person[]; today: string; town: Town; minutes: number; kind?: string; point?: { lat: number; lng: number } | null; /** the visit being moved: its own place does not count */ excludeId?: string; initialPickId?: string; currentDay?: string; dates?: { bookableFrom?: string | null; bookableTo?: string | null } }

export function bestTimesFor(i: BestInput): BestTimes {
  const state = { visits: i.state.visits.filter((b) => b.id !== i.excludeId), timeOff: i.state.timeOff, meta: i.state.meta }
  const find = { state: i.state, people: i.people, town: i.town, point: i.point, minutes: i.minutes, kind: i.kind, today: i.today, excludeId: i.excludeId, dates: i.dates }
  const found = openingsFor(find)
  const nameOf = (id: string) => i.people.find((p) => p.id === id)?.name ?? id
  const idOf = (name: string) => i.people.find((p) => p.name === name)?.id ?? name
  return {
    today: i.today,
    people: i.people.map((p) => p.name),
    rows: found.openings,
    forced: found.forced,
    initialPickId: i.initialPickId,
    currentDay: i.currentDay,
    current: i.current,
    stopsOf: (iso) => state.visits.filter((b) => b.day === iso && b.start !== null).map((b) => ({ start: b.start!, minutes: b.minutes, name: b.name, town: b.town, person: nameOf(b.personId) })),
    dayRows: (iso) => { const d = dayOpenings(find, iso); return { rows: d.openings, forced: d.forced } },
    notes: (day) => { const n = i.kind ? outsideDates(i.kind, day) : null; return [...(n && !i.dates ? [n] : []), ...windowLines(i.today, { old: i.currentDay, next: day })] },
    problems: ({ day, person, start }) => placementProblems(state, i.people, { id: i.excludeId ?? "new", day, personId: idOf(person), start, minutes: i.minutes, town: i.town, kind: i.kind, point: i.point, driving: false }),
  }
}

/** The one line an Unscheduled row shows for its job: "Suggested: Thu, Nov 26, 9:00 am with Ryan", with the row it names. Null when nothing is open. */
export function suggestionFor(job: Pick<ProtoJob, "town" | "minutes" | "kind" | "lat" | "lng">, i: Omit<BestInput, "town" | "minutes" | "kind" | "point">): { rowId: string; words: string } | null {
  const best = bestTimesFor({ ...i, town: job.town, minutes: job.minutes, kind: job.kind, point: typeof job.lat === "number" && typeof job.lng === "number" ? { lat: job.lat, lng: job.lng } : null })
  const row = best.rows.find((r) => r.id === recommendedId(best.rows))
  if (!row) return null
  const [h, m] = row.start.split(":").map(Number) as [number, number]
  return { rowId: row.id, words: `Suggested: ${shortDay(row.day)}, ${clockWords(h * 60 + m)} with ${firstNameOf(row.personName) ?? row.personName}` }
}
