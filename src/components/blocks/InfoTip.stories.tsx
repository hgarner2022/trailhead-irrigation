import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { InfoTip } from "./InfoTip"

// The info icon with a tooltip that carries the help for a choice (Hannah, Nov 23 2026: nothing explanatory printed under a control). A press or tap opens it, Escape closes it.
const meta = {
  title: "Blocks/InfoTip",
  component: InfoTip,
  parameters: { layout: "centered" },
  args: { label: "About zones", children: "Count the stations on your controller." },
  render: (args) => (
    <p className="flex items-center gap-1 text-base font-semibold text-foreground">
      Zones
      <InfoTip {...args} />
    </p>
  ),
} satisfies Meta<typeof InfoTip>
export default meta
type Story = StoryObj<typeof meta>

export const Closed: Story = {}
export const Open: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "About zones" }))
    await expect((await within(document.body).findAllByText("Count the stations on your controller.")).length).toBeGreaterThan(0)
  },
}
export const Phone: Story = { ...Open, globals: { viewport: { value: "phone", isRotated: false } } }
