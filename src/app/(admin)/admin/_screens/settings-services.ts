/**
 * The Services tab's grouping and its group edits (docs/plans/2026-11-18-admin-holistic-design.md, 8.2). The catalogue stores one row per
 * zone band ("Spring turn-on, up to 8 zones", "up to 12", "up to 16"); the screen shows one row for the service. Bands fold only when
 * they follow the one zones rule: the same price for the included zones and the same price per extra zone, with the same description,
 * taxable, active, online and dates, so a band's price is always `price + extra zones x per-extra price`. A band that differs (the
 * Rachio installs have their own price each and no per-zone rule) stays its own row. An edit to a folded row is written to every band
 * row of the kind and logged once, in the service's name; each band's minutes stay its own (the bands differ in length).
 */
import type { ServiceItem } from "@/lib/admin/types"
import { hasZoneRule, setServiceField, type Actor, type ServiceField, type SettingsState, SERVICE_WORDS } from "./settings-model"

export interface ServiceGroup {
  /** stable for React: the key of the first row */
  id: string
  /** what the row is called: "Spring turn-on" for a folded service, the row's own name otherwise */
  name: string
  /** the catalogue rows behind it, narrowest band first */
  rows: ServiceItem[]
  /** more than one band row folded into this one */
  banded: boolean
}

const BAND = /^(.*), up to (\d+) zones$/

const facts = (s: ServiceItem) => JSON.stringify([s.price, s.includedZones, s.extraZonePrice, s.description ?? null, s.taxable ?? false, s.active ?? true, s.bookable ?? true, s.bookableFrom ?? null, s.bookableTo ?? null, s.quoteOnly])

/** The catalogue in order, the bands of a service folded into its first row's place. Of a kind's bands, the largest set that agree on every fact folds; a band that differs stays its own row. */
export function groupServices(services: ServiceItem[]): ServiceGroup[] {
  const bands = new Map<string, ServiceItem[]>()
  for (const s of services) {
    const m = BAND.exec(s.name)
    if (m && hasZoneRule(s) && s.minZones !== undefined && s.maxZones !== undefined) bands.set(`${s.kind}|${m[1]}`, [...(bands.get(`${s.kind}|${m[1]}`) ?? []), s])
  }
  const folded = new Map<string, ServiceItem[]>()
  for (const [key, rows] of bands) {
    const clusters = new Map<string, ServiceItem[]>()
    for (const r of rows) clusters.set(facts(r), [...(clusters.get(facts(r)) ?? []), r])
    const biggest = [...clusters.values()].reduce((best, c) => (c.length > best.length ? c : best))
    if (biggest.length >= 2) folded.set(key, [...biggest].sort((x, y) => x.maxZones! - y.maxZones!))
  }
  const out: ServiceGroup[] = []
  const done = new Set<string>()
  for (const s of services) {
    const m = BAND.exec(s.name)
    const key = m ? `${s.kind}|${m[1]}` : ""
    const rows = folded.get(key)
    if (rows?.some((r) => r.key === s.key)) {
      if (done.has(key)) continue
      done.add(key)
      out.push({ id: rows[0]!.key, name: m![1]!, rows, banded: true })
    } else out.push({ id: s.key, name: s.name, rows: [s], banded: false })
  }
  return out
}

/** The band's size as the screen says it: "up to 8 zones". */
export const bandWords = (s: ServiceItem): string => (s.maxZones ? `up to ${s.maxZones} zones` : s.name)

/**
 * One logged line for an edit made to several rows at once: the scratch state holds the per-row results (each with its own log line);
 * the real state takes the rows and one line, named after the group.
 */
function merged(state: SettingsState, scratch: SettingsState, actor: Actor, label: string, word: string): SettingsState {
  if (scratch.changes.length === 0) return state
  const first = scratch.changes[0]!
  return { ...state, services: scratch.services, changes: [...state.changes, { ...first, id: `sc${state.changes.length + 1}-${actor.at}`, who: actor.who, at: actor.at, field: `${label} ${word}` }] }
}

/**
 * One edit to every band row of a service, logged once. A row the value does not apply to or is refused for refuses the whole edit, so
 * the bands never disagree.
 */
export function setGroupField(state: SettingsState, group: ServiceGroup, field: ServiceField, raw: string | number | boolean | null, actor: Actor): SettingsState {
  let scratch: SettingsState = { ...state, changes: [] }
  for (const row of group.rows) {
    const next = setServiceField(scratch, row.key, field, raw, actor)
    if (next === scratch && !same(scratch, row.key, field, raw)) return state
    scratch = next
  }
  return merged(state, scratch, actor, group.name, SERVICE_WORDS[field])
}

/** True when the row already holds this value, so "no change" is not mistaken for "refused". */
function same(state: SettingsState, key: string, field: ServiceField, raw: string | number | boolean | null): boolean {
  const row = state.services.find((s) => s.key === key)
  if (!row) return false
  const was = row[field as keyof ServiceItem]
  if (raw === null || raw === "") return was === null || was === undefined || was === ""
  return was === raw || String(was) === String(raw)
}

/** The service's new name on every band row: "Spring turn-on" becomes "Spring turn-on, up to 8 zones" and so on. */
export function renameGroup(state: SettingsState, group: ServiceGroup, raw: string, actor: Actor): SettingsState {
  const base = raw.trim()
  if (!base) return state
  let scratch: SettingsState = { ...state, changes: [] }
  for (const row of group.rows) {
    const to = group.banded ? `${base}, up to ${row.maxZones} zones` : base
    const next = setServiceField(scratch, row.key, "name", to, actor)
    if (next === scratch && row.name !== to) return state
    scratch = next
  }
  const out = merged(state, scratch, actor, group.name, SERVICE_WORDS.name)
  const change = out.changes[out.changes.length - 1]
  // The log says the service's name, not a band's.
  return change && out !== state ? { ...out, changes: [...out.changes.slice(0, -1), { ...change, from: group.name, to: base }] } : out
}
