import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { ZoneChips } from "./ZoneChips"

// The zone count: one 48px chip per count from six to sixteen. Tap one; the booking form shows the price under it.
function Harness({ start = 8 }: { start?: number }) {
  const [zones, setZones] = useState(start)
  return (
    <div className="max-w-xl container-padding-x py-8">
      <ZoneChips value={zones} onChange={setZones} />
      <p className="mt-4 text-base text-muted-foreground">{`${zones} zones`}</p>
    </div>
  )
}

const meta = { title: "Blocks/ZoneChips", component: Harness, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("button", { name: "8 zones" })).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(canvas.getByRole("button", { name: "12 zones" }))
    await expect(canvas.getByText("12 zones")).toBeInTheDocument()
  },
}

export const Phone: Story = { args: { start: 6 }, globals: { viewport: { value: "phone", isRotated: false } } }
