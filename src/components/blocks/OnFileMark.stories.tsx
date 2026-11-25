import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { OnFileMark } from "./OnFileMark"

// "On file": a quiet chip with a check that draws in once, beside an address, the zones or the access answer that started from what we hold.
const meta = { title: "Blocks/OnFileMark", component: OnFileMark, parameters: { layout: "centered" } } satisfies Meta<typeof OnFileMark>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("On file")).toBeInTheDocument()
  },
}
export const BesideALabel: Story = {
  render: () => (
    <p className="flex items-center gap-3 font-display text-xl text-navy">
      Zones
      <OnFileMark />
    </p>
  ),
}
