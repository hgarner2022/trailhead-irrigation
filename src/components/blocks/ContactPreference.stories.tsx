import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { ContactPreference, type ContactChannel } from "./ContactPreference"

// How we reach the customer, asked once with the contact details: Text, Email, or Text and email, the meaning is a tooltip beside the question.
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
    await expect(canvas.queryByText("Every message both ways.")).toBeNull()
    await userEvent.click(canvas.getByRole("button", { name: "About how we reach you" }))
    await expect(await within(document.body).findAllByText(/are sent this way/)).not.toHaveLength(0)
  },
}

export const Phone: Story = { args: { start: "both" }, globals: { viewport: { value: "phone", isRotated: false } } }
