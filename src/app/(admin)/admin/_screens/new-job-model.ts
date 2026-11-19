import type { ServiceItem } from "@/lib/admin/types"

// New job's service picker, as pure rules. The catalogue has one row per zone band for a turn-on, an inspection or a Rachio install
// ("Spring turn-on, up to 8 zones", "up to 12", "up to 16") because the visit's length changes with the band. The office picks the
// service once; the zones box picks the band, and `createVisit` still receives the band's own `serviceKey`, so nothing downstream
// changes. Order: Repair, Spring turn-on, Fall blowout, Mid-season inspection, then the rest alphabetically (Season Pass stays first,
// above them all, in the sheet).

const BAND_SUFFIX = /,\s*(?:up to \d+|\d+ to \d+) zones$/i
/** The most zones the sheet takes, as the Season Pass and the services' own rules do. */
export const MAX_SHEET_ZONES = 16
/** Keys of the four services the office books most, in the order they lead the picker. */
const LEADING = ["repair", "turn-on", "blowout", "inspection"]

export interface ServiceGroup {
  /** the band key without its size: "turn-on", "repair", "rachio-install" */
  id: string
  /** the catalogue name without the band suffix: "Spring turn-on & system check" */
  name: string
  /** the bands, smallest first; one entry for a service with no bands */
  bands: ServiceItem[]
}

/** "turn-on-8" is the "turn-on" service; a key with no size is its own. */
export const serviceGroupId = (key: string) => key.replace(/-\d+$/, "")

const maxOf = (s: ServiceItem) => s.maxZones ?? Number.POSITIVE_INFINITY

/** One entry per service, in the picker's order. */
export function serviceGroups(services: readonly ServiceItem[]): ServiceGroup[] {
  const byId = new Map<string, ServiceGroup>()
  for (const s of services) {
    const id = serviceGroupId(s.key)
    const group = byId.get(id)
    if (group) group.bands.push(s)
    else byId.set(id, { id, name: s.name.replace(BAND_SUFFIX, ""), bands: [s] })
  }
  const groups = [...byId.values()].map((g) => ({ ...g, bands: [...g.bands].sort((a, b) => maxOf(a) - maxOf(b)) }))
  const rank = (g: ServiceGroup) => (LEADING.includes(g.id) ? LEADING.indexOf(g.id) : LEADING.length)
  return groups.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
}

/** Does the sheet ask for zones: the service has bands or a per-zone rule. */
export const asksZones = (group: ServiceGroup) => group.bands.length > 1 || group.bands[0]?.includedZones !== undefined

/** The zones the box starts with: what the base price covers, else the first band's top. */
export function defaultZones(group: ServiceGroup): number {
  const first = group.bands[0]!
  return first.includedZones ?? (Number.isFinite(maxOf(first)) ? maxOf(first) : 1)
}

/** The band that holds a zone count: the first whose top is at or above it, the last when the count is over every band. */
export function bandFor(group: ServiceGroup, zones: number): ServiceItem {
  return group.bands.find((b) => zones <= maxOf(b)) ?? group.bands[group.bands.length - 1]!
}

/** The zones typed in the box as a count the rules can use: whole, 1 to 16, the default when empty. */
export function zoneCountOf(typed: string, group: ServiceGroup): number {
  return Math.min(MAX_SHEET_ZONES, Math.max(1, Math.floor(Number(typed)) || defaultZones(group)))
}
