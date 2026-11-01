"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  MAX_ZONES,
  MIN_ZONES,
  SEASON_PASS_VISITS,
  seasonPassPrice,
  visitPrice,
} from "@/lib/season-pass"

// The Season Pass card with a zone selector. Price is the published per-zone
// price of the three visits added up (see src/lib/season-pass.ts).

const ZONE_OPTIONS = Array.from({ length: MAX_ZONES - MIN_ZONES + 1 }, (_, i) => MIN_ZONES + i)

export function SeasonPassCalculator({
  className,
  ctaHref = "/contact",
  ctaLabel = "Reserve my season",
}: {
  className?: string
  ctaHref?: string
  ctaLabel?: string
}) {
  const [zones, setZones] = useState(MIN_ZONES)
  const total = seasonPassPrice(zones)

  return (
    <Card className={cn("relative border-2 border-primary rounded-lg flex flex-col shadow-lg", className)}>
      <CardHeader className="pb-3">
        <Badge className="w-fit mb-3">Three visits, one schedule</Badge>
        <CardTitle className="font-display text-3xl font-semibold text-navy">Season Pass</CardTitle>
        <p className="mt-3 flex items-baseline gap-2">
          <span className="font-display text-5xl font-bold text-navy tabular-nums">${total}</span>
          <span className="text-sm text-muted-foreground">per season</span>
        </p>
        <label className="mt-4 flex items-center gap-3 text-sm font-medium text-foreground">
          How many zones?
          <select
            id="season-pass-zones"
            value={zones}
            onChange={(e) => setZones(Number(e.target.value))}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {ZONE_OPTIONS.map((z) => (
              <option key={z} value={z}>
                {z === MIN_ZONES ? `Up to ${z}` : z}
              </option>
            ))}
          </select>
        </label>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 flex-1">
        <ul className="flex flex-col gap-2.5">
          {SEASON_PASS_VISITS.map((v) => (
            <li key={v.key} className="flex items-start gap-2.5 text-sm">
              <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <span className="font-medium text-foreground">{v.name}</span>
                <span className="text-muted-foreground tabular-nums"> &middot; ${visitPrice(v, zones)}</span>
              </span>
            </li>
          ))}
          <li className="flex items-start gap-2.5 text-sm">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" aria-hidden="true" />
            <span className="text-foreground">Blowout date reserved in July, before the freeze rush</span>
          </li>
          <li className="flex items-start gap-2.5 text-sm">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" aria-hidden="true" />
            <span className="text-foreground">One card on file, charged after each visit. Nothing up front.</span>
          </li>
        </ul>
        <Link href={ctaHref} className={cn(buttonVariants({ size: "lg" }), "mt-auto w-full")}>
          {ctaLabel}
        </Link>
      </CardContent>
    </Card>
  )
}
