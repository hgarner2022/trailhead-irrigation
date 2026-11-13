import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { TIME_ZONE } from "@/lib/admin/format"
import { dayVisits } from "@/lib/admin/calendar"
import { DayMap } from "./DayMap"

// Friday, November 13, 2026 from the snapshot: four blowouts on Truck 1 in
// Firestone, Lafayette and Erie. The October day has both trucks out. The
// tiles come from OpenFreeMap over the network; without WebGL (jsdom, some
// headless browsers) the block shows its fallback instead.
const data = snapshot as AdminData
const { trucks } = data.settings
const friday = dayVisits(data.visits, "2026-11-13", undefined, TIME_ZONE)
const october = dayVisits(data.visits, "2026-10-09", undefined, TIME_ZONE)

function Live(props: Omit<React.ComponentProps<typeof DayMap>, "selectedId" | "onSelect">) {
  const [selectedId, setSelectedId] = useState<string>()
  return <DayMap {...props} selectedId={selectedId} onSelect={setSelectedId} />
}

const meta = {
  title: "Blocks/DayMap",
  component: DayMap,
  parameters: { layout: "padded" },
  args: { stops: friday, trucks, onSelect: () => {} },
  render: (args) => <Live {...args} />,
} satisfies Meta<typeof DayMap>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** An October day with both trucks out, each with its own colour and patch. */
export const TwoTrucks: Story = {
  args: { stops: october },
}

/** A stop selected from outside the map: its pin is ringed and its popup is open. */
export const Selected: Story = {
  args: { selectedId: friday[2]?.id },
  render: (args) => <DayMap {...args} />,
}

export const Empty: Story = {
  args: { stops: [] },
}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
}
