import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import { StopRow } from "./StopRow"

const meta = {
  title: "Blocks/StopRow",
  component: StopRow,
  parameters: { layout: "padded" },
  args: { id: "v1", number: 1, time: "Any time", name: "Mia Reyes", town: "Erie", service: "Spring turn-on", areaIndex: 0, onOpen: fn() },
  decorators: [(Story) => <ul className="max-w-xl divide-y divide-border overflow-hidden rounded-lg border border-border"><Story /></ul>],
} satisfies Meta<typeof StopRow>
export default meta
type Story = StoryObj<typeof meta>

/** A stop with no time: the number in the person's route, "Any time", the customer and the service. */
export const Untimed: Story = {}

/** A booked time is fixed, so it carries a small lock. */
export const Booked: Story = { args: { number: 2, time: "9:15 am", booked: true } }

/** Moved in the calendar feed, and selected from the map. */
export const MovedAndSelected: Story = { args: { number: 3, moved: true, selected: true, areaIndex: 1, town: "Lafayette" } }

/** Dragged to another person's list or another day. */
export const Draggable: Story = { args: { draggable: true } }
