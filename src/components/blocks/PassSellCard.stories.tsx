import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { PassSellCard } from "./PassSellCard"

const meta = {
  title: "Blocks/PassSellCard",
  component: PassSellCard,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div className="max-w-xl"><Story /></div>],
} satisfies Meta<typeof PassSellCard>
export default meta
type Story = StoryObj<typeof meta>

/** The slot a customer with no Season Pass sees where the pass card would be. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Get a Season Pass" })).toHaveAttribute("href", "/season-pass")
  },
}

export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
