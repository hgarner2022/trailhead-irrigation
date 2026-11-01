// Season Pass pricing. Each visit is billed at its standard per-zone rate,
// after the visit. What the customer buys is the reserved blowout date, the
// schedule kept for them, and one card on file.
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

export const MIN_ZONES = 6
export const MAX_ZONES = 16

export function visitPrice(visit: (typeof SEASON_PASS_VISITS)[number], zones: number): number {
  return visit.base + Math.max(0, zones - visit.includedZones) * EXTRA_ZONE_PRICE
}

export function seasonPassPrice(zones: number): number {
  return SEASON_PASS_VISITS.reduce((sum, v) => sum + visitPrice(v, zones), 0)
}

/** Rows for the static price table (also what AI answers can quote). */
export const SEASON_PASS_TABLE = [6, 8, 10, 12, 14, 16].map((zones) => ({
  zones,
  turnOn: visitPrice(SEASON_PASS_VISITS[0], zones),
  inspection: visitPrice(SEASON_PASS_VISITS[1], zones),
  blowout: visitPrice(SEASON_PASS_VISITS[2], zones),
  total: seasonPassPrice(zones),
}))

export const SEASON_PASS_FROM = seasonPassPrice(MIN_ZONES)
