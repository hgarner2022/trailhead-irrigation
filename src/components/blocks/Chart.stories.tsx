import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { MonthTotal } from "@/lib/admin/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MonthBars, TrendLine } from "./Chart"

const y2026 = snapshot.monthTotals as MonthTotal[]

// 2025 is invented for the story; Jobber has no 2025 invoices. Each month is
// about 80 percent of 2026, rounded to look like real totals.
const y2025: MonthTotal[] = [2680, 4510, 9960, 9120, 5840, 10590, 14690, 2600].map((revenue, i) => ({
  year: 2025,
  month: 4 + i,
  revenue,
  visits: Math.round(y2026[i].visits * 0.8),
}))

// Committed Season Pass revenue by week, invented for the story.
const weeks = [1450, 2320, 3045, 4205, 5075, 6525, 7540, 9280, 10730, 12325, 13775, 15180].map((value, i) => ({
  label: `Wk ${i + 1}`,
  value,
}))

const meta = {
  title: "Blocks/Chart",
  component: MonthBars,
  parameters: { layout: "padded" },
  args: { series: [{ year: 2026, data: y2026 }, { year: 2025, data: y2025 }] },
} satisfies Meta<typeof MonthBars>
export default meta
type Story = StoryObj<typeof meta>

export const MonthBarsTwoYears: Story = {
  parameters: { docs: { description: { story: "2025 is invented for the story; Jobber has no 2025 invoices." } } },
  render: (args) => (
    <div className="max-w-3xl">
      <MonthBars {...args} />
    </div>
  ),
}

export const MonthBarsOneYear: Story = {
  args: { series: [{ year: 2026, data: y2026 }] },
  render: (args) => (
    <div className="max-w-3xl">
      <MonthBars {...args} />
    </div>
  ),
}

export const TrendLineTwelveWeeks: Story = {
  parameters: { docs: { description: { story: "Committed Season Pass revenue by week over twelve weeks, invented for the story." } } },
  render: () => (
    <div className="max-w-3xl">
      <TrendLine data={weeks} label="Committed Season Pass revenue by week, the last twelve weeks" />
    </div>
  ),
}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
  render: (args) => (
    <div className="w-[360px] max-w-full">
      <MonthBars {...args} height={200} />
    </div>
  ),
}

export const InCard: Story = {
  render: (args) => (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="font-display text-2xl">Revenue by month</CardTitle>
        <CardDescription>Invoiced revenue this season beside the same months last year.</CardDescription>
      </CardHeader>
      <CardContent>
        <MonthBars {...args} />
      </CardContent>
    </Card>
  ),
}
