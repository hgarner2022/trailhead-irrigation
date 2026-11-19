import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { PayScreen } from "./PayScreen"
import type { PayAction } from "./PayForm"
import type { PayBill } from "./pay-model"
import { REPORT_FIXTURE } from "@/emails/fixtures"

// The pay page for one invoice: Andrea's repair, $145, sent Nov 17 and due Dec 1. Sent, overdue, paid and canceled are the four
// states an invoice is read as; the sales tax line and the credit line show on their own stories.
const sent: PayBill = {
  number: "INV-2026-0001",
  firstName: "Andrea",
  lines: [{ name: "Repair", description: "One hour on site, parts at cost.", quantity: 1, unitPrice: 145 }],
  tax: 0,
  total: 145,
  dueOn: "2026-12-01",
  paidOn: null,
  status: "sent",
  receiptUrl: null,
}

const meta = {
  title: "Screens/Pay",
  component: PayScreen,
  parameters: { layout: "fullscreen" },
  args: { bill: sent, payAction: fn(async () => undefined) },
} satisfies Meta<typeof PayScreen>
export default meta
type Story = StoryObj<typeof meta>

/** Sent with the visit report: What we did under the lines, the checklist, the notes and the photos. */
export const SentWithVisitReport: Story = { args: { bill: { ...sent, report: REPORT_FIXTURE } } }

/** Sent: the lines, the total, "Due Dec 1", the one button and the two lines around it. */
export const Sent: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { name: "Your invoice" })).toBeInTheDocument()
    await expect(canvas.getByText("Due Dec 1")).toBeInTheDocument()
    await expect(canvas.getByText("You can keep the card for future visits on the next page.")).toBeInTheDocument()
    await expect(canvas.getByText("Paid by check, Venmo or cash already? Nothing to do.")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Pay $145 by card" }))
    await expect(args.payAction).toHaveBeenCalledTimes(1)
  },
}

/** Past the due day: "Was due Dec 1", in the warning colour; the button is the same. */
export const PastDue: Story = {
  args: { bill: { ...sent, status: "overdue" } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Was due Dec 1")).toBeInTheDocument()
    await expect(within(canvasElement).getByRole("button", { name: "Pay $145 by card" })).toBeInTheDocument()
  },
}

/** Paid: no button, "Paid Nov 20, thank you", and the card receipt. */
export const Paid: Story = {
  args: { bill: { ...sent, status: "paid", paidOn: "2026-11-20", receiptUrl: "https://pay.stripe.com/receipts/example" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Paid Nov 20, thank you")).toBeInTheDocument()
    await expect(canvas.getByRole("link", { name: "View the receipt" })).toHaveAttribute("href", "https://pay.stripe.com/receipts/example")
    await expect(canvas.queryByRole("button")).toBeNull()
  },
}

/** Canceled: one sentence and the phone number; nothing to pay. */
export const Canceled: Story = {
  args: { bill: { ...sent, status: "cancelled" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("This invoice was voided.")).toBeInTheDocument()
    await expect(canvas.queryByRole("button")).toBeNull()
  },
}

/** Tax on and money already paid on the job: the tax line, and the credit line reads "-$45". */
export const TaxAndCredit: Story = {
  args: {
    bill: {
      ...sent,
      lines: [
        { name: "Repair", description: null, quantity: 1, unitPrice: 145 },
        { name: "Spring turn-on", description: null, quantity: 1, unitPrice: 95 },
        { name: "Extra zones", description: null, quantity: 2, unitPrice: 10 },
        { name: "Payments received", description: null, quantity: 1, unitPrice: -45 },
      ],
      tax: 9,
      total: 224,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Tax")).toBeInTheDocument()
    await expect(canvas.getByText("-$45")).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Pay $224 by card" })).toBeInTheDocument()
  },
}

/** The card form would not open: one sentence under the button, the button back. */
export const CouldNotOpen: Story = {
  args: { payAction: fn<PayAction>(async () => ({ message: "We couldn't open the card form. Try again, or call Ryan at (970) 692-7270." })) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Pay $145 by card" }))
    await expect(await canvas.findByRole("alert")).toHaveTextContent("We couldn't open the card form.")
  },
}

export const PhoneSent: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
}

export const PhoneOverdue: Story = {
  args: { bill: { ...sent, status: "overdue" } },
  globals: { viewport: { value: "phone", isRotated: false } },
}

export const PhonePaid: Story = {
  args: { bill: { ...sent, status: "paid", paidOn: "2026-11-20", receiptUrl: "https://pay.stripe.com/receipts/example" } },
  globals: { viewport: { value: "phone", isRotated: false } },
}

export const PhoneCancelled: Story = {
  args: { bill: { ...sent, status: "cancelled" } },
  globals: { viewport: { value: "phone", isRotated: false } },
}
