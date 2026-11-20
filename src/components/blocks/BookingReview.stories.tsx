import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { BookingReview } from "./BookingReview"

// The confirm step: every answer with its Change link, and one sentence that says what happens.
const meta = {
  title: "Blocks/BookingReview",
  component: BookingReview,
  parameters: { layout: "padded" },
  args: {
    rows: [
      { label: "Service", value: ["Sprinkler repair", "About 2 hours"], onChange: () => {} },
      { label: "Where", value: ["123 Trailhead Way", "Erie, CO 80516"], onChange: () => {} },
      { label: "When", value: "Tuesday, April 20 at 10:30 am", onChange: () => {} },
      { label: "You", value: ["Andrea Dalton", "(970) 555-0123", "andrea.dalton@example.com"], onChange: () => {} },
      { label: "Price", value: "About $145, charged after the visit." },
    ],
    happens: "We'll text you a confirmation to (970) 555-0123 and email a receipt when it's done.",
  },
} satisfies Meta<typeof BookingReview>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Change when" })).toBeInTheDocument()
    await expect(canvas.getByText(/We'll text you a confirmation/)).toBeInTheDocument()
  },
}

/** A row with nothing to change has no link. */
export const Empty: Story = { args: { rows: [{ label: "Price", value: "About $145, charged after the visit." }] } }

export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
