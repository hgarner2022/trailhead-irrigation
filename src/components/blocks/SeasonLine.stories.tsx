import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass, PassVisit } from "@/lib/admin/types"
import { committedByMonth } from "@/lib/admin/metrics"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SeasonLine } from "./SeasonLine"

// Every story fixes `today` so the marker never drifts with the calendar.
const passes = snapshot.passes as Pass[]
const bars = committedByMonth(passes, 2027)
const active = passes[0]
const allDone: PassVisit[] = passes[1].visits.map((v, i) => ({
  ...v,
  scheduledAt: v.scheduledAt ?? ["2027-04-21T16:00:00Z", "2027-07-13T15:00:00Z", "2027-10-12T16:00:00Z"][i],
  completedAt: ["2027-04-21T17:10:00Z", "2027-07-13T16:05:00Z", "2027-10-12T16:40:00Z"][i],
  chargedAt: ["2027-04-21T17:12:00Z", "2027-07-13T16:07:00Z", "2027-10-12T16:42:00Z"][i],
}))

const meta = {
  title: "Blocks/SeasonLine",
  component: SeasonLine,
  parameters: { layout: "padded" },
  args: { season: 2027, today: "2027-06-15" },
} satisfies Meta<typeof SeasonLine>
export default meta
type Story = StoryObj<typeof meta>

export const Business: Story = {
  args: { mode: "business", bars },
}

export const BusinessEarlySeason: Story = {
  args: { mode: "business", bars, today: "2027-03-20" },
}

export const Customer: Story = {
  args: { mode: "customer", visits: active.visits },
}

export const CustomerAllDone: Story = {
  args: { mode: "customer", visits: allDone, today: "2027-11-02" },
}

export const Empty: Story = {
  args: { mode: "business", bars: [], caption: "No passes sold yet. The line fills in as customers reserve their season." },
}

export const Phone: Story = {
  args: { mode: "customer", visits: active.visits },
  globals: { viewport: { value: "phone", isRotated: false } },
  render: (args) => (
    <div className="max-w-[360px]">
      <SeasonLine {...args} />
    </div>
  ),
}

export const InCard: Story = {
  args: { mode: "business", bars },
  render: (args) => (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="font-display text-2xl">Season 2027</CardTitle>
        <CardDescription>Committed Season Pass revenue by month, with what has been charged so far.</CardDescription>
      </CardHeader>
      <CardContent>
        <SeasonLine {...args} />
      </CardContent>
    </Card>
  ),
}
