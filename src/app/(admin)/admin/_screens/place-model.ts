/**
 * Place and Place all, pure (docs/plans/2026-11-18-admin-holistic-design.md, 5.2 and 6). One rule, no setting: a job with no day
 * goes on the next open day, to the first person with room. A day is open for a job when it is tomorrow or later, inside the
 * job's season window (a pass's visit; a one-off has none), the person works that weekday and that season, and has room for the
 * kind (the capacity the visit's own API call checks: `capacityByKind` less the busy time) and works no other area group that day.
 * The week-planning engine's ranking (same town first, then near) is step 7; until then a day is only open or not and the
 * visit takes "Any time". The API refuses a placement that breaks a hard rule, so this plan only chooses where to try.
 */
import type { AreaGroup, BusyBlock, CapacityKind, Person, SeasonWindow, Visit } from "@/lib/admin/types"
import { addDays, blockedMinutes, capacityAfterBlocks, dayVisits, worksOn } from "@/lib/admin/calendar"
import { shortDate } from "@/lib/admin/format"
import type { TrayItem } from "./schedule-model"
import { placeVisit } from "./schedule-model"

/** How far past today a job with no window of its own is looked for: a season. */
export const PLACE_HORIZON_DAYS = 180

export interface PlaceContext {
  visits: Visit[]
  people: Person[]
  areas: AreaGroup[]
  windows: SeasonWindow[]
  blocks?: BusyBlock[]
  /** the calendar day today is; the first day offered is the day after */
  today: string
  timeZone: string
}

export interface Placement {
  item: TrayItem
  personId: string
  personName: string
  /** YYYY-MM-DD */
  day: string
}

export type PlaceResult = { ok: true; item: TrayItem; placement: Placement } | { ok: false; item: TrayItem; reason: string }

const capacityKind = (kind: Visit["kind"]): CapacityKind => (kind === "turn-on" || kind === "inspection" || kind === "blowout" || kind === "repair" ? kind : "other")
const areaIdOf = (areas: AreaGroup[], town: Visit["town"]) => areas.find((a) => a.towns.includes(town))?.id ?? town

/** The season window a pass's visit must land in; a one-off job's visit has none. */
const windowOf = (item: TrayItem, windows: SeasonWindow[]) => (item.passId ? windows.find((w) => w.kind === item.kind) : undefined)

function hasRoom(person: Person, day: string, item: TrayItem, ctx: PlaceContext): boolean {
  if (!worksOn(person, day)) return false
  if (person.seasonStart && day < person.seasonStart.slice(0, 10)) return false
  if (person.seasonEnd && day > person.seasonEnd.slice(0, 10)) return false
  const others = dayVisits(ctx.visits, day, person.id, ctx.timeZone).filter((v) => v.id !== item.id)
  const kind = capacityKind(item.kind)
  const room = capacityAfterBlocks(person.capacityByKind[kind] ?? 0, blockedMinutes(ctx.blocks ?? [], person.id, day, ctx.timeZone))
  if (others.filter((v) => capacityKind(v.kind) === kind).length >= room) return false
  return others.every((v) => areaIdOf(ctx.areas, v.town) === areaIdOf(ctx.areas, item.town))
}

/** Where the job goes: the next open day, the first person (in the schedule's order) with room; or why there is none. */
export function placeFor(item: TrayItem, ctx: PlaceContext): PlaceResult {
  const window = windowOf(item, ctx.windows)
  const first = addDays(ctx.today, 1)
  const from = window && window.opensOn.slice(0, 10) > first ? window.opensOn.slice(0, 10) : first
  const last = window ? window.closesOn.slice(0, 10) : addDays(ctx.today, PLACE_HORIZON_DAYS)
  for (let day = from; day <= last; day = addDays(day, 1)) {
    const person = ctx.people.find((p) => hasRoom(p, day, item, ctx))
    if (person) return { ok: true, item, placement: { item, personId: person.id, personName: person.name, day } }
  }
  return { ok: false, item, reason: `No open day before ${shortDate(last)}. Pick a day yourself.` }
}

/** Every job in the list, one after another: each placement fills its day for the next, so two jobs never take the last place. */
export function placeAllPlan(items: TrayItem[], ctx: PlaceContext): PlaceResult[] {
  let visits = ctx.visits
  return items
    .filter((item) => !item.awaitingPick)
    .map((item) => {
      const result = placeFor(item, { ...ctx, visits })
      if (result.ok) visits = placeVisit(visits, item, { id: result.placement.personId, name: result.placement.personName }, result.placement.day, ctx.timeZone)
      return result
    })
}

/** The placements of a plan that found a day. */
export const placed = (plan: PlaceResult[]): Placement[] => plan.flatMap((r) => (r.ok ? [r.placement] : []))

/** The visits as they were on the server for one job: its row there, or no row (a fixture's stand-in is taken off again). */
export function restoreVisit(visits: Visit[], visitId: string, server: Visit[]): Visit[] {
  const original = server.find((v) => v.id === visitId)
  return original ? visits.map((v) => (v.id === visitId ? original : v)) : visits.filter((v) => v.id !== visitId)
}

/** The visits with every pending placement laid on, as the screen shows them before the text goes. */
export function withPlacements(visits: Visit[], pending: Placement[], timeZone: string): Visit[] {
  return pending.reduce((v, p) => placeVisit(v, p.item, { id: p.personId, name: p.personName }, p.day, timeZone), visits)
}

/** "Tue Nov 24" for a day key, with the weekday, for the preview and the strip. */
export const placeDayWords = (day: string): string => `${new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })} ${shortDate(day)}`
