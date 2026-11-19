import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { BookedCard } from "./BookedCard"

const meta = {
  title: "Blocks/BookedCard",
  component: BookedCard,
  parameters: { layout: "padded" },
  args: { service: "Sprinkler repair", day: "Tuesday, April 20", time: "10:30 am", where: "123 Briggs St, Erie" },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof BookedCard>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("123 Briggs St, Erie. Ryan is coming.")).toBeInTheDocument()
  },
}

/** A service with a long name and a long street. */
export const Empty: Story = { args: { service: "Spring turn-on, 12 zones", where: "4120 Cottonwood Meadows Drive, Firestone", who: "Scott" } }

export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
