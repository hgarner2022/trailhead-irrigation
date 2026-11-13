// Season Pass pricing. The pass is the spring turn-on and the fall blowout;
// the July inspection is an add-on the customer chooses (Hannah, 2026-11-12:
// "the default be a spring turn on and then a blowout, and they can do an
// add-on for a summer inspection"). Each visit is billed at its standard
// per-zone rate, after the visit. What the customer buys is the reserved
// blowout date, the schedule kept for them, and one card on file.
//
// Per-visit prices must match /pricing and public/pricing.md. If a price
// changes there, change it here.

export const SEASON_PASS_VISITS = [
  {
    key: "turn-on",
    name: "Spring turn-on & system check",
    when: "April to May",
    base: 145,
    includedZones: 8,
  },
  {
    key: "inspection",
    name: "Mid-season inspection & tune-up",
    when: "July",
    base: 145,
    includedZones: 8,
  },
  {
    key: "blowout",
    name: "Fall blowout & winterization",
    when: "October, date reserved in July",
    base: 95,
    includedZones: 6,
  },
] as const

export const EXTRA_ZONE_PRICE = 10

/** The version of the Season Pass terms a checkout records with its consent; bump it when the Season Pass section of /terms changes. */
export const TERMS_VERSION = "2026-11"

export const MIN_ZONES = 6
export const MAX_ZONES = 16

export function visitPrice(visit: (typeof SEASON_PASS_VISITS)[number], zones: number): number {
  return visit.base + Math.max(0, zones - visit.includedZones) * EXTRA_ZONE_PRICE
}

export type SeasonPassVisit = (typeof SEASON_PASS_VISITS)[number]

/** The two visits every pass has, in season order. */
export const SEASON_PASS_CORE: readonly SeasonPassVisit[] = [SEASON_PASS_VISITS[0], SEASON_PASS_VISITS[2]]
/** The July visit, added when the customer asks for it. */
export const SEASON_PASS_ADD_ON: SeasonPassVisit = SEASON_PASS_VISITS[1]

/** The visits on a pass, in season order: the two, or the three with the inspection. */
export function passVisits(inspection: boolean): readonly SeasonPassVisit[] {
  return inspection ? SEASON_PASS_VISITS : SEASON_PASS_CORE
}

export function seasonPassPrice(zones: number, inspection = false): number {
  return passVisits(inspection).reduce((sum, v) => sum + visitPrice(v, zones), 0)
}

/** Rows for the static price table (also what AI answers can quote): the pass, and the pass with the July inspection. */
export const SEASON_PASS_TABLE = [6, 8, 10, 12, 14, 16].map((zones) => ({
  zones,
  turnOn: visitPrice(SEASON_PASS_VISITS[0], zones),
  blowout: visitPrice(SEASON_PASS_VISITS[2], zones),
  total: seasonPassPrice(zones),
  inspection: visitPrice(SEASON_PASS_ADD_ON, zones),
  totalWithInspection: seasonPassPrice(zones, true),
}))

export const SEASON_PASS_FROM = seasonPassPrice(MIN_ZONES)
export const INSPECTION_FROM = visitPrice(SEASON_PASS_ADD_ON, MIN_ZONES)
