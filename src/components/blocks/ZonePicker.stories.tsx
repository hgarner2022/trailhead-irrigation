import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { ZonePicker } from "./ZonePicker"

// How many zones: 6 or fewer, 7 to 12 as quick picks, More than 12 opens a number box.
function Harness({ start }: { start: number }) {
  const [zones, setZones] = useState(start)
  return (
    <div className="mx-auto max-w-xl container-padding-x py-8">
      <ZonePicker value={zones} onChange={setZones} />
    </div>
  )
}

const meta = { title: "Blocks/ZonePicker", component: Harness, parameters: { layout: "fullscreen" }, args: { start: 8 } } satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "More than 12" }))
    await expect(await canvas.findByLabelText("Number of zones")).toHaveValue("13")
  },
}
export const Many: Story = { args: { start: 18 } }
export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
