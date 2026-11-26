import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { RowMore } from "./RowMore"
import { TextLink } from "./TextLink"

const meta = {
  title: "Blocks/RowMore",
  component: RowMore,
  parameters: { layout: "padded", docs: { description: { component: "The More of a table row: a row shows one action and keeps the rest here." } } },
  globals: { viewport: { value: "laptop", isRotated: false } },
  args: { label: "More for INV-2026-0042", items: [{ label: "Collect payment", onSelect: () => undefined }] },
} satisfies Meta<typeof RowMore>
export default meta
type Story = StoryObj<typeof meta>

/** Beside a row's one visible action. */
export const Default: Story = {
  render: (args) => (
    <span className="flex items-center justify-end gap-0.5">
      <TextLink weight="medium" className="px-2 text-sm">Remind</TextLink>
      <RowMore {...args} />
    </span>
  ),
}

/** A payment row: the link that leaves and, last, the one that undoes money. */
export const Payment: Story = {
  args: { label: "More for the $145 payment", items: [{ label: "Open in Stripe", href: "https://dashboard.stripe.com/payments/pi_1", external: true }, { label: "Refund $145", destructive: true, onSelect: () => undefined }] },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "More for the $145 payment" }))
    const menu = within(document.body)
    await expect(await menu.findByRole("menuitem", { name: /Open in Stripe/ })).toHaveAttribute("target", "_blank")
    await expect(menu.getByRole("menuitem", { name: "Refund $145" })).toBeVisible()
    await userEvent.keyboard("{Escape}")
  },
}

/** Nothing to hold: nothing is drawn. */
export const Empty: Story = { args: { items: [] } }

export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
