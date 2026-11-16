import "server-only"
import { callApi } from "@/api/core/call"
import type { Ctx } from "@/api/core/context"
import { ApiError } from "@/api/core/errors"
import { areasCreate, areasDelete, areasList, areasUpdate } from "@/api/v1/areas/handlers"
import { settingsGet, settingsUpdate } from "@/api/v1/settings/handlers"
import { LAST_OWNER, peopleCreate, peopleDeactivate, peopleList, peopleUpdate, type PersonOut } from "@/api/v1/people/handlers"
import { emailProblem } from "@/lib/email-check"
import { TEXT_MAX, hasAnotherOwner } from "@/lib/admin/people"
import type { AreaGroup, OrganizationSettings, Person } from "@/lib/admin/types"

// Settings Save: the screen holds the whole `OrganizationSettings` and sends it once. This turns the difference
// from what the API holds into the API's own calls: people.*, areas.* and one settings.update per changed section.
// The API's current values are read here, never taken from the client. The settings.* handlers write the change
// log; people edits are not in the server change log yet.

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const SECTIONS = ["windows", "bufferPercentEarly", "bufferPercentLate", "fallTownOrder", "springTownOrder", "messages"] as const

/** What would stop a save: said before anything is written, so a half-made area or a bad person row never half-saves. The same rules the reducers keep, run once more here. */
export function settingsProblems(after: OrganizationSettings): string[] {
  const problems: string[] = []
  if (after.people.length && !hasAnotherOwner(after.people)) problems.push(LAST_OWNER)
  for (const p of after.people) {
    const who = p.name.trim() || "the new person"
    if (!p.name.trim()) problems.push("Give every person a name before saving.")
    if (p.email && emailProblem(p.email)) problems.push(`${who}'s email doesn't look complete.`)
    if (p.workingDays.length === 0) problems.push(`Give ${who} at least one working day.`)
    for (const [field, max] of Object.entries(TEXT_MAX) as [keyof typeof TEXT_MAX, number][])
      if ((p[field] ?? "").length > max) problems.push(`${who}'s ${field === "jobberUserId" ? "Jobber user" : field} is longer than ${max} characters.`)
  }
  for (const a of after.areas) if (a.towns.length === 0) problems.push(`Pick at least one town for ${a.name} before saving.`)
  const seen = new Map<string, string>()
  for (const a of after.areas)
    for (const t of a.towns) {
      const other = seen.get(t)
      if (other) problems.push(`${t} is in both ${other} and ${a.name}; a town belongs to one area.`)
      seen.set(t, a.name)
    }
  return problems
}

/** A person's fields as people.update takes them: null clears a text field. The initials travel with the name. */
const personFields = (p: Person) => ({
  name: p.name, initials: p.initials, email: p.email ?? null, phone: p.phone ?? null, role: p.role, truck: p.truck ?? null, jobberUserId: p.jobberUserId ?? null,
  workingDays: p.workingDays, capacityByKind: p.capacityByKind, seasonStart: p.seasonStart ?? null, seasonEnd: p.seasonEnd ?? null,
})
const apiFields = (p: PersonOut) => ({
  name: p.name, initials: p.initials, email: p.email, phone: p.phone, role: p.role, truck: p.truck, jobberUserId: p.jobberUserId,
  workingDays: p.workingDays, capacityByKind: p.capacityByKind, seasonStart: p.seasonStart, seasonEnd: p.seasonEnd,
})
/** people.create takes no nulls: a field the person does not have is left out. */
const defined = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined)) as T

/** Writes the difference between the API's settings and `after`; throws the API's own error on the first refusal. */
export async function saveSettings(ctx: Ctx, after: OrganizationSettings): Promise<void> {
  const problems = settingsProblems(after)
  if (problems.length) throw new ApiError("unprocessable", problems[0]!)
  const [people, areas, current] = await Promise.all([callApi(ctx, peopleList, { active: "true" }), callApi(ctx, areasList, {}), callApi(ctx, settingsGet, {})])

  // The API keeps one owner at every step, so whoever becomes an owner is written first, then every other change, and
  // whoever leaves goes last: promoting B and demoting A in one save succeeds in that order and in no other.
  const havePeople = new Map(people.data.map((p) => [p.id, p]))
  const edited = after.people.filter((p) => havePeople.has(p.id) && !same(apiFields(havePeople.get(p.id)!), personFields(p)))
  const promoted = (p: Person) => p.role === "owner" && havePeople.get(p.id)!.role !== "owner"
  for (const p of edited.filter(promoted)) await callApi(ctx, peopleUpdate, { id: p.id, ...personFields(p) })
  for (const p of edited.filter((x) => !promoted(x))) await callApi(ctx, peopleUpdate, { id: p.id, ...personFields(p) })
  for (const p of after.people.filter((x) => !havePeople.has(x.id))) await callApi(ctx, peopleCreate, defined(personFields(p)))
  for (const id of havePeople.keys()) if (!after.people.some((p) => p.id === id)) await callApi(ctx, peopleDeactivate, { id })

  // A town can belong to one area at a time, so areas that give towns up are written before the ones that take them.
  const haveAreas = new Map(areas.data.map((a) => [a.id, a]))
  const gone = [...haveAreas.keys()].filter((id) => !after.areas.some((a) => a.id === id))
  const changed = after.areas.filter((a) => haveAreas.has(a.id) && !same({ name: haveAreas.get(a.id)!.name, towns: haveAreas.get(a.id)!.towns }, { name: a.name, towns: a.towns }))
  const shrinks = (a: AreaGroup) => a.towns.every((t) => haveAreas.get(a.id)!.towns.includes(t))
  for (const a of changed.filter(shrinks)) await callApi(ctx, areasUpdate, { id: a.id, name: a.name, towns: a.towns })
  for (const id of gone) await callApi(ctx, areasDelete, { id })
  for (const a of changed.filter((x) => !shrinks(x))) await callApi(ctx, areasUpdate, { id: a.id, name: a.name, towns: a.towns })
  for (const a of after.areas.filter((x) => !haveAreas.has(x.id))) await callApi(ctx, areasCreate, { name: a.name, towns: a.towns, springOrder: 0, fallOrder: 0 })

  for (const section of SECTIONS) if (!same(current[section], after[section])) await callApi(ctx, settingsUpdate, { section, value: after[section] })
}
