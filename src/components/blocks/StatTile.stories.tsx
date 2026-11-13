import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Invoice, Pass, Quote } from "@/lib/admin/types"
import { committedRevenue, formatMoney, invoicesOverdue, monthComparison, quotesAwaiting } from "@/lib/admin/metrics"
import { StatTile } from "./StatTile"

// The snapshot holds 2026 only, so every comparison against 2025 reads
// "No comparison yet"; the GoodUp, GoodDown and Bad stories invent a delta
// to show the colour rule. Sparkline numbers are invented too.
const october = monthComparison(snapshot.monthTotals, 2026, 10)
const november = monthComparison(snapshot.monthTotals, 2026, 11)
const passes = snapshot.passes as Pass[]
const quotes = quotesAwaiting(snapshot.quotes as Quote[])
const overdue = invoicesOverdue(snapshot.invoices as Invoice[], snapshot.syncedAt)
const activePasses = passes.filter((p) => p.status === "active").length

const thisYear = [3331, 5663, 12448, 11392, 7299, 13247, 18365, 3245, 0, 0, 0, 0]
const lastYear = [2900, 4800, 9900, 9400, 6100, 10800, 14200, 2600, 0, 0, 0, 0]

const meta = {
  title: "Blocks/StatTile",
  component: StatTile,
  parameters: { layout: "padded" },
  args: {
    label: "October revenue",
    value: formatMoney(october.current),
    delta: { value: october.deltaPct, baseline: "October 2025", goodWhen: "up" },
  },
} satisfies Meta<typeof StatTile>
export default meta
type Story = StoryObj<typeof meta>

const narrow = (story: React.ReactNode) => <div className="max-w-xs">{story}</div>

export const Default: Story = {
  render: (args) => narrow(<StatTile {...args} />),
}

export const GoodUp: Story = {
  args: { delta: { value: 12, baseline: "October 2025", goodWhen: "up" } },
  render: (args) => narrow(<StatTile {...args} />),
}

export const GoodDown: Story = {
  args: { label: "Invoices past due", value: "3", delta: { value: -8, baseline: "last month", goodWhen: "down" } },
  render: (args) => narrow(<StatTile {...args} />),
}

export const Bad: Story = {
  args: { delta: { value: -8, baseline: "October 2025", goodWhen: "up" } },
  render: (args) => narrow(<StatTile {...args} />),
}

export const WithSparkline: Story = {
  args: {
    label: "Revenue this year",
    value: formatMoney(thisYear.reduce((s, n) => s + n, 0)),
    delta: { value: 24, baseline: "the same months of 2025", goodWhen: "up" },
    sparkline: { current: thisYear.slice(0, 8), previous: lastYear.slice(0, 8) },
  },
  render: (args) => narrow(<StatTile {...args} />),
}

export const AsLink: Story = {
  args: { href: "/admin/invoices", delta: { value: 12, baseline: "October 2025", goodWhen: "up" } },
  render: (args) => narrow(<StatTile {...args} />),
}

/** The four tiles Home opens with, every number computed from the snapshot. */
function HomeRow() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatTile label="Revenue this month" value={formatMoney(november.current)} delta={{ value: november.deltaPct, baseline: "November 2025", goodWhen: "up" }} href="/admin/invoices" />
      <StatTile label={`Committed on ${activePasses} Season Passes`} value={formatMoney(committedRevenue(passes))} href="/admin/passes" />
      <StatTile label={`${quotes.count} quotes awaiting`} value={formatMoney(quotes.total)} href="/admin/quotes" />
      <StatTile label={`${overdue.count} invoices past due`} value={formatMoney(overdue.total)} delta={{ value: null, baseline: "last month", goodWhen: "down" }} href="/admin/invoices" />
    </div>
  )
}

export const Row: Story = {
  render: () => <HomeRow />,
}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
  render: () => (
    <div className="w-[360px] max-w-full">
      <HomeRow />
    </div>
  ),
}
