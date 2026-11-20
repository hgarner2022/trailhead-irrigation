import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { AccessChoice, type Access } from "./AccessChoice"

// "Can we reach the controller and the water shut-off without you?" Two large radios; required, so Continue with no answer says what is missing.
function Harness({ start = null, error }: { start?: Access | null; error?: string }) {
  const [value, setValue] = useState<Access | null>(start)
  return (
    <div className="max-w-xl container-padding-x py-8">
      <AccessChoice value={value} onChange={setValue} error={error} />
    </div>
  )
}

const meta = { title: "Blocks/AccessChoice", component: Harness, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("radio", { name: /^Yes/ }))
    await expect(canvas.getByRole("radio", { name: /^Yes/ })).toBeChecked()
  },
}

/** Not answered, and the help under it. */
export const Missing: Story = { args: { error: "Tell us whether we can get to the system without you." } }

export const Phone: Story = { args: { start: "no" }, globals: { viewport: { value: "phone", isRotated: false } } }
