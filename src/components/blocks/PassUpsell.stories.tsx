import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { PassUpsell } from "./PassUpsell"

// The Season Pass offer on the Details step of a single spring turn-on or fall blowout: its own quiet card with a heading, three approved lines, the two visits with what each costs at their zones, and one outline
// button. Added, it is the selected state: the check draws in once and it reads "Season Pass added." with Remove.
const prices = [
  { name: "Spring turn-on", price: "$145" },
  { name: "Fall blowout", price: "$115" },
]
function Harness({ start }: { start: boolean }) {
  const [on, setOn] = useState(start)
  return (
    <div className="mx-auto max-w-xl container-padding-x py-8">
      <PassUpsell on={on} onChange={setOn} prices={prices} />
    </div>
  )
}

const meta = { title: "Blocks/PassUpsell", component: Harness, parameters: { layout: "fullscreen" }, args: { start: false } } satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

export const Offer: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText("$145")).toBeInTheDocument()
    await expect(canvas.queryByText(/free|guarantee|save|limited|hurry/i)).toBeNull()
    await userEvent.click(canvas.getByRole("button", { name: "Add Season Pass" }))
    await expect(canvas.getByText("Season Pass added.")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Remove" }))
    await expect(canvas.getByRole("heading", { name: "Make it a Season Pass" })).toBeInTheDocument()
  },
}
export const Added: Story = { args: { start: true } }
export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
export const AddedPhone: Story = { args: { start: true }, globals: { viewport: { value: "phone", isRotated: false } } }
