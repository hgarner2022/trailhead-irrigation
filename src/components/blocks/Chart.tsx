"use client"

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from "recharts"
import { cn } from "@/lib/utils"
import { formatMoney } from "@/lib/admin/metrics"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { SEASON_MONTHS, describeBars, monthRows, yearKey, type YearSeries } from "./chart-data"

// The two chart shapes the dashboard is allowed to use (DESIGN.md, Charts):
// grouped bars by month with this year in chart-1 and last year in chart-2
// drawn dashed, and a single line. No pies, donuts, gauges, treemaps or 3D,
// so this file exports MonthBars and TrendLine and nothing else. Colour
// highlights and never encodes magnitude; the exact numbers live in the
// tooltip, formatted the way the tiles format them.

// `@theme inline` only emits a token as a CSS variable when some class
// references it with var(), so each series carries a fill-(--color-chart-N)
// or stroke-(--color-chart-N) class and the container anchors the grid's
// stroke-(--color-border). That one reference makes the variable exist for
// the config colours, the tooltip swatches and the legend. Animation is off
// so the catalog and its screenshots show the finished chart.

const GRID = "[&_.recharts-cartesian-grid_line]:stroke-(--color-border)"
const axis = { tickLine: false, axisLine: false, tickMargin: 8, interval: "preserveStartEnd", className: "font-display" } as const
const margin = { top: 8, right: 8, bottom: 0, left: 8 }

/** The legend and tooltip swatch: solid orange for this year, dashed navy at 55% for last year, the same as the bars. */
function Swatch({ dashed }: { dashed?: boolean }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden className="size-3 shrink-0">
      <rect x={1} y={1} width={10} height={10} rx={2} className={dashed ? "fill-chart-2/55 stroke-chart-2" : "fill-chart-1"} strokeDasharray={dashed ? "2 2" : undefined} />
    </svg>
  )
}
const ThisYearSwatch = () => <Swatch />
const LastYearSwatch = () => <Swatch dashed />

/** One tooltip row: swatch, series name, money. The shadcn formatter replaces the whole row, so the row is drawn here. */
function moneyRow(config: ChartConfig) {
  return function MoneyRow(value: unknown, name: unknown) {
    const item = config[String(name)]
    const Icon = item?.icon ?? ThisYearSwatch
    return (
      <div className="flex flex-1 items-center justify-between gap-4 leading-none">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon />
          {item?.label ?? String(name)}
        </span>
        <span className="font-medium tabular-nums text-foreground">{formatMoney(Number(value))}</span>
      </div>
    )
  }
}

interface MonthBarsProps {
  /** first series is this year (chart-1), second is last year (chart-2, dashed) */
  series: YearSeries[]
  /** 1 to 12; defaults to April through November */
  months?: number[]
  height?: number
  className?: string
}

export function MonthBars({ series, months = SEASON_MONTHS, height = 240, className }: MonthBarsProps) {
  const rows = monthRows(series, months)
  const config: ChartConfig = Object.fromEntries(
    series.map(({ year }, i) => [
      yearKey(year),
      i === 0
        ? { label: String(year), color: "var(--color-chart-1)", icon: ThisYearSwatch }
        : { label: String(year), color: "var(--color-chart-2)", icon: LastYearSwatch },
    ]),
  )
  return (
    <ChartContainer
      data-slot="month-bars"
      role="img"
      aria-label={describeBars(series.map((s) => s.year), months)}
      config={config}
      className={cn("aspect-auto w-full", GRID, className)}
      style={{ height }}
    >
      <BarChart data={rows} barCategoryGap="15%" barGap={2} margin={margin}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="month" {...axis} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={moneyRow(config)} />} />
        {/* this year first, whatever order the series came in */}
        <ChartLegend content={<ChartLegendContent />} itemSorter={(item) => -Number(String(item.dataKey).slice(1))} />
        {series.map(({ year }, i) =>
          i === 0 ? (
            <Bar key={year} dataKey={yearKey(year)} fill={`var(--color-${yearKey(year)})`} radius={[4, 4, 0, 0]} isAnimationActive={false} className="fill-(--color-chart-1)" />
          ) : (
            <Bar
              key={year}
              dataKey={yearKey(year)}
              fill={`var(--color-${yearKey(year)})`}
              fillOpacity={0.55}
              stroke="var(--color-chart-2)"
              strokeDasharray="3 3"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
              className="fill-(--color-chart-2) stroke-(--color-chart-2)"
            />
          ),
        )}
      </BarChart>
    </ChartContainer>
  )
}

interface TrendLineProps {
  data: { label: string; value: number }[]
  /** the sentence a screen reader gets, e.g. "Committed revenue by week" */
  label: string
  height?: number
  className?: string
}

const lineConfig = { value: { label: "Amount", color: "var(--color-chart-1)", icon: ThisYearSwatch } } satisfies ChartConfig

export function TrendLine({ data, label, height = 240, className }: TrendLineProps) {
  return (
    <ChartContainer data-slot="trend-line" role="img" aria-label={label} config={lineConfig} className={cn("aspect-auto w-full", GRID, className)} style={{ height }}>
      <LineChart data={data} margin={margin}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="label" {...axis} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={moneyRow(lineConfig)} />} />
        <Line
          dataKey="value"
          type="monotone"
          stroke="var(--color-value)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
          isAnimationActive={false}
          className="stroke-(--color-chart-1)"
        />
      </LineChart>
    </ChartContainer>
  )
}
