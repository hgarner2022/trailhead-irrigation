import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Attention } from "@/lib/admin/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NeedsAttention } from "./NeedsAttention"

// The three rows in the snapshot, one of each kind, with `now` fixed to the
// sync time so the relative times never drift with the calendar.
const items = snapshot.attention as Attention[]

const meta = {
  title: "Blocks/NeedsAttention",
  component: NeedsAttention,
  parameters: { layout: "padded" },
  args: { items, now: snapshot.syncedAt },
} satisfies Meta<typeof NeedsAttention>
export default meta
type Story = StoryObj<typeof meta>

const narrow = (story: React.ReactNode) => <div className="max-w-xl">{story}</div>

export const Default: Story = {
  render: (args) => narrow(<NeedsAttention {...args} />),
}

/** The row Home adds at render time for visits from earlier days nobody has marked done. */
export const WithNotClosed: Story = {
  args: { items: [...items, { kind: "not-closed", message: "3 visits from before today are not marked done yet.", since: "2026-11-09T17:00:00Z" }] },
  render: (args) => narrow(<NeedsAttention {...args} />),
}

export const Empty: Story = {
  args: { items: [] },
  render: (args) => narrow(<NeedsAttention {...args} />),
}

export const InCard: Story = {
  render: (args) => (
    <Card className="max-w-xl">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-2xl">Needs attention</CardTitle>
      </CardHeader>
      <CardContent>
        <NeedsAttention {...args} />
      </CardContent>
    </Card>
  ),
}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
  render: (args) => (
    <div className="w-[360px] max-w-full">
      <NeedsAttention {...args} />
    </div>
  ),
}
