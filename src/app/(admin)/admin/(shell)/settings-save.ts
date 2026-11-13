import "server-only"
import { callApi } from "@/api/core/call"
import type { Ctx } from "@/api/core/context"
import { ApiError } from "@/api/core/errors"
import { areasCreate, areasDelete, areasList, areasUpdate } from "@/api/v1/areas/handlers"
import { settingsGet, settingsUpdate } from "@/api/v1/settings/handlers"
import { trucksCreate, trucksDeactivate, trucksList, trucksUpdate } from "@/api/v1/trucks/handlers"
import type { AreaGroup, OrganizationSettings, Truck } from "@/lib/admin/types"

// Settings Save: the screen holds the whole `OrganizationSettings` and sends it once. This turns the difference
// from what the API holds into the API's own calls: trucks.*, areas.* and one settings.update per changed section.
// The API's current values are read here, never taken from the client, and the change log is written by the handlers.

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const SECTIONS = ["windows", "bufferPercentEarly", "bufferPercentLate", "fallTownOrder", "springTownOrder", "messages"] as const

/** What would stop a save: said before anything is written, so a half-made area never half-saves. */
export function settingsProblems(after: OrganizationSettings): string[] {
  const problems: string[] = []
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

const truckFields = (t: Truck) => ({ name: t.name, jobberUserId: t.jobberUserId || undefined, workingDays: t.workingDays, capacityByKind: t.capacityByKind })

/** Writes the difference between the API's settings and `after`; throws the API's own error on the first refusal. */
export async function saveSettings(ctx: Ctx, after: OrganizationSettings): Promise<void> {
  const problems = settingsProblems(after)
  if (problems.length) throw new ApiError("unprocessable", problems[0]!)
  const [trucks, areas, current] = await Promise.all([callApi(ctx, trucksList, {}), callApi(ctx, areasList, {}), callApi(ctx, settingsGet, {})])

  const haveTrucks = new Map(trucks.data.filter((t) => t.active).map((t) => [t.id, t]))
  for (const t of after.trucks) {
    const was = haveTrucks.get(t.id)
    if (!was) await callApi(ctx, trucksCreate, truckFields(t))
    else if (!same({ name: was.name, jobberUserId: was.jobberUserId ?? undefined, workingDays: was.workingDays, capacityByKind: was.capacityByKind }, truckFields(t)))
      await callApi(ctx, trucksUpdate, { id: t.id, ...truckFields(t), jobberUserId: t.jobberUserId ?? "" })
  }
  for (const id of haveTrucks.keys()) if (!after.trucks.some((t) => t.id === id)) await callApi(ctx, trucksDeactivate, { id })

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
