// Trailhead Rachio install pricing + per-city utility rebate amounts.
// Update RACHIO_PRICING and CITY_RACHIO when prices/rebates change.
//
// Source of truth for utility rebate amounts: src/lib/rebate-data.ts
// (which mirrors the official municipal program pages).

export const RACHIO_PRICING = {
  controller8Zone: 350,
  controller16Zone: 420,
} as const

export type RachioCityProgram = {
  slug: string
  name: string
  rebateType: "cash" | "free-install" | "cash-or-free" | "none"
  /** Cash utility rebate dollar amount. Undefined when amount is unpublished. */
  cashRebate?: number
  /** Whether the published cash rebate amount is unknown / TBD. */
  cashRebateUnknown?: boolean
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
      "Town of Erie offers a $100 utility-bill rebate on any WaterSense-certified smart controller (including the Rachio 3). The rebate followed Erie's early-2026 water supply emergency.",
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
      "Longmont offers up to $65 on a Wi-Fi irrigation controller, plus a $50 bonus rebate when you complete a free Slow the Flow evaluation, for a total of up to $115.",
    freeInstallProgram: false,
    utilityRebateUrl:
      "https://longmontcolorado.gov/water/rates-and-fees-water-storm-sewer/assistance-rebates-water/",
  },
  {
    slug: "louisville",
    name: "Louisville",
    rebateType: "none",
    shortNote:
      "Louisville doesn't run a city smart-controller rebate. A Rachio still saves a Front Range home 8,000 to 15,000 gallons a year, which pays the install back on water bills within a few seasons.",
    freeInstallProgram: false,
  },
  {
    slug: "lafayette",
    name: "Lafayette",
    rebateType: "cash-or-free",
    cashRebateUnknown: true,
    shortNote:
      "Lafayette offers two paths. The city pays a utility rebate on any WaterSense controller (confirm the current amount with the city before booking), and Resource Central runs a free Rachio install program. Take whichever opens up first.",
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

export type NetCostResult = {
  gross: number
  rebates: number
  net: number
  isFree: boolean
  /** True when we can't quote a net price because the rebate amount isn't published. */
  isUnknown: boolean
}

/** Estimated net cost after rebates for a given city + zone count. */
export function estimateNetCost(
  city: RachioCityProgram,
  zones: number
): NetCostResult {
  const gross =
    zones <= 8 ? RACHIO_PRICING.controller8Zone : RACHIO_PRICING.controller16Zone

  if (city.rebateType === "free-install" && !city.cashRebate) {
    return { gross, rebates: gross, net: 0, isFree: true, isUnknown: false }
  }

  if (city.cashRebateUnknown) {
    return { gross, rebates: 0, net: gross, isFree: false, isUnknown: true }
  }

  const cash = city.cashRebate ?? 0
  const bonus = city.bonusRebate ?? 0
  const rebates = cash + bonus
  const net = Math.max(0, gross - rebates)
  return { gross, rebates, net, isFree: false, isUnknown: false }
}
