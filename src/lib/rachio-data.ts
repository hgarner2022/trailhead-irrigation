// Trailhead Rachio install pricing + per-city rebate amounts.
// Update RACHIO_PRICING and CITY_RACHIO when prices/rebates change.

export const RACHIO_PRICING = {
  controller8Zone: 350,
  controller16Zone: 420,
  // Rachio's manufacturer rebate that stacks on top of utility rebates.
  // Amount varies — using a conservative typical figure.
  manufacturerRebate: 50,
} as const

export type RachioCityProgram = {
  slug: string
  name: string
  rebateType: "cash" | "free-install" | "cash-or-free" | "none"
  /** Cash rebate dollar amount (utility credit). Undefined when none / TBD. */
  cashRebate?: number
  /** Bonus available with extra steps (e.g. Slow the Flow evaluation). */
  bonusRebate?: number
  bonusCondition?: string
  /** Notes that appear in calculator + city pages */
  shortNote: string
  /** Whether the city offers a free Rachio install via Resource Central. */
  freeInstallProgram: boolean
  freeInstallNote?: string
  utilityRebateUrl?: string
}

export const CITY_RACHIO: RachioCityProgram[] = [
  {
    slug: "erie",
    name: "Erie",
    rebateType: "cash",
    cashRebate: 100,
    shortNote:
      "Town of Erie offers a $100 utility-bill rebate on any WaterSense-certified smart controller (including the Rachio 3). After Erie's March 2026 water emergency, the town has aggressively pushed efficient irrigation upgrades.",
    freeInstallProgram: false,
    utilityRebateUrl: "https://www.erieco.gov/574/Water-Efficiency-Rebates",
  },
  {
    slug: "longmont",
    name: "Longmont",
    rebateType: "cash",
    cashRebate: 65,
    bonusRebate: 50,
    bonusCondition:
      "Complete a free Slow the Flow evaluation to qualify for the additional $50 bonus rebate.",
    shortNote:
      "Longmont offers up to $65 on a Wi-Fi irrigation controller, plus a $50 bonus rebate when you complete a free Slow the Flow evaluation — a total of up to $115.",
    freeInstallProgram: false,
    utilityRebateUrl:
      "https://longmontcolorado.gov/water/rates-and-fees-water-storm-sewer/assistance-rebates-water/",
  },
  {
    slug: "louisville",
    name: "Louisville",
    rebateType: "free-install",
    shortNote:
      "Louisville water customers can get a Rachio 3 controller installed for free through Resource Central's Slow the Flow program — a limited number of slots open every season starting mid-June.",
    freeInstallProgram: true,
    freeInstallNote:
      "Sign up at slowtheflow.resourcecentral.org for the 2026 interest list. While you wait for your spot, Trailhead can also do a paid install if you don't want to wait.",
    utilityRebateUrl:
      "https://www.louisvilleco.gov/living-in-louisville/residents/sustainability/water",
  },
  {
    slug: "lafayette",
    name: "Lafayette",
    rebateType: "cash-or-free",
    cashRebate: 100,
    shortNote:
      "Lafayette offers two paths: a utility rebate (up to ~$100, contact the city for current amount) on any WaterSense controller, OR a free Rachio install through Resource Central — pick whichever opens up first.",
    freeInstallProgram: true,
    freeInstallNote:
      "The free install requires a Slow the Flow evaluation first. Slots fill quickly, so the cash-rebate path is often a better bet.",
    utilityRebateUrl:
      "https://www.lafayetteco.gov/3849/Outdoor-Water-Efficiency-Rebates",
  },
  {
    slug: "firestone",
    name: "Firestone",
    rebateType: "none",
    shortNote:
      "Firestone does not currently run a smart-controller rebate program, but the long-term water savings from a Rachio (typically 20–30% on outdoor water use) usually pay back the install in 2–3 seasons.",
    freeInstallProgram: false,
  },
]

export function getCityRachio(slug: string): RachioCityProgram | undefined {
  return CITY_RACHIO.find((c) => c.slug === slug)
}

/** Total potential rebate (utility cash + Rachio mfg rebate) for a city. */
export function maxRebate(city: RachioCityProgram): number {
  if (city.rebateType === "free-install") return RACHIO_PRICING.controller16Zone // free
  const cash = city.cashRebate ?? 0
  const bonus = city.bonusRebate ?? 0
  return cash + bonus + RACHIO_PRICING.manufacturerRebate
}

/** Estimated net cost after rebates for a given city + zone count. */
export function estimateNetCost(
  city: RachioCityProgram,
  zones: number
): { gross: number; rebates: number; net: number; isFree: boolean } {
  const gross =
    zones <= 8 ? RACHIO_PRICING.controller8Zone : RACHIO_PRICING.controller16Zone

  if (city.rebateType === "free-install") {
    return { gross, rebates: gross, net: 0, isFree: true }
  }

  const cash = city.cashRebate ?? 0
  const bonus = city.bonusRebate ?? 0
  const rebates = cash + bonus + RACHIO_PRICING.manufacturerRebate
  const net = Math.max(0, gross - rebates)
  return { gross, rebates, net, isFree: false }
}
