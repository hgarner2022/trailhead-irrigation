import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { SegmentedControl, type SegmentedControlProps } from "./SegmentedControl"

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }
const VIEWS = [{ value: "week", label: "Week" }, { value: "day", label: "Day" }, { value: "list", label: "List" }]

function Live(args: SegmentedControlProps) {
  const [value, setValue] = useState(args.value)
  return <SegmentedControl {...args} value={value} onChange={setValue} />
}

const meta = {
  title: "Blocks/SegmentedControl",
  component: SegmentedControl,
  parameters: { layout: "padded" },
  args: { options: VIEWS, value: "week", label: "View", onChange: () => {} },
  globals: LAPTOP,
  render: (args) => <Live {...args} />,
} satisfies Meta<typeof SegmentedControl>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** No options draws nothing. */
export const Empty: Story = { args: { options: [] } }

export const Phone: Story = { globals: PHONE }
