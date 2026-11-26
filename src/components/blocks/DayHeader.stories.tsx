import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import { DayHeader } from "./DayHeader"

const meta = {
  title: "Blocks/DayHeader",
  component: DayHeader,
  parameters: { layout: "padded" },
  args: { label: "Tue 24", day: "2026-11-24", fill: "5 visits, 3 h open", towns: "Erie 3, Lafayette 2", onNewJob: fn() },
  decorators: [(Story) => <div className="max-w-44 rounded-lg border border-border p-2"><Story /></div>],
} satisfies Meta<typeof DayHeader>
export default meta
type Story = StoryObj<typeof meta>

/** A day filling: how many stops, the time still open and the towns already in it. */
export const Default: Story = {}

/** Today is marked for a reader and the header takes the primary tint from the grid. */
export const Today: Story = { args: { today: true } }

/** An empty day and a day off carry no towns line. */
export const Empty: Story = { args: { fill: "No visits", towns: "" } }

export const DayOff: Story = { args: { fill: "Day off", towns: "" } }

/** A tech reads the week: no "+". */
export const ReadOnly: Story = { args: { onNewJob: undefined } }
