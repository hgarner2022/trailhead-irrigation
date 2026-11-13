import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./chart"

const meta = {
  title: "UI/Chart",
  component: ChartContainer,
} satisfies Meta<typeof ChartContainer>
export default meta
// ChartContainer has required props (config, children), so a StoryObj typed from the meta
// would demand args; these stories render their own markup instead.
type Story = StoryObj

// Invented numbers: whole dollars of revenue by month, this year against last.
const MONTHS = [
  { month: "May", thisYear: 18400, lastYear: 15200 },
  { month: "Jun", thisYear: 21900, lastYear: 17600 },
  { month: "Jul", thisYear: 19700, lastYear: 16900 },
  { month: "Aug", thisYear: 17300, lastYear: 14800 },
  { month: "Sep", thisYear: 24600, lastYear: 19100 },
  { month: "Oct", thisYear: 31200, lastYear: 25400 },
]

// `@theme inline` only emits a token as a CSS variable when some class references
// it with var(), so the Bar and Line carry fill-(--color-chart-N) / stroke-(--color-chart-N)
// classes. That one reference makes --color-chart-N exist on :root for the config
// colours, the tooltip swatches and the legend. Entrance animation is off so the
// catalog and its screenshots show the finished chart.
const barConfig = {
  thisYear: { label: "2026", color: "var(--color-chart-1)" },
  lastYear: { label: "2025", color: "var(--color-chart-2)" },
} satisfies ChartConfig

const lineConfig = {
  passes: { label: "Passes sold", color: "var(--color-chart-1)" },
} satisfies ChartConfig

const dollars = (value: number) => `$${value.toLocaleString("en-US")}`

export const GroupedBars: Story = {
  render: () => (
    <div className="m-6 max-w-3xl">
      <ChartContainer config={barConfig} className="min-h-[240px] w-full">
        <BarChart data={MONTHS} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={dollars} width={64} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="thisYear" fill="var(--color-thisYear)" radius={4} isAnimationActive={false} className="fill-(--color-chart-1)" />
          <Bar dataKey="lastYear" fill="var(--color-lastYear)" radius={4} isAnimationActive={false} className="fill-(--color-chart-2)" />
        </BarChart>
      </ChartContainer>
    </div>
  ),
}

const WEEKS = [
  { week: "Sep 1", passes: 4 },
  { week: "Sep 8", passes: 7 },
  { week: "Sep 15", passes: 9 },
  { week: "Sep 22", passes: 14 },
  { week: "Sep 29", passes: 19 },
  { week: "Oct 6", passes: 23 },
]

export const SingleLine: Story = {
  render: () => (
    <div className="m-6 max-w-3xl">
      <ChartContainer config={lineConfig} className="min-h-[240px] w-full">
        <LineChart data={WEEKS} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} width={32} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Line
            dataKey="passes"
            type="monotone"
            stroke="var(--color-passes)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            className="stroke-(--color-chart-1)"
          />
        </LineChart>
      </ChartContainer>
    </div>
  ),
}
