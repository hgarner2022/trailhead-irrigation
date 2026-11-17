import "server-only"
import { callApi } from "@/api/core/call"
import type { Ctx } from "@/api/core/context"
import { ApiError } from "@/api/core/errors"
import { areasCreate, areasDelete, areasList, areasUpdate } from "@/api/v1/areas/handlers"
import { settingsGet, settingsUpdate } from "@/api/v1/settings/handlers"
import { servicesList, servicesUpdate } from "@/api/v1/services/handlers"
import { LAST_OWNER, peopleCreate, peopleDeactivate, peopleList, peopleUpdate, type PersonOut } from "@/api/v1/people/handlers"
import { emailProblem } from "@/lib/email-check"
import { TEXT_MAX, hasAnotherOwner } from "@/lib/admin/people"
import type { AreaGroup, OrganizationSettings, Person, ServiceItem } from "@/lib/admin/types"

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

const SERVICE_FIELDS = ["name", "description", "price", "includedZones", "extraZonePrice", "slotMinutes", "taxable", "active"] as const

/**
 * The catalogue's edits, one services.update per changed service with only the fields that changed. The rows to
 * compare with are the API's own, found by id (a row the API does not hold is ignored). A field the screen can
 * leave empty (a description, a price) is only sent when the screen holds a value for it: the API cannot clear a
 * price, and a cleared description goes as null.
 */
async function saveServices(ctx: Ctx, after: ServiceItem[]): Promise<void> {
  const have = new Map((await callApi(ctx, servicesList, {})).data.map((r) => [r.id, r]))
  for (const edited of after) {
    const row = edited.id ? have.get(edited.id) : undefined
    if (!row) continue
    const changes: Record<string, unknown> = {}
    for (const field of SERVICE_FIELDS) {
      const was = row[field]
      const now = field === "description" ? (edited.description ?? null) : edited[field]
      if (now === undefined || now === null) {
        if (field === "description" && was !== null) changes.description = null
      } else if (was !== now) changes[field] = now
    }
    if (Object.keys(changes).length) await callApi(ctx, servicesUpdate, { id: row.id, ...changes })
  }
}

/** Writes the difference between the API's settings and `after`, then the catalogue's edits; throws the API's own error on the first refusal. */
export async function saveSettings(ctx: Ctx, after: OrganizationSettings, services?: ServiceItem[]): Promise<void> {
  const problems = settingsProblems(after)
  if (problems.length) throw new ApiError("unprocessable", problems[0]!)
  const [people, areas, current] = await Promise.all([callApi(ctx, peopleList, { active: "true" }), callApi(ctx, areasList, {}), callApi(ctx, settingsGet, {})])

  // The API keeps one owner at every step, so whoever becomes an owner is written first (a brand-new owner is created
  // before anything else, then a promotion), then every other change, and whoever leaves goes last: a new owner plus
  // the old owner's demotion in one save succeeds in that order and in no other.
  const havePeople = new Map(people.data.map((p) => [p.id, p]))
  const created = after.people.filter((x) => !havePeople.has(x.id))
  const edited = after.people.filter((p) => havePeople.has(p.id) && !same(apiFields(havePeople.get(p.id)!), personFields(p)))
  const isOwner = (p: Person) => p.role === "owner"
  const promoted = (p: Person) => isOwner(p) && havePeople.get(p.id)!.role !== "owner"
  for (const p of created.filter(isOwner)) await callApi(ctx, peopleCreate, defined(personFields(p)))
  for (const p of edited.filter(promoted)) await callApi(ctx, peopleUpdate, { id: p.id, ...personFields(p) })
  for (const p of edited.filter((x) => !promoted(x))) await callApi(ctx, peopleUpdate, { id: p.id, ...personFields(p) })
  for (const p of created.filter((x) => !isOwner(x))) await callApi(ctx, peopleCreate, defined(personFields(p)))
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
  if (services) await saveServices(ctx, services)
}
