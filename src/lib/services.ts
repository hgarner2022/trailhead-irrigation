import type { VisitKind } from "@/lib/admin/types"
import { EXTRA_ZONE_PRICE, SEASON_PASS_VISITS, visitPrice } from "@/lib/season-pass"
import { RACHIO_PRICING } from "@/lib/rachio-data"

/**
 * The services Trailhead sells, as data. Prices come from the site's own
 * modules (`season-pass.ts`, `rachio-data.ts`) and /pricing; nothing here is
 * a copied number except the repair visit ($145, /pricing and public/pricing.md,
 * which have no shared constant). The database `service` table is seeded from
 * this list, and the Jobber catalogue is aligned to it once. Hannah settled
 * 2026-11-12 that the site's prices win. No secrets: marketing may import it.
 *
 * A turn-on or inspection has one entry per zone band because the slot
 * length changes with the band (audit medians: 60 minutes up to 8 zones, 90
 * to 12, 120 above). The cost of any zone count is `serviceCost`.
 */
/** Every kind a service can be: the screens' visit kinds plus the ones only booking and the catalogue use (the `visit_kind` enum). */
export type ServiceKind = VisitKind | "consult" | "rachio-install" | "aeration" | "lights"

export interface ServiceDef {
  key: string
  name: string
  kind: ServiceKind
  bookable: boolean
  minZones?: number
  maxZones?: number
  /** zones the price covers */
  includedZones?: number
  /** whole dollars; undefined when the service is quoted */
  price?: number
  extraZonePrice?: number
  slotMinutes: number
  quoteOnly: boolean
}

const [TURN_ON, INSPECTION, BLOWOUT] = SEASON_PASS_VISITS
const REPAIR_VISIT_PRICE = 145
const REPAIR_SLOT_MINUTES = 120
const BANDS = [
  { suffix: "8", minZones: 1, maxZones: 8, slotMinutes: 60 },
  { suffix: "12", minZones: 9, maxZones: 12, slotMinutes: 90 },
  { suffix: "16", minZones: 13, maxZones: 16, slotMinutes: 120 },
] as const

function seasonal(visit: typeof TURN_ON | typeof INSPECTION, slot: (band: (typeof BANDS)[number]) => number): ServiceDef[] {
  return BANDS.map((band) => ({
    key: `${visit.key}-${band.suffix}`,
    name: `${visit.name}, up to ${band.maxZones} zones`,
    kind: visit.key,
    bookable: true,
    minZones: band.minZones,
    maxZones: band.maxZones,
    includedZones: visit.includedZones,
    price: visit.base,
    extraZonePrice: EXTRA_ZONE_PRICE,
    slotMinutes: slot(band),
    quoteOnly: false,
  }))
}

const LIST: ServiceDef[] = [
  ...seasonal(TURN_ON, (b) => b.slotMinutes),
  // The inspection is 90 minutes at every size (audit median).
  ...seasonal(INSPECTION, () => 90),
  {
    key: "blowout",
    name: BLOWOUT.name,
    kind: "blowout",
    bookable: true,
    minZones: 1,
    maxZones: 16,
    includedZones: BLOWOUT.includedZones,
    price: visitPrice(BLOWOUT, BLOWOUT.includedZones),
    extraZonePrice: EXTRA_ZONE_PRICE,
    slotMinutes: 30,
    quoteOnly: false,
  },
  { key: "repair", name: "Sprinkler repair visit", kind: "repair", bookable: true, price: REPAIR_VISIT_PRICE, slotMinutes: REPAIR_SLOT_MINUTES, quoteOnly: false },
  // The site offers a free consultation; the audit's $75 assessment was a Jobber test value.
  { key: "consult", name: "Free consultation", kind: "consult", bookable: true, price: 0, slotMinutes: 30, quoteOnly: false },
  {
    key: "rachio-install-8",
    name: "Rachio smart controller install, up to 8 zones",
    kind: "rachio-install",
    bookable: true,
    minZones: 1,
    maxZones: 8,
    price: RACHIO_PRICING.controller8Zone,
    slotMinutes: 120,
    quoteOnly: false,
  },
  {
    key: "rachio-install-16",
    name: "Rachio smart controller install, 9 to 16 zones",
    kind: "rachio-install",
    bookable: true,
    minZones: 9,
    maxZones: 16,
    price: RACHIO_PRICING.controller16Zone,
    slotMinutes: 120,
    quoteOnly: false,
  },
  // Quoted, never booked online.
  { key: "install", name: "New sprinkler system installation", kind: "install", bookable: false, slotMinutes: 120, quoteOnly: true },
  { key: "repair-large", name: "Larger sprinkler repair", kind: "repair", bookable: false, slotMinutes: REPAIR_SLOT_MINUTES, quoteOnly: true },
  // Not offered for the 2026 season (/pricing); listed so the catalogue is whole.
  { key: "aeration", name: "Core aeration", kind: "aeration", bookable: false, slotMinutes: 60, quoteOnly: false },
  { key: "lights", name: "Christmas lights", kind: "lights", bookable: false, slotMinutes: 120, quoteOnly: true },
]

export const SERVICES = Object.fromEntries(LIST.map((s) => [s.key, s])) as Record<string, ServiceDef> & {
  blowout: ServiceDef
}

export const SERVICE_LIST: readonly ServiceDef[] = LIST

/** What a visit costs for a zone count, in whole dollars; undefined when the service is quoted. */
export function serviceCost(service: Pick<ServiceDef, "price" | "includedZones" | "extraZonePrice">, zones: number): number | undefined {
  if (service.price === undefined) return undefined
  const extra = Math.max(0, zones - (service.includedZones ?? zones)) * (service.extraZonePrice ?? 0)
  return service.price + extra
}

/** The bookable service for a kind and zone count (the band that fits). */
export function serviceFor(kind: ServiceKind, zones: number): ServiceDef | undefined {
  return LIST.find(
    (s) => s.kind === kind && s.bookable && (s.minZones === undefined || zones >= s.minZones) && (s.maxZones === undefined || zones <= s.maxZones),
  )
}
