import { useState } from "react"
import type { StoryObj, Meta } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { TimeField } from "./TimeField"

// A plain time of day (Settings' hours): the field reads "9:00 am" and opens the one chip style (`TimeChips`) in a popover; a chosen time closes it.

function Field() {
  const [value, setValue] = useState("09:00")
  return (
    <div className="mx-auto max-w-xl container-padding-x py-8">
      <TimeField label="Ryan Garner day starts" value={value} onChange={setValue} />
    </div>
  )
}
const meta = { title: "Blocks/TimeField", component: Field, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Field>
export default meta
type Story = StoryObj<typeof meta>

export const Phone: Story = {
  render: () => <Field />,
  globals: { viewport: { value: "phone", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Ryan Garner day starts, 9:00 am" }))
    await userEvent.click(await within(document.body).findByRole("radio", { name: "6:30 am" }))
    await expect(canvas.getByRole("button", { name: "Ryan Garner day starts, 6:30 am" })).toBeInTheDocument()
  },
}
