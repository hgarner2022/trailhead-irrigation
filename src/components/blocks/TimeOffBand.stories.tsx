import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { TimeOffBand } from "./TimeOffBand"

// The hatched band in the person's colour: hours form (placed by the grid) and whole-day form (fills its parent).

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

const meta = {
  title: "Blocks/Scheduler/TimeOffBand",
  component: TimeOffBand,
  parameters: { layout: "padded" },
  globals: LAPTOP,
  args: { label: "Ryan off 12 to 2 pm", personIndex: 0, style: { top: 56, height: 112 } },
  decorators: [(Story) => <div className="relative h-72 w-56 rounded-lg border border-border bg-background"><Story /></div>],
} satisfies Meta<typeof TimeOffBand>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: "Hours" }
export const Empty: Story = { name: "Whole day", args: { label: "Tech Two off all day", wholeDay: true, personIndex: 1, style: undefined } }
export const Phone: Story = { globals: PHONE, args: { personIndex: 2 } }
