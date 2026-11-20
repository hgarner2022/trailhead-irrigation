import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { InvoiceTable, PaymentTable, type InvoiceRowData, type PaymentRowData } from "./BillingTables"

const noop = () => {}

const CHECK: PaymentRowData = { id: "p1", at: "2026-11-18T17:50:00Z", method: "check", methodLabel: "Check #1042", amount: "$145", by: "Ryan", receiptHref: "/account/receipts/p1", canRefund: true }
const CARD: PaymentRowData = { id: "p2", at: "2026-04-20T17:00:00Z", method: "card", methodLabel: "Visa ending 4242", amount: "$145", by: "Andrea, online", receiptHref: "/account/receipts/p2", stripeHref: "https://dashboard.stripe.com/payments/pi_3QxK1031", canRefund: true }
const REFUND: PaymentRowData = { id: "r1", at: "2026-11-19T15:00:00Z", method: "check", methodLabel: "Check #1042", amount: "-$145", by: "Ryan", refund: true, refundOf: "p1", receiptHref: "/account/receipts/r1" }
const INVOICE: InvoiceRowData = { id: "i1", number: "INV-2026-0001", amount: "$145", sent: "Nov 18", due: "Dec 2", status: "bill-sent", href: "/admin/invoices/inv-1", canRemind: true }

const meta = {
  title: "Blocks/BillingTables",
  component: PaymentTable,
  parameters: { layout: "padded" },
  globals: { viewport: { value: "laptop", isRotated: false } },
  decorators: [(Story) => <div className="bg-cream p-6"><Story /></div>],
  args: { rows: [CHECK, CARD], onRefund: noop },
} satisfies Meta<typeof PaymentTable>
export default meta
type Story = StoryObj<typeof meta>

/** The payments with no invoice: date, method with its icon, amount, who recorded it, status; View receipt, Open in Stripe for a card payment, and Refund under More. No sort arrows under six rows. */
export const Payments: Story = {}

/** A refund is its own negative row in grey; the payment stays, and has no Refund left. */
export const Refunded: Story = { args: { rows: [{ ...CHECK, canRefund: false }, REFUND] } }

/** Nothing paid yet. */
export const NoPayments: Story = { args: { rows: [] } }

/** At 1280 the table fits the Billing card it sits in (564px of body): nothing is clipped and there is no sideways scroll. */
export const PaymentsFitTheCard: Story = {
  decorators: [(Story) => <div style={{ width: 564 }}><Story /></div>],
  play: async ({ canvasElement }) => {
    const box = canvasElement.querySelector("[data-slot=table-container]") as HTMLElement
    await expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth)
  },
}

/** On a phone each payment is a card that opens its details and buttons. */
export const PaymentsPhone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }

/** Invoices and payments: an invoice still out shows when it was sent and is due, with Remind and Open invoice. */
export const Invoices: Story = { render: () => <InvoiceTable rows={[INVOICE]} onRemind={noop} /> }

/** The Invoices table in its 606px card: nothing clipped. */
export const InvoicesFitTheCard: Story = {
  decorators: [(Story) => <div style={{ width: 606 }}><Story /></div>],
  render: () => <InvoiceTable rows={[{ ...INVOICE, note: "Includes the visit report" }]} onRemind={noop} />,
  play: async ({ canvasElement }) => {
    const box = canvasElement.querySelector("[data-slot=table-container]") as HTMLElement
    await expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth)
  },
}

export const InvoicePastDue: Story = { render: () => <InvoiceTable rows={[{ ...INVOICE, status: "overdue", sent: "Nov 3", due: "Nov 17" }]} onRemind={noop} /> }

export const InvoicePaid: Story = { render: () => <InvoiceTable rows={[{ ...INVOICE, status: "paid", canRemind: false }]} /> }

export const InvoicesPhone: Story = { globals: { viewport: { value: "phone", isRotated: false } }, render: () => <InvoiceTable rows={[INVOICE]} onRemind={noop} /> }

const PAID: InvoiceRowData = { ...INVOICE, status: "paid", canRemind: false, paidBy: { ...CARD, at: "2026-11-18T17:50:00Z", by: "Ryan" } }

/** A paid invoice and the payment that settled it are ONE row: the chip, how it was paid under it, the amount, the Paid pill, the labelled icon buttons and Refund under More. */
export const InvoiceAndPaymentAsOneRow: Story = { render: () => <InvoiceTable rows={[PAID]} onRefund={noop} /> }

/** A refund of that payment is a grey negative row under it, with View receipt only. */
export const InvoiceWithRefund: Story = { render: () => <InvoiceTable rows={[{ ...PAID, refunds: [{ ...CARD, id: "r3", at: "2026-11-19T15:00:00Z", amount: "-$50", by: "Ryan", refund: true, refundOf: "p2", stripeHref: undefined, canRefund: false }] }]} onRefund={noop} /> }

/** The merged row in its 606px card: nothing clipped. */
export const InvoiceAndPaymentFitTheCard: Story = {
  decorators: [(Story) => <div style={{ width: 566 }}><Story /></div>],
  render: () => <InvoiceTable rows={[{ ...PAID, note: "$145 less the $50 deposit" }]} onRefund={noop} />,
  play: async ({ canvasElement }) => {
    const box = canvasElement.querySelector("[data-slot=table-container]") as HTMLElement
    await expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth)
  },
}

/** No sort arrows on a table of fewer than six rows. */
export const NoSortUnderSixRows: Story = {
  render: () => <InvoiceTable rows={[PAID, { ...INVOICE, id: "i2", number: "INV-2026-0002" }]} onRemind={noop} />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll("th button")).toHaveLength(0)
  },
}

/** On a phone the merged row is a card; Remind, View receipt, Open in Stripe and Open invoice are a quiet line of words under it. */
export const InvoiceAndPaymentPhone: Story = { globals: { viewport: { value: "phone", isRotated: false } }, render: () => <InvoiceTable rows={[PAID]} onRefund={noop} /> }
