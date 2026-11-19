import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { BookingSummary } from "./BookingSummary"

const meta = {
  title: "Blocks/BookingSummary",
  component: BookingSummary,
  parameters: { layout: "padded" },
  args: {
    parts: [
      { label: "Sprinkler repair", what: "service", onChange: () => {} },
      { label: "Erie", what: "address", onChange: () => {} },
      { label: "Tue, Apr 20 at 10:30 am", what: "day and time", onChange: () => {} },
    ],
  },
} satisfies Meta<typeof BookingSummary>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Change service" })).toBeInTheDocument()
  },
}

/** Nothing chosen yet: nothing drawn. */
export const Empty: Story = { args: { parts: [] } }

export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
