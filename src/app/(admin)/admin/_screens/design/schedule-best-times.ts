import type { Person } from "@/lib/admin/types"
import type { Opening } from "@/components/blocks/scheduler-panels-types"
import { clockWords } from "@/components/blocks/time-grid-model"
import type { BestTimes } from "@/components/blocks/best-times"
import { openingsFor } from "./schedule-prototype-find"
import { placementProblems, type ProtoJob, type ProtoState } from "./schedule-prototype-model"
import type { Town } from "@/lib/admin/types"

// The best times for one job over the calendar as it stands (the prototype's arithmetic in `schedule-prototype-find.ts`, dressed for the Schedule dialog): the clear
// openings ranked by the dialog, the ones that break a rule, the day's booked stops, and the words of what a chosen place breaks. Only the top row keeps its one office-only
// line ("Next to an Erie visit"). Pure.

export interface BestInput { state: Pick<ProtoState, "visits" | "timeOff">; people: readonly Person[]; today: string; town: Town; minutes: number; /** the visit being moved: its own place does not count */ excludeId?: string; initialPickId?: string }

export function bestTimesFor(i: BestInput): BestTimes {
  const state = { visits: i.state.visits.filter((b) => b.id !== i.excludeId), timeOff: i.state.timeOff }
  const found = openingsFor({ state, people: i.people, town: i.town, minutes: i.minutes, today: i.today })
  const top = [...found.openings].sort((a, b) => a.score - b.score)[0]?.id
  // three are offered (the engine design), the best three by score
  const rows: Opening[] = [...found.openings].sort((a, b) => a.score - b.score).slice(0, 3).map((r) => (r.id === top ? r : { ...r, nextTo: undefined }))
  const nameOf = (id: string) => i.people.find((p) => p.id === id)?.name ?? id
  const idOf = (name: string) => i.people.find((p) => p.name === name)?.id ?? name
  return {
    today: i.today,
    people: i.people.map((p) => p.name),
    rows,
    forced: found.forced,
    initialPickId: i.initialPickId,
    stopsOf: (iso) => state.visits.filter((b) => b.day === iso && b.start !== null).map((b) => ({ start: b.start!, minutes: b.minutes, name: b.name, town: b.town, person: nameOf(b.personId) })),
    problems: ({ day, person, start }) => placementProblems(state, i.people, { id: "new", day, personId: idOf(person), start, minutes: i.minutes }),
  }
}

/** The one line an Unscheduled row shows for its job: "Suggested: Thu, Nov 26, 9:00 am, Ryan Garner", with the row it names. Null when nothing is open. */
export function suggestionFor(job: Pick<ProtoJob, "town" | "minutes">, i: Omit<BestInput, "town" | "minutes">, dayShort: (iso: string) => string): { rowId: string; words: string } | null {
  const best = bestTimesFor({ ...i, town: job.town, minutes: job.minutes })
  const row = [...best.rows].sort((a, b) => a.score - b.score)[0]
  if (!row) return null
  const [h, m] = row.start.split(":").map(Number) as [number, number]
  return { rowId: row.id, words: `Suggested: ${dayShort(row.day)}, ${clockWords(h * 60 + m)}, ${row.personName}` }
}
