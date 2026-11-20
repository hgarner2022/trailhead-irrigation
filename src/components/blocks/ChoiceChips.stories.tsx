import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { ChoiceChips } from "./ChoiceChips"

// A short question answered by tapping a chip: one of a few (Wi-Fi at the controller) or any of a few (what to improve).
function One() {
  const [v, setV] = useState<string | null>(null)
  return (
    <div className="max-w-xl container-padding-x py-8">
      <ChoiceChips legend="Is there Wi-Fi at the controller?" options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "unsure", label: "Not sure" }]} value={v} onChange={setV} />
    </div>
  )
}
function Many() {
  const [v, setV] = useState<string[]>([])
  return (
    <div className="max-w-xl container-padding-x py-8">
      <ChoiceChips mode="many" legend="What do you want to improve?" hint="Pick any that apply." options={["A high water bill", "Dry spots", "A garden bed to put on drip"].map((x) => ({ value: x, label: x }))} value={v} onChange={setV} />
    </div>
  )
}

const meta = { title: "Blocks/ChoiceChips", component: One, parameters: { layout: "fullscreen" } } satisfies Meta<typeof One>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "Not sure" }))
    await expect(canvas.getByRole("radio", { name: "Not sure" })).toBeChecked()
  },
}

/** Any of a few: each chip is a checkbox. */
export const AnyOfFew: Story = {
  render: () => <Many />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("checkbox", { name: "Dry spots" }))
    await userEvent.click(canvas.getByRole("checkbox", { name: "A high water bill" }))
    await expect(canvas.getByRole("checkbox", { name: "Dry spots" })).toBeChecked()
  },
}

export const Phone: Story = { render: () => <Many />, globals: { viewport: { value: "phone", isRotated: false } } }
