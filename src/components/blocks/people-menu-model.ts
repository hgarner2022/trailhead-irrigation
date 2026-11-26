import { firstNameOf } from "@/lib/admin/people"
import type { Person } from "@/lib/admin/types"

// What the People button says about who is showing (docs/plans/2026-11-26-scheduler-review-research.md, point 1): "Everyone" when all are shown, the first names when two or fewer are
// shown of a larger team, and "3 of 12" beyond that. Pure.

/** Where the search box begins. */
export const SEARCH_FROM = 8

export function peopleSummary(people: readonly Pick<Person, "id" | "name">[], hidden: readonly string[]): string {
  const shown = people.filter((p) => !hidden.includes(p.id))
  if (shown.length === people.length) return "Everyone"
  if (shown.length <= 2) return shown.map((p) => firstNameOf(p.name) ?? p.name).join(", ")
  return `${shown.length} of ${people.length}`
}

/** The people whose name holds what was typed, in the team's order. */
export const matchPeople = <T extends Pick<Person, "name">>(people: readonly T[], query: string): T[] => {
  const q = query.trim().toLowerCase()
  return q ? people.filter((p) => p.name.toLowerCase().includes(q)) : [...people]
}
