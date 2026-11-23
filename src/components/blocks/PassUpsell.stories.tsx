import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { PassUpsell } from "./PassUpsell"

// "Make it a Season Pass": a quiet card with a switch, off by default, shown inside the open card of a single spring turn-on or fall blowout.
function Harness({ start }: { start: boolean }) {
  const [on, setOn] = useState(start)
  return (
    <div className="mx-auto max-w-xl container-padding-x py-8">
      <PassUpsell on={on} onChange={setOn} />
    </div>
  )
}

const meta = { title: "Blocks/PassUpsell", component: Harness, parameters: { layout: "fullscreen" }, args: { start: false } } satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

export const Off: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("switch", { name: "Make it a Season Pass" }))
    await expect(canvas.getByRole("switch", { name: "Make it a Season Pass" })).toHaveAttribute("aria-checked", "true")
  },
}
export const On: Story = { args: { start: true } }
export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
