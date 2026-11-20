import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { ZipCheck } from "./ZipCheck"

// The booking form's first question: type a zip, and the answer is under the box. Try 80516 (Erie, served) and 80302 (not served, with the way out).
function Harness({ start = "", attempted }: { start?: string; attempted?: boolean }) {
  const [zip, setZip] = useState(start)
  return (
    <div className="max-w-xl container-padding-x py-8">
      <ZipCheck value={zip} onChange={setZip} attempted={attempted} />
    </div>
  )
}

const meta = { title: "Blocks/ZipCheck", component: Harness, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText("Zip code"), "80516")
    await expect(await canvas.findByText("Good news, we work in Erie.")).toBeInTheDocument()
  },
}

/** A zip we do not serve: the six towns and Call Ryan. */
export const NotServed: Story = {
  args: { start: "80302" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/We don't serve 80302 yet/)).toBeInTheDocument()
    await expect(canvas.getByRole("link", { name: /Call/ })).toHaveAttribute("href", "tel:9706927270")
  },
}

/** Continue pressed with the box empty: the problem is written as help. */
export const Missing: Story = { args: { attempted: true } }

export const Phone: Story = { args: { start: "80302" }, globals: { viewport: { value: "phone", isRotated: false } } }
