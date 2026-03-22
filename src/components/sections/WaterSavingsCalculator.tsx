"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  ChevronDown,
  ArrowRight,
  Droplets,
  Cpu,
  TrendingDown,
  Calculator,
} from "lucide-react"

/* ─── Water rate tiers (per 1,000 gallons) ─── */
const WATER_RATES: Record<string, { upTo: number; rate: number }[]> = {
  erie: [
    { upTo: 5000, rate: 6.48 },
    { upTo: 15000, rate: 8.1 },
    { upTo: 25000, rate: 12.12 },
    { upTo: Infinity, rate: 18.14 },
  ],
  longmont: [{ upTo: Infinity, rate: 7.82 }],
  lafayette: [
    { upTo: 7000, rate: 6.55 },
    { upTo: 15000, rate: 9.83 },
    { upTo: 25000, rate: 14.74 },
    { upTo: 33000, rate: 18.36 },
    { upTo: Infinity, rate: 22.99 },
  ],
  louisville: [{ upTo: Infinity, rate: 12.0 }],
}

const CITY_OPTIONS = [
  { value: "erie", label: "Erie" },
  { value: "longmont", label: "Longmont" },
  { value: "louisville", label: "Louisville" },
  { value: "lafayette", label: "Lafayette" },
]

const ZONE_OPTIONS = Array.from({ length: 14 }, (_, i) => i + 3)

const BASE_GALLONS_PER_ZONE_PER_MONTH = 2000
const IRRIGATION_MONTHS = 5
const SMART_CONTROLLER_SAVINGS = 0.27
const MPR_NOZZLE_SAVINGS = 0.35
const SMART_CONTROLLER_COST_8 = 350
const SMART_CONTROLLER_COST_16 = 400
const MPR_COST_PER_ZONE = 100

/**
 * Calculate the cost of water based on tiered rates.
 * Irrigation water pushes into higher tiers, so we calculate from the top down.
 */
function calculateWaterCost(
  gallons: number,
  city: string
): number {
  const tiers = WATER_RATES[city]
  if (!tiers) return 0

  let remaining = gallons
  let cost = 0

  for (const tier of tiers) {
    if (remaining <= 0) break
    const prevUpTo = tiers.indexOf(tier) > 0 ? tiers[tiers.indexOf(tier) - 1].upTo : 0
    const tierCapacity = tier.upTo === Infinity ? remaining : tier.upTo - prevUpTo
    const gallonsInTier = Math.min(remaining, tierCapacity)
    cost += (gallonsInTier / 1000) * tier.rate
    remaining -= gallonsInTier
  }

  return cost
}

export function WaterSavingsCalculator() {
  const [city, setCity] = useState("erie")
  const [zones, setZones] = useState(8)
  const [hasSmartController, setHasSmartController] = useState(false)
  const [hasMprNozzles, setHasMprNozzles] = useState(false)

  const results = useMemo(() => {
    const totalBaseline =
      BASE_GALLONS_PER_ZONE_PER_MONTH * zones * IRRIGATION_MONTHS

    let controllerSavingsGal = 0
    let controllerCost = 0
    let mprSavingsGal = 0
    let mprCost = 0

    // Smart controller savings: percentage of total
    if (!hasSmartController) {
      controllerSavingsGal = Math.round(totalBaseline * SMART_CONTROLLER_SAVINGS)
      controllerCost = zones <= 8 ? SMART_CONTROLLER_COST_8 : SMART_CONTROLLER_COST_16
    }

    // MPR nozzle savings: percentage of remaining water per zone
    if (!hasMprNozzles) {
      const remainingAfterController = totalBaseline - controllerSavingsGal
      mprSavingsGal = Math.round(remainingAfterController * MPR_NOZZLE_SAVINGS)
      mprCost = zones * MPR_COST_PER_ZONE
    }

    const totalSavingsGal = controllerSavingsGal + mprSavingsGal
    const totalUpgradeCost = controllerCost + mprCost

    // Calculate cost savings using tiered rates
    // The savings come from the top tiers since irrigation pushes into high usage
    const costAtBaseline = calculateWaterCost(totalBaseline, city)
    const costAfterUpgrades = calculateWaterCost(
      totalBaseline - totalSavingsGal,
      city
    )
    const totalCostSavings = costAtBaseline - costAfterUpgrades

    // Controller cost savings
    const costWithoutController = calculateWaterCost(totalBaseline, city)
    const costWithController = calculateWaterCost(
      totalBaseline - controllerSavingsGal,
      city
    )
    const controllerCostSavings = costWithoutController - costWithController

    // MPR cost savings
    const mprCostSavings = totalCostSavings - controllerCostSavings

    const paybackMonths =
      totalCostSavings > 0
        ? Math.round((totalUpgradeCost / totalCostSavings) * 12)
        : 0

    return {
      totalSavingsGal,
      totalCostSavings,
      totalUpgradeCost,
      paybackMonths,
      controllerSavingsGal,
      controllerCostSavings,
      controllerCost,
      mprSavingsGal,
      mprCostSavings,
      mprCost,
      needsUpgrades: !hasSmartController || !hasMprNozzles,
    }
  }, [city, zones, hasSmartController, hasMprNozzles])

  return (
    <section className="relative bg-navy section-padding-y overflow-hidden">
      {/* Dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative container-padding-x mx-auto max-w-7xl">
        <div className="text-center mb-10">
          <Badge className="mb-4 bg-primary/20 text-primary-light border-primary/30">
            <Calculator className="w-3.5 h-3.5 mr-1.5" />
            Savings Calculator
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Estimate Your Water Savings
          </h2>
          <p className="mt-3 text-white/70 max-w-2xl mx-auto">
            See how much water and money you could save based on your city&apos;s
            actual tiered water rates and your system size.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* ─── Inputs ─── */}
          <div className="flex flex-col gap-5">
            <SelectField
              label="City"
              value={city}
              onChange={setCity}
              options={CITY_OPTIONS.map((c) => ({
                value: c.value,
                label: c.label,
              }))}
            />
            <SelectField
              label="Number of Zones"
              value={String(zones)}
              onChange={(v) => setZones(Number(v))}
              options={ZONE_OPTIONS.map((z) => ({
                value: String(z),
                label: `${z} zones`,
              }))}
            />
            <SelectField
              label="Current Controller"
              value={hasSmartController ? "smart" : "traditional"}
              onChange={(v) => setHasSmartController(v === "smart")}
              options={[
                { value: "traditional", label: "Traditional Timer" },
                { value: "smart", label: "Already Have Smart Controller" },
              ]}
            />
            <SelectField
              label="Current Nozzle Type"
              value={hasMprNozzles ? "mpr" : "standard"}
              onChange={(v) => setHasMprNozzles(v === "mpr")}
              options={[
                { value: "standard", label: "Standard Spray Nozzles" },
                { value: "mpr", label: "Already Have MPR Nozzles" },
              ]}
            />
          </div>

          {/* ─── Results ─── */}
          <Card className="rounded-2xl border-0 shadow-lg">
            <CardContent className="p-6 md:p-8 flex flex-col gap-5">
              {results.needsUpgrades ? (
                <>
                  <h3 className="text-lg font-semibold text-foreground">
                    Your Estimated Savings*
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <ResultStat
                      label="Annual Water Savings"
                      value={`${results.totalSavingsGal.toLocaleString()} gal`}
                      icon={<Droplets className="w-4 h-4 text-blue-500" />}
                    />
                    <ResultStat
                      label="Annual Cost Savings"
                      value={`$${Math.round(results.totalCostSavings).toLocaleString()}`}
                      icon={<TrendingDown className="w-4 h-4 text-success" />}
                    />
                    <ResultStat
                      label="Upgrade Investment"
                      value={`$${results.totalUpgradeCost.toLocaleString()}`}
                      icon={<Cpu className="w-4 h-4 text-primary" />}
                    />
                    <ResultStat
                      label="Payback Period"
                      value={
                        results.paybackMonths > 0
                          ? `~${results.paybackMonths} months`
                          : "—"
                      }
                      icon={<Calculator className="w-4 h-4 text-muted" />}
                    />
                  </div>

                  {/* Per-upgrade breakdown */}
                  <div className="border-t border-border pt-4 flex flex-col gap-3">
                    <p className="text-sm font-medium text-foreground">
                      Upgrade Breakdown
                    </p>
                    {!hasSmartController && (
                      <BreakdownRow
                        label="Rachio 3 Smart Controller"
                        gallons={results.controllerSavingsGal}
                        dollars={results.controllerCostSavings}
                        cost={results.controllerCost}
                      />
                    )}
                    {!hasMprNozzles && (
                      <BreakdownRow
                        label="MPR Nozzle Retrofit"
                        gallons={results.mprSavingsGal}
                        dollars={results.mprCostSavings}
                        cost={results.mprCost}
                      />
                    )}
                  </div>

                  <Link
                    href="/contact"
                    className={cn(buttonVariants({ size: "lg" }), "mt-2 w-full")}
                  >
                    Get a Free Estimate
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-8 gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-success/10">
                    <Droplets className="w-6 h-6 text-success" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Your System Is Already Efficient
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    You already have a smart controller and MPR nozzles — great
                    job! Consider a drip zone conversion or yard layout evaluation
                    for additional savings.
                  </p>
                  <Link
                    href="/contact"
                    className={cn(buttonVariants(), "mt-2")}
                  >
                    Schedule an Evaluation
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-white/40 text-xs mt-6 max-w-2xl mx-auto">
          * These numbers are estimates based on typical usage and your city&apos;s
          published water rates. Actual savings depend on your property, soil
          type, sun exposure, and watering habits.{" "}
          <Link href="/contact" className="text-white/60 underline underline-offset-2 hover:text-white/80 transition-colors">
            Contact us
          </Link>{" "}
          for a personalized evaluation.
        </p>
      </div>
    </section>
  )
}

/* ─── Helper Components ─── */

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-white/80">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-white text-foreground font-medium text-sm rounded-lg pl-4 pr-10 py-3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  )
}

function ResultStat({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-stone p-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className="text-lg font-bold text-foreground">{value}</span>
    </div>
  )
}

function BreakdownRow({
  label,
  gallons,
  dollars,
  cost,
}: {
  label: string
  gallons: number
  dollars: number
  cost: number
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-cream p-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Saves {gallons.toLocaleString()} gal/yr</span>
        <span>Saves ${Math.round(dollars)}/yr</span>
        <span>Cost: ${cost.toLocaleString()}</span>
      </div>
    </div>
  )
}
