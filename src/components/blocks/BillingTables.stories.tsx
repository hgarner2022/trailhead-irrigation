import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { InvoiceTable, PaymentTable, type InvoiceRowData, type PaymentRowData } from "./BillingTables"

const noop = () => {}

const CHECK: PaymentRowData = { id: "p1", at: "2026-11-18T17:50:00Z", method: "check", methodLabel: "Check #1042", amount: "$145", by: "Ryan", receiptHref: "/account/receipts/p1", canRefund: true }
const CARD: PaymentRowData = { id: "p2", at: "2026-04-20T17:00:00Z", method: "card", methodLabel: "Visa ending 4242", amount: "$145", by: "Andrea, online", receiptHref: "/account/receipts/p2", stripeHref: "https://dashboard.stripe.com/payments/pi_3QxK1031", canRefund: true }
const REFUND: PaymentRowData = { id: "r1", at: "2026-11-19T15:00:00Z", method: "check", methodLabel: "Check #1042", amount: "-$145", by: "Ryan", refund: true, receiptHref: "/account/receipts/r1" }
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

/** One row per payment: date, method with its icon, amount, who recorded it, status; Receipt, Open in Stripe for a card payment, and Refund under More. */
export const Payments: Story = {}

/** A refund is its own negative row in grey; the payment stays, and has no Refund left. */
export const Refunded: Story = { args: { rows: [REFUND, { ...CHECK, canRefund: false }] } }

/** Nothing paid yet. */
export const NoPayments: Story = { args: { rows: [] } }

/** On a phone each payment is a card that opens its details and buttons. */
export const PaymentsPhone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }

/** The Invoices table: number, amount, sent, due, status, then Remind and Open invoice. */
export const Invoices: Story = { render: () => <InvoiceTable rows={[INVOICE]} onRemind={noop} /> }

export const InvoicePastDue: Story = { render: () => <InvoiceTable rows={[{ ...INVOICE, status: "overdue", sent: "Nov 3", due: "Nov 17" }]} onRemind={noop} /> }

export const InvoicePaid: Story = { render: () => <InvoiceTable rows={[{ ...INVOICE, status: "paid", canRemind: false }]} /> }

export const InvoicesPhone: Story = { globals: { viewport: { value: "phone", isRotated: false } }, render: () => <InvoiceTable rows={[INVOICE]} onRemind={noop} /> }
