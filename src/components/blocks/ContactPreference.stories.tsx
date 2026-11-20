import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { ContactPreference, type ContactChannel } from "./ContactPreference"

// How we reach the customer, asked once with the contact details: Text, Email, or Text and email, with one line saying what the choice means.
function Harness({ start = "text" }: { start?: ContactChannel }) {
  const [value, setValue] = useState<ContactChannel>(start)
  return (
    <div className="max-w-xl container-padding-x py-8">
      <ContactPreference value={value} onChange={setValue} />
    </div>
  )
}

const meta = { title: "Blocks/ContactPreference", component: Harness, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "Text and email" }))
    await expect(canvas.getByText("Every message both ways.")).toBeInTheDocument()
  },
}

export const Phone: Story = { args: { start: "both" }, globals: { viewport: { value: "phone", isRotated: false } } }
