import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { AccountNav } from "@/components/blocks/AccountNav"
import { AccountNotFound } from "./AccountNotFound"

// A visit link that cannot be opened, inside the account header, at 375 and 1280.
const meta = {
  title: "Screens/Account not found",
  component: AccountNotFound,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="min-h-svh bg-cream">
        <AccountNav firstName="Andrea" current="/account/visits" />
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AccountNotFound>
export default meta
type Story = StoryObj<typeof meta>

const check: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  await expect(canvas.getByText("We can't open that visit. Go to your visits, or text Ryan.")).toBeInTheDocument()
  await expect(canvas.getByRole("link", { name: "Go to your visits" })).toHaveAttribute("href", "/account/visits")
}

export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } }, play: check }
export const Laptop: Story = { globals: { viewport: { value: "laptop", isRotated: false } }, play: check }
