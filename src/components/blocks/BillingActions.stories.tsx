import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { RowActions } from "./BillingActions"

// The buttons of a Billing row: icons with a label and a tooltip on a laptop ("View receipt", "Open in Stripe", "Open invoice"), Remind as a word,
// Refund under More; on a phone the same actions as a quiet line of words under the card.

const noop = () => {}

const meta = {
  title: "Blocks/BillingActions",
  component: RowActions,
  parameters: { layout: "padded" },
  globals: { viewport: { value: "laptop", isRotated: false } },
  decorators: [(Story) => <div className="max-w-[400px] bg-card p-6"><Story /></div>],
  args: { spec: { receiptHref: "/account/receipts/p1", stripeHref: "https://dashboard.stripe.com/payments/pi_1", invoiceHref: "/admin/invoices?invoice=i1", refund: { amount: "$145", onRefund: noop } } },
} satisfies Meta<typeof RowActions>
export default meta
type Story = StoryObj<typeof meta>

/** A paid, card-paid invoice: View receipt, Open in Stripe, Open invoice, and More with Refund. Each icon button has an aria-label. */
export const PaidInvoice: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(await c.findByRole("link", { name: "View receipt" })).toBeInTheDocument()
    // one action in words; Open in Stripe and Refund are under More, and there is no Open invoice button (the invoice's number in the row is its link)
    await expect(c.queryByRole("link", { name: /Open in Stripe/ })).toBeNull()
    await expect(c.queryByRole("link", { name: "Open invoice" })).toBeNull()
    await userEvent.click(await c.findByRole("button", { name: /More for the \$145 payment/ }))
    const menu = within(document.body)
    await expect(await menu.findByRole("menuitem", { name: /Open in Stripe/ })).toBeVisible()
    await expect(menu.getByRole("menuitem", { name: "Refund $145" })).toBeVisible()
    await userEvent.keyboard("{Escape}")
  },
}

/** An invoice still out: Remind as a word, the row's one action. */
export const InvoiceOut: Story = { args: { spec: { onRemind: noop, invoiceHref: "/admin/invoices?invoice=i1" } } }

/** On a phone the same actions are a quiet line of words. */
export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
