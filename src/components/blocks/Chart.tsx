"use client"

import { useId } from "react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from "recharts"
import { cn } from "@/lib/utils"
import { formatMoney } from "@/lib/admin/metrics"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { SEASON_MONTHS, byYearDesc, describeBars, monthRows, yearKey, type YearSeries } from "./chart-data"

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

// Recharts' accessibility layer makes the inner svg a focusable
// role="application", which cannot sit inside our role="img" container, so
// it is off; a visually hidden table under each chart carries the numbers
// for screen readers instead, linked through aria-describedby.

const GRID = "[&_.recharts-cartesian-grid_line]:stroke-(--color-border)"
const LAST_YEAR_OPACITY = 0.55
const axis = { tickLine: false, axisLine: false, tickMargin: 8, interval: "preserveStartEnd", className: "font-display" } as const
const margin = { top: 8, right: 8, bottom: 0, left: 8 }

/** The legend and tooltip swatch: solid orange for this year, dashed navy at LAST_YEAR_OPACITY for last year, the same as the bars. */
function Swatch({ dashed }: { dashed?: boolean }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden className="size-3 shrink-0">
      <rect
        x={1}
        y={1}
        width={10}
        height={10}
        rx={2}
        className={dashed ? "fill-chart-2 stroke-chart-2" : "fill-chart-1"}
        fillOpacity={dashed ? LAST_YEAR_OPACITY : undefined}
        strokeDasharray={dashed ? "2 2" : undefined}
      />
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

/** The numbers behind a chart as a visually hidden table, one row per x value and one column per series. */
function DataTable({ id, caption, columns, rows }: { id: string; caption: string; columns: string[]; rows: (string | number)[][] }) {
  return (
    <table id={id} data-slot="chart-table" className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c} scope="col">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells) => (
          <tr key={String(cells[0])}>
            {cells.map((cell, i) => (i === 0 ? <th key={i} scope="row">{cell}</th> : <td key={i}>{typeof cell === "number" ? formatMoney(cell) : cell}</td>))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface MonthBarsProps {
  /** this year first (chart-1), last year second (chart-2, dashed); a third series is not supported */
  series: [YearSeries, YearSeries?]
  /** 1 to 12; defaults to April through November */
  months?: number[]
  height?: number
  className?: string
}

export function MonthBars({ series, months = SEASON_MONTHS, height = 240, className }: MonthBarsProps) {
  const tableId = useId()
  const present = series.filter((s): s is YearSeries => s !== undefined)
  const rows = monthRows(present, months)
  const sentence = describeBars(present.map((s) => s.year), months)
  const config: ChartConfig = Object.fromEntries(
    present.map(({ year }, i) => [
      yearKey(year),
      i === 0
        ? { label: String(year), color: "var(--color-chart-1)", icon: ThisYearSwatch }
        : { label: String(year), color: "var(--color-chart-2)", icon: LastYearSwatch },
    ]),
  )
  return (
    <div className={cn("w-full", className)}>
      <ChartContainer data-slot="month-bars" role="img" aria-label={sentence} aria-describedby={tableId} config={config} className={cn("aspect-auto w-full", GRID)} style={{ height }}>
        <BarChart data={rows} barCategoryGap="15%" barGap={2} margin={margin} accessibilityLayer={false}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="month" {...axis} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={moneyRow(config)} />} itemSorter={byYearDesc} />
          <ChartLegend content={<ChartLegendContent />} itemSorter={byYearDesc} />
          {present.map(({ year }, i) =>
            i === 0 ? (
              <Bar key={year} dataKey={yearKey(year)} fill={`var(--color-${yearKey(year)})`} radius={[4, 4, 0, 0]} isAnimationActive={false} className="fill-(--color-chart-1)" />
            ) : (
              <Bar
                key={year}
                dataKey={yearKey(year)}
                fill={`var(--color-${yearKey(year)})`}
                fillOpacity={LAST_YEAR_OPACITY}
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
      <DataTable
        id={tableId}
        caption={sentence}
        columns={["Month", ...present.map((s) => String(s.year))]}
        rows={rows.map((r) => [r.month, ...present.map((s) => Number(r[yearKey(s.year)]))])}
      />
    </div>
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
  const tableId = useId()
  return (
    <div className={cn("w-full", className)}>
      <ChartContainer data-slot="trend-line" role="img" aria-label={label} aria-describedby={tableId} config={lineConfig} className={cn("aspect-auto w-full", GRID)} style={{ height }}>
        <LineChart data={data} margin={margin} accessibilityLayer={false}>
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
      <DataTable id={tableId} caption={label} columns={["Period", "Amount"]} rows={data.map((d) => [d.label, d.value])} />
    </div>
  )
}
