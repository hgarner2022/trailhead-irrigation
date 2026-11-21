import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { reportFor } from "@/emails/fixtures"
import PaidPage from "../paid/page"
import { PayFlow } from "./PayFlow"
import { PayScreen } from "./PayScreen"
import { StripeCardPage } from "./StripeCardPage"
import type { PayBill } from "./pay-model"

// How an invoice is paid, screen by screen (Hannah, Nov 21 2026: "On the invoice, how do they collect payment? Did you not show the Stripe setup here?"). The customer opens the
// invoice from Home's Pay now, the invoice email's button or the text's link: the pay page (what it is for, the lines, "What we did", the total and the due day), then Stripe's card
// page (drawn: card number, expiry and CVC, the unticked save box, the Pay button), Stripe's processing moment, then our Paid page with the receipt link. A customer with a card on
// file sees "Pay $115 with Visa ending 4242" as one tap and "Use a different card" for the card page. Every state is a still at 375 and 1280; the hidden twins walk it.

const bill: PayBill = {
  number: "INV-2027-0001",
  firstName: "Andrea",
  serviceName: "repair",
  address: "412 Briggs Street",
  lines: [{ name: "Repair", description: "One hour on site, parts at cost.", quantity: 1, unitPrice: 115 }],
  tax: 0,
  total: 115,
  dueOn: "2027-12-01",
  paidOn: null,
  status: "sent",
  receiptUrl: null,
  report: reportFor("repair", 4, 2, ""),
}
const saved: PayBill = { ...bill, savedCard: "Visa ending 4242" }
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const
const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const stub = fn(async () => undefined)

const meta = {
  title: "Screens/Pay, how an invoice is paid",
  component: PayScreen,
  parameters: { layout: "fullscreen" },
  args: { bill, payAction: stub, payWithSavedAction: stub },
} satisfies Meta<typeof PayScreen>
export default meta
type Story = StoryObj<typeof meta>

/** 1. The invoice: what it is for and where (the sentence under the title), the line, "What we did" with the checklist and the photos, the total and the due day, one button. */
export const InvoiceLaptop: Story = { ...laptop }
export const InvoicePhone: Story = { ...phone }

/** 1b. A customer with a card on file: "Pay $115 with Visa ending 4242" is the one filled button; "Use a different card" opens the card page. */
export const SavedCardLaptop: Story = { ...laptop, args: { bill: saved } }
export const SavedCardPhone: Story = { ...phone, args: { bill: saved } }

const card = (processing: boolean): Story => ({ render: () => <StripeCardPage bill={bill} email="andrea.dalton@example.com" processing={processing} onPay={stub} onBack={stub} /> })
/** 2. Stripe's card page, drawn: the amount and what it is for, card number, expiry and CVC, the unticked "Save my payment method for future use" box and the Pay button. */
export const StripeCardLaptop: Story = { ...laptop, ...card(false) }
export const StripeCardPhone: Story = { ...phone, ...card(false) }
/** 3. After Pay: Stripe's processing moment. The button reads Processing and nothing can be pressed. */
export const ProcessingLaptop: Story = { ...laptop, ...card(true) }
export const ProcessingPhone: Story = { ...phone, ...card(true) }

/** 4. Our Paid page, where Stripe returns the customer: thank you, the receipt and the account. */
export const PaidLaptop: Story = { ...laptop, render: () => <PaidPage /> }
export const PaidPhone: Story = { ...phone, render: () => <PaidPage /> }

/** 4b. The pay page opened again once paid: the lines, "What we did", the day it was paid and the receipt. */
const paid: PayBill = { ...bill, status: "paid", paidOn: "2027-04-29", receiptUrl: "https://pay.stripe.com/receipts/example" }
export const PaidInvoicePhone: Story = { ...phone, args: { bill: paid } }

/** The whole path with the card form: invoice, Stripe's card page, Pay, processing, then `onPaid` (the Paid page opens there). */
export const CardPath: StoryObj<typeof PayFlow> = {
  tags: ["!dev", "!autodocs"],
  render: () => <PayFlow bill={bill} email="andrea.dalton@example.com" processingMs={0} onPaid={paidSpy} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await userEvent.click(await c.findByRole("button", { name: "Pay $115 by card" }))
    await expect(await c.findByText("Save my payment method for future use")).toBeInTheDocument()
    await expect(c.getByRole("checkbox", { name: "Save my payment method for future use" })).not.toBeChecked()
    await userEvent.click(c.getByRole("button", { name: "Pay $115" }))
    await waitFor(() => expect(paidSpy).toHaveBeenCalledWith({ saveCard: false, withSaved: false }))
  },
}
const paidSpy = fn()

/** The saved card: one tap, no card page. */
export const SavedCardPath: StoryObj<typeof PayFlow> = {
  tags: ["!dev", "!autodocs"],
  render: () => <PayFlow bill={saved} email="andrea.dalton@example.com" processingMs={0} onPaid={savedSpy} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await userEvent.click(await c.findByRole("button", { name: "Pay $115 with Visa ending 4242" }))
    await waitFor(() => expect(savedSpy).toHaveBeenCalledWith({ saveCard: false, withSaved: true }))
  },
}
const savedSpy = fn()
