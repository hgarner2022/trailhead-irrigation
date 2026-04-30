"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowRight, Sparkles } from "lucide-react"
import {
  CITY_RACHIO,
  RACHIO_PRICING,
  estimateNetCost,
  type RachioCityProgram,
} from "@/lib/rachio-data"

export function CalculatorClient() {
  const [citySlug, setCitySlug] = useState<string>("erie")
  const [zones, setZones] = useState<number>(8)

  const city = useMemo<RachioCityProgram>(
    () => CITY_RACHIO.find((c) => c.slug === citySlug) ?? CITY_RACHIO[0],
    [citySlug]
  )

  const result = useMemo(() => estimateNetCost(city, zones), [city, zones])

  return (
    <section className="bg-background section-padding-y">
      <div className="container-padding-x mx-auto max-w-4xl">
        <Card className="border-2 border-primary/20">
          <CardContent className="p-6 md:p-10">
            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="city-select"
                  className="font-semibold text-foreground"
                >
                  Your city
                </label>
                <select
                  id="city-select"
                  value={citySlug}
                  onChange={(e) => setCitySlug(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {CITY_RACHIO.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}, CO
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="zone-input" className="font-semibold text-foreground">
                  Number of zones
                </label>
                <input
                  id="zone-input"
                  type="number"
                  min={1}
                  max={32}
                  value={zones}
                  onChange={(e) =>
                    setZones(Math.max(1, Math.min(32, Number(e.target.value) || 1)))
                  }
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  8 zones or fewer uses the Rachio 3 8-zone (${RACHIO_PRICING.controller8Zone}). 9+ zones uses the 16-zone (${RACHIO_PRICING.controller16Zone}).
                </p>
              </div>
            </div>

            {/* Result */}
            <div className="rounded-xl bg-cream p-6 md:p-8">
              <div className="flex items-start gap-3 mb-4">
                <Sparkles className="h-6 w-6 text-primary shrink-0 mt-1" />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Your estimated cost in {city.name}
                  </p>
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground mt-1">
                    {result.isFree
                      ? "Free Rachio install available"
                      : `Net cost: $${result.net}`}
                  </h3>
                </div>
              </div>

              {result.isFree ? (
                <div className="flex flex-col gap-3">
                  <p className="text-muted-foreground leading-relaxed">
                    {city.name} water customers can get a Rachio 3 installed{" "}
                    <strong>free</strong> through Resource Central&apos;s Slow the Flow program.
                    Slots are limited each season.
                  </p>
                  {city.freeInstallNote && (
                    <p className="text-sm text-muted-foreground">{city.freeInstallNote}</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <Row label="Trailhead installed price" value={`$${result.gross}`} />
                  {city.cashRebate ? (
                    <Row
                      label={`${city.name} utility rebate`}
                      value={`-$${city.cashRebate}`}
                      negative
                    />
                  ) : null}
                  {city.bonusRebate ? (
                    <Row
                      label="Slow the Flow bonus"
                      value={`-$${city.bonusRebate}`}
                      negative
                    />
                  ) : null}
                  <Row
                    label="Rachio manufacturer rebate"
                    value={`-$${RACHIO_PRICING.manufacturerRebate}`}
                    negative
                  />
                  <Row
                    label="Total rebates"
                    value={`-$${result.rebates}`}
                    bold
                    negative
                  />
                  <Row
                    label="Your net cost"
                    value={`$${result.net}`}
                    bold
                  />
                </div>
              )}

              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
                {city.shortNote}
              </p>

              {city.bonusCondition && (
                <p className="mt-3 text-sm text-primary font-medium">
                  💡 {city.bonusCondition}
                </p>
              )}
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
                href={`/smart-controllers/${city.slug}`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "flex-1"
                )}
              >
                See {city.name} rebate details
              </Link>
            </div>

            {city.utilityRebateUrl && (
              <p className="mt-4 text-xs text-muted-foreground text-center">
                <Badge variant="outline" className="mr-2">Source</Badge>
                Utility rebate amounts pulled from{" "}
                <a
                  href={city.utilityRebateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  the {city.name} water rebate program
                </a>
                . Programs change — confirm current amounts before booking.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function Row({
  label,
  value,
  negative,
  bold,
}: {
  label: string
  value: string
  negative?: boolean
  bold?: boolean
}) {
  return (
    <div
      className={cn(
        "flex justify-between items-baseline border-b border-border pb-2",
        bold && "border-b-0 pt-2 border-t border-border"
      )}
    >
      <span
        className={cn(
          "text-sm",
          bold ? "font-semibold text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          bold ? "text-xl font-bold" : "text-base font-medium",
          negative ? "text-success" : "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  )
}
