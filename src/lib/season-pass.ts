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

/** The day each visit's window closes for the season (MM-DD); after November 1 the next season is on sale (wiring plan, decision 15). */
export const WINDOW_CLOSES: Record<SeasonPassVisit["key"], string> = { "turn-on": "05-31", inspection: "07-31", blowout: "11-15" }
const SEASON_ROLLS = "11-01"

/**
 * The visits a pass bought today still has ahead: all of them from November
 * to May, the blowout alone (with July while July is open) once the turn-on
 * window has closed. `today` is YYYY-MM-DD in Mountain time. (The scheduling
 * flow, 2026-11-12: a pass bought mid-season sells only what is ahead.)
 */
export function visitsOnSale(inspection: boolean, today: string): readonly SeasonPassVisit[] {
  const monthDay = today.slice(5, 10)
  if (monthDay >= SEASON_ROLLS) return passVisits(inspection)
  return passVisits(inspection).filter((v) => monthDay <= WINDOW_CLOSES[v.key])
}

/** The price of what is on sale today. */
export function priceOnSale(zones: number, inspection: boolean, today: string): number {
  return visitsOnSale(inspection, today).reduce((sum, v) => sum + visitPrice(v, zones), 0)
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
