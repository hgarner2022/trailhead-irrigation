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
  /** what the visit includes, from Ryan's Jobber text with every price removed; shown on the job sheet and the pass page */
  description: string
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
/** What each visit includes, by service kind (the zone bands share one text; "other" has no catalogue entry) plus the quoted larger repair, which is its own text. The turn-on, inspection, blowout and repair texts are Ryan's Jobber wording with every price removed; the rest restate what the service's own page on the site says. Prices live on the service row. */
const DESCRIPTION: Record<Exclude<ServiceKind, "other"> | "repair-large", string> = {
  "turn-on":
    "Complete system activation and check: sprinkler head adjustments, minor leak fixes where possible, controller programming and a water efficiency evaluation. Larger repairs are quoted separately and may need a return visit.",
  inspection:
    "A full system check: head adjustments, a look at the backflow and manifold for leaks, controller programming and a water efficiency evaluation. Repairs are quoted separately.",
  blowout:
    "Compressor hookup and a blowout of every zone to clear water from the lines, valves and heads, and the backflow and controller readied for winter. We need access to the system, the controller and the backflow.",
  repair: "A visit to find the fault and fix what can be fixed on the spot. Larger repairs are quoted and may need a return visit.",
  consult: "A visit to look at the property and talk over what you have in mind, with a quote to follow. For a new system Ryan checks the water pressure and flow and puts the zone layout and price in writing before anyone digs.",
  "rachio-install":
    "A Rachio 3 for your zone count, mounted and wired to your existing valves, with the Wi-Fi set up, the zones named, the schedules built and a walkthrough of the app before we leave.",
  install:
    "A new sprinkler system designed for the yard: zones laid out from your water pressure and flow, heads and rotors matched per zone with head-to-head coverage, the controller and the backflow assembly, and a full system walkthrough after the install. Quoted on site after walking the property, with the zone layout and price in writing before anyone digs.",
  "repair-large": "The bigger repair found on a visit, one that needs parts we do not carry or more time: a valve rebuild, a line repair or a controller swap. Priced before any of that work starts, and you decide.",
  aeration: "Core aeration of the lawn: plugs pulled out of the compacted clay so water, air and fertilizer can get down to the roots. The plugs stay on the lawn and break down within a couple of weeks.",
  lights: "C9 bulbs on socket wire, cut to length for each run of the house and hung along the rooflines and peaks, with trees, bushes, walkways and railings lit if you want them. We supply the lights, and the takedown in January is included.",
}
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
    description: DESCRIPTION[visit.key],
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
    description: DESCRIPTION.blowout,
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
  { key: "repair", name: "Sprinkler repair visit", description: DESCRIPTION.repair, kind: "repair", bookable: true, price: REPAIR_VISIT_PRICE, slotMinutes: REPAIR_SLOT_MINUTES, quoteOnly: false },
  // The site offers a free consultation; the audit's $75 assessment was a Jobber test value.
  { key: "consult", name: "Free consultation", description: DESCRIPTION.consult, kind: "consult", bookable: true, price: 0, slotMinutes: 30, quoteOnly: false },
  {
    key: "rachio-install-8",
    name: "Rachio smart controller install, up to 8 zones",
    description: DESCRIPTION["rachio-install"],
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
    description: DESCRIPTION["rachio-install"],
    kind: "rachio-install",
    bookable: true,
    minZones: 9,
    maxZones: 16,
    price: RACHIO_PRICING.controller16Zone,
    slotMinutes: 120,
    quoteOnly: false,
  },
  // Quoted, never booked online.
  { key: "install", name: "New sprinkler system installation", description: DESCRIPTION.install, kind: "install", bookable: false, slotMinutes: 120, quoteOnly: true },
  { key: "repair-large", name: "Larger sprinkler repair", description: DESCRIPTION["repair-large"], kind: "repair", bookable: false, slotMinutes: REPAIR_SLOT_MINUTES, quoteOnly: true },
  // Not offered for the 2026 season (/pricing); listed so the catalogue is whole.
  { key: "aeration", name: "Core aeration", description: DESCRIPTION.aeration, kind: "aeration", bookable: false, slotMinutes: 60, quoteOnly: false },
  { key: "lights", name: "Christmas lights", description: DESCRIPTION.lights, kind: "lights", bookable: false, slotMinutes: 120, quoteOnly: true },
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
