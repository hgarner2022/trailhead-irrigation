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
  SEASON_PASS_ADD_ON,
  passVisits,
  seasonPassPrice,
  visitPrice,
} from "@/lib/season-pass"

// The Season Pass card with a zone selector and the July add-on box. Price is
// the published per-zone price of the chosen visits added up (see
// src/lib/season-pass.ts).

const ZONE_OPTIONS = Array.from({ length: MAX_ZONES - MIN_ZONES + 1 }, (_, i) => MIN_ZONES + i)

export function SeasonPassCalculator({
  className,
  ctaHref = "/contact",
  ctaLabel = "Reserve my season",
  carryZones = false,
}: {
  className?: string
  ctaHref?: string
  ctaLabel?: string
  /** add the chosen zone count to the link (`?zones=8`), for the checkout, which opens on it */
  carryZones?: boolean
}) {
  const [zones, setZones] = useState(MIN_ZONES)
  const [inspection, setInspection] = useState(false)
  const total = seasonPassPrice(zones, inspection)

  return (
    <Card className={cn("relative border-2 border-primary rounded-lg flex flex-col shadow-lg", className)}>
      <CardHeader className="pb-3">
        <Badge className="w-fit mb-3">Two visits, one schedule</Badge>
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
          {passVisits(inspection).map((v) => (
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
            <span className="text-foreground">Your blowout is scheduled before the freeze rush</span>
          </li>
          <li>
            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={inspection}
                onChange={(e) => setInspection(e.target.checked)}
                className="h-5 w-5 shrink-0 mt-0.5 rounded-lg border border-border accent-primary"
              />
              <span>
                <span className="font-medium text-foreground">Add the {SEASON_PASS_ADD_ON.name.toLowerCase()}</span>
                <span className="text-muted-foreground tabular-nums"> &middot; ${visitPrice(SEASON_PASS_ADD_ON, zones)} in July</span>
              </span>
            </label>
          </li>
          <li className="flex items-start gap-2.5 text-sm">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" aria-hidden="true" />
            <span className="text-foreground">One card on file, charged after each visit. Nothing up front.</span>
          </li>
        </ul>
        <Link href={carryZones ? `${ctaHref}?zones=${zones}` : ctaHref} className={cn(buttonVariants({ size: "lg" }), "mt-auto w-full")}>
          {ctaLabel}
        </Link>
      </CardContent>
    </Card>
  )
}
