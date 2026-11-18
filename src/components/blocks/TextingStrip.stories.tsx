import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import { TextingStrip } from "./TextingStrip"

const meta = {
  title: "Blocks/TextingStrip",
  component: TextingStrip,
  parameters: { layout: "padded" },
  args: { names: ["Andrea"], secondsLeft: 60, onUndo: fn() },
  decorators: [(Story) => <div className="max-w-xl"><Story /></div>],
} satisfies Meta<typeof TextingStrip>
export default meta
type Story = StoryObj<typeof meta>

/** One customer, the full minute: Undo inside it sends nothing. */
export const One: Story = {}

/** Place all: the count of customers, not a list of names. */
export const Many: Story = { args: { names: ["Andrea", "Jim", "Cy"], secondsLeft: 41 } }
