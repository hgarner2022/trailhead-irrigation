import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { formatDelta } from "@/lib/admin/metrics"
import { pointsFor, sparkMax } from "./stat-tile-math"

// One number with its name, its movement against a named baseline and, when
// there is history, a sparkline. The delta is coloured by whether the movement
// is good for the business (DESIGN.md, Charts), never by its direction: more
// past due invoices is up and bad, fewer is down and good. Pure render, no hooks.

export interface StatDelta {
  /** percent change; null when there is nothing to compare against */
  value: number | null
  /** the comparison in words, e.g. "October 2025" or "last month" */
  baseline: string
  goodWhen: "up" | "down"
}

export interface StatTileProps {
  label: string
  /** already formatted, e.g. "$18,365" or "16" */
  value: string
  delta?: StatDelta
  /** up to 24 points each; both lines share one scale */
  sparkline?: { current: number[]; previous?: number[] }
  /** the whole tile becomes a link */
  href?: string
  className?: string
}

function deltaTone(delta: StatDelta): string {
  if (delta.value === null || delta.value === 0) return "text-muted-foreground"
  const good = delta.goodWhen === "up" ? delta.value > 0 : delta.value < 0
  return good ? "text-positive" : "text-warning"
}

function deltaText(delta: StatDelta): string {
  return delta.value === null ? "No comparison yet" : `${formatDelta(delta.value)} vs ${delta.baseline}`
}

function Sparkline({ current, previous }: NonNullable<StatTileProps["sparkline"]>) {
  const max = sparkMax(current, previous)
  const line = { fill: "none", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", vectorEffect: "non-scaling-stroke" } as const
  return (
    <svg data-slot="stat-sparkline" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden className="mt-3 h-6 w-full">
      {previous && previous.length > 0 && <polyline points={pointsFor(previous, max)} strokeDasharray="2 2" className="stroke-chart-2" {...line} />}
      {current.length > 0 && <polyline points={pointsFor(current, max)} className="stroke-chart-1" {...line} />}
    </svg>
  )
}

export function StatTile({ label, value, delta, sparkline, href, className }: StatTileProps) {
  const sentence = [`${label}: ${value}`, delta && deltaText(delta)].filter(Boolean).join(", ")
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {href && <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
      </div>
      <p data-slot="stat-value" className="mt-1 font-display text-4xl font-semibold leading-none tabular-nums text-navy @max-[220px]:text-3xl">
        {value}
      </p>
      {delta && (
        <p data-slot="stat-delta" className={cn("mt-2 text-sm", deltaTone(delta))}>
          {deltaText(delta)}
        </p>
      )}
      {sparkline && <Sparkline {...sparkline} />}
    </>
  )
  const surface = "@container h-full p-5"

  if (href) {
    return (
      <Link
        href={href}
        data-slot="stat-tile"
        aria-label={sentence}
        className={cn("group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50", className)}
      >
        <Card className={cn(surface, "transition-colors group-hover:border-navy/30")}>{body}</Card>
      </Link>
    )
  }
  return (
    <Card data-slot="stat-tile" role="group" aria-label={sentence} className={cn(surface, className)}>
      {body}
    </Card>
  )
}
