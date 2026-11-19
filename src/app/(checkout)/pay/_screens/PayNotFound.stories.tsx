import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { PayNotFound } from "./PayNotFound"

// A pay link that is old or wrong: the line, Sign in to the account, Text Ryan and Call Ryan, at 375 and 1280.
const meta = { title: "Screens/Pay not found", component: PayNotFound, parameters: { layout: "fullscreen" } } satisfies Meta<typeof PayNotFound>
export default meta
type Story = StoryObj<typeof meta>

const check: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  await expect(canvas.getByText("This invoice link is old or wrong. Sign in to see your invoices, or text Ryan.")).toBeInTheDocument()
  await expect(canvas.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/account")
  await expect(canvas.getByRole("link", { name: /Call Ryan/ })).toHaveAttribute("href", "tel:9706927270")
}

export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } }, play: check }
export const Laptop: Story = { globals: { viewport: { value: "laptop", isRotated: false } }, play: check }
