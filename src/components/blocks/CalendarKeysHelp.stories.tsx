import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { CalendarKeysHelp } from "./CalendarKeysHelp"

// The "?" list of the calendar's shortcuts.

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }

const meta = {
  title: "Blocks/Scheduler/CalendarKeysHelp",
  component: CalendarKeysHelp,
  parameters: { layout: "padded" },
  globals: LAPTOP,
  args: { open: true, onOpenChange: () => {} },
} satisfies Meta<typeof CalendarKeysHelp>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
