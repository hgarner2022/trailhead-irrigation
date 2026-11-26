import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import { MapPanel, type MapPanelProps } from "./MapPanel"
import { PEOPLE, STOPS, UNSCHEDULED } from "./scheduler-panels-fixtures"

// The map beside the week. The tiles come from OpenFreeMap over the network; where there is no WebGL (some headless browsers) DayMap shows its own fallback, and the chips and the panel still render.
// Each state has a 1280 story and a 375 twin (a sheet from the bottom).
const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

function Docked(args: MapPanelProps) {
  const [open, setOpen] = useState(true)
  return (
    <div className="flex h-[640px] bg-background">
      <div className="min-w-0 flex-1 p-6 text-sm text-muted-foreground">The week</div>
      <MapPanel {...args} open={open} onOpenChange={setOpen} />
    </div>
  )
}

const meta = {
  title: "Blocks/Scheduler/MapPanel",
  component: MapPanel,
  parameters: { layout: "fullscreen" },
  globals: LAPTOP,
  args: { open: true, onOpenChange: () => {}, stops: STOPS, people: PEOPLE, day: "Tue, Nov 24", onHover: fn(), onSelect: fn() },
  render: (args) => <Docked {...args} />,
} satisfies Meta<typeof MapPanel>
export default meta
type Story = StoryObj<typeof meta>

/** Two people, each in their own colour, with the People control. */
export const Default: Story = {}
export const Phone: Story = { globals: PHONE }

/** No visits on the day. */
export const Empty: Story = { args: { stops: [] } }
export const EmptyPhone: Story = { ...Empty, globals: PHONE }

/** The Unscheduled panel is open: its jobs are hollow pins, with a chip of their own. */
export const WithUnscheduledPins: Story = { args: { unscheduled: UNSCHEDULED } }
export const WithUnscheduledPinsPhone: Story = { ...WithUnscheduledPins, globals: PHONE }

/** A pin lit from a row of the Unscheduled panel or a block on the week. */
export const PinLitFromOutside: Story = { args: { unscheduled: UNSCHEDULED, hoverId: "u-2" } }
export const StopLitFromOutside: Story = { args: { hoverId: "v-2" } }
export const StopLitFromOutsidePhone: Story = { ...StopLitFromOutside, globals: PHONE }

/** Only unscheduled jobs: the map frames them. */
export const OnlyUnscheduled: Story = { args: { stops: [], unscheduled: UNSCHEDULED } }
