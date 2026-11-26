import type { Person } from "@/lib/admin/types"
import { buildWalkWorld } from "./walkthrough/visits-data"
import type { ProtoWorld } from "./schedule-prototype-model"

// A bigger team for the stories that show the Schedule scaling (docs/plans/2026-11-26-scheduler-review-research.md, point 1): the walkthrough's Ryan and Hannah plus up to 13 more people, each
// with the week of the person they copy (Ryan's), so every column has visits on the same days. Names only; nothing here is a real person.

const FIRST = ["Sam", "Ola", "Wes", "Cora", "Ivy", "Gus", "Mina", "Tom", "Ana", "Dev", "Eli", "Fay", "Jo"]

export function teamWorld(count: number): ProtoWorld {
  const world = buildWalkWorld()
  const [ryan, hannah] = world.people as [Person, Person]
  const extra: Person[] = FIRST.slice(0, Math.max(0, count - 2)).map((first): Person => ({ ...hannah, id: `person_${first.toLowerCase()}`, name: `${first} Garner`, initials: first.slice(0, 2).toUpperCase(), truck: `${first} Garner`, role: "tech" }))
  const mine = world.visits.filter((v) => v.personId === ryan.id && v.start !== null && !v.done)
  const visits = [...world.visits]
  const meta = { ...world.meta }
  extra.forEach((p, i) => {
    // every third visit of Ryan's week, shifted by person so the columns are not copies of each other
    mine.filter((_, n) => (n + i) % 3 === 0).forEach((v) => {
      const id = `${v.id}-${p.id}`
      visits.push({ ...v, id, personId: p.id })
      const m = world.meta[v.id]
      if (m) meta[id] = m
    })
  })
  return { ...world, people: [ryan, hannah, ...extra], visits, meta }
}
