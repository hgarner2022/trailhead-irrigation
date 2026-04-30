"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowRight, Sparkles, Droplets, DollarSign, AlertTriangle, Layers } from "lucide-react"

// Constants — sourced from EPA WaterSense + Rachio published data + 2026
// Northern Colorado residential water rate averages.
const GALLONS_PER_SQFT_PER_WEEK = 0.62
const WATERING_WEEKS_PER_YEAR = 26 // mid-April to mid-October on the Front Range
const RACHIO_REDUCTION = 0.25 // midpoint of Rachio's 20–30% range
const WATER_RATE_PER_GALLON = 0.008 // ~$8 per 1,000 gal — mid-tier 2026 Front Range avg

const LAWN_PRESETS = [
  { label: "Small (≈1,500 sq ft)", value: 1500 },
  { label: "Medium (≈3,500 sq ft)", value: 3500 },
  { label: "Large (≈7,000 sq ft)", value: 7000 },
  { label: "X-Large (≈12,000 sq ft)", value: 12000 },
]

export function CalculatorClient() {
  const [sqft, setSqft] = useState<number>(3500)

  const result = useMemo(() => {
    const annualGallons = sqft * GALLONS_PER_SQFT_PER_WEEK * WATERING_WEEKS_PER_YEAR
    const gallonsSaved = Math.round(annualGallons * RACHIO_REDUCTION)
    const dollarsSaved = Math.round(gallonsSaved * WATER_RATE_PER_GALLON)
    const installCost = sqft <= 5000 ? 350 : 420
    const paybackYears = dollarsSaved > 0 ? installCost / dollarsSaved : 0
    return {
      annualGallons: Math.round(annualGallons),
      gallonsSaved,
      dollarsSaved,
      installCost,
      paybackYears,
    }
  }, [sqft])

  return (
    <section className="bg-background section-padding-y">
      <div className="container-padding-x mx-auto max-w-4xl">
        <Card className="border-2 border-primary/20 overflow-hidden">
          <div className="bg-primary/5 border-b border-border px-6 md:px-10 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Water Savings Calculator
            </p>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mt-1">
              See how much your Rachio could save
            </h2>
          </div>

          <CardContent className="p-6 md:p-10">
            {/* Input */}
            <div className="mb-8">
              <label
                htmlFor="sqft-input"
                className="font-semibold text-foreground flex items-center gap-2 mb-2"
              >
                <Layers className="h-4 w-4 text-primary" />
                Approximate lawn size (sq ft)
              </label>

              <div className="flex flex-wrap gap-2 mb-3">
                {LAWN_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setSqft(p.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm border transition-colors",
                      sqft === p.value
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-background text-foreground hover:border-primary/50"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <input
                id="sqft-input"
                type="number"
                min={500}
                max={50000}
                step={250}
                value={sqft}
                onChange={(e) =>
                  setSqft(
                    Math.max(500, Math.min(50000, Number(e.target.value) || 500))
                  )
                }
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Not sure? A typical Erie or Longmont single-family lot has ~3,000–6,000 sq ft of irrigated turf. Most Boulder County HOA homes fall in the 2,500–5,000 sq ft range.
              </p>
            </div>

            {/* Result */}
            <div className="rounded-xl bg-gradient-to-br from-cream to-stone p-6 md:p-8 border border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-full bg-primary/10 p-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Your estimated savings with a Rachio 3
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="rounded-lg bg-background p-5 border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Droplets className="h-4 w-4 text-primary" />
                    Gallons saved per year
                  </div>
                  <p className="text-3xl md:text-4xl font-bold text-foreground">
                    {result.gallonsSaved.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Out of ~{result.annualGallons.toLocaleString()} gal annual outdoor use
                  </p>
                </div>

                <div className="rounded-lg bg-background p-5 border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Dollars saved per year
                  </div>
                  <p className="text-3xl md:text-4xl font-bold text-foreground">
                    ${result.dollarsSaved}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    At ~$0.008/gal mid-tier Front Range rate
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-lg bg-primary/5 border border-primary/20 p-5">
                <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-1">
                  Install payback
                </p>
                <p className="text-foreground leading-relaxed">
                  At Trailhead&apos;s installed price of{" "}
                  <strong>${result.installCost}</strong> (Rachio 3 with professional installation),
                  water-bill savings alone pay back the install in approximately{" "}
                  <strong>{result.paybackYears.toFixed(1)} watering seasons</strong>.
                  A city utility rebate (where available) shortens this further.
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Link
                href="/book"
                className={cn(buttonVariants({ size: "lg" }), "flex-1")}
              >
                Book My Rachio Install
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/smart-controllers"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "flex-1"
                )}
              >
                See pricing &amp; rebate info
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* DISCLAIMER */}
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-5 flex gap-3 text-sm text-amber-900 leading-relaxed">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Estimate only.</strong> Actual savings vary based on lawn size, soil type, slope, sun exposure, plant types, your current watering schedule, and your specific water utility&apos;s pricing tiers.
            The numbers above use industry averages from EPA WaterSense and Rachio&apos;s published efficiency data — they&apos;re a directional estimate, not a guarantee.
          </div>
        </div>
      </div>
    </section>
  )
}
