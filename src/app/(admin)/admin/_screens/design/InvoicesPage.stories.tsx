import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { DesignShell } from "./DesignShell"
import { InvoicePage } from "./InvoicePanel"
import { InvoicesPage } from "./InvoicesPage"
import { expectTablesFitTheirCards } from "./fit-the-card"
import { INVOICE_NOTES, INVOICE_ROWS, invoicePageOf, type InvoiceFixture } from "./invoice-fixtures"

// Invoices, the primary nav item, and the invoice as a page of its own, each at 1280 (Laptop) and 375 (Phone): the list with its four tiles
// (each a filter), past due first; and the invoice sent, past due, paid by card (card kept), paid by check and canceled. Pure screens over
// fixtures: nothing is sent.

const meta = { title: "Admin/Invoices", parameters: { layout: "fullscreen", docs: { description: { component: "Invoices as a nav item and the invoice as a page: the list with its tiles, and the invoice sent, past due, paid by card, paid by check and canceled, with the reminder and cancel dialogs." } } } } satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const laptop = { viewport: { value: "laptop", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }
const shell = (children: React.ReactNode) => (
  <DesignShell current="invoices">
    {children}
  </DesignShell>
)

/** Ryan sees four tiles and every invoice, past due first, with Remind and Collect payment on the rows that are unpaid. Each tile filters the table. */
export const List: Story = { name: "List", globals: laptop, render: () => shell(<InvoicesPage rows={INVOICE_ROWS} />) }
export const ListPhone: Story = { name: "List, phone", globals: phone, render: () => shell(<InvoicesPage rows={INVOICE_ROWS} />) }
/** Ryan sees no invoices yet and is told how one gets made. */
export const ListEmpty: Story = { name: "List empty", globals: laptop, render: () => shell(<InvoicesPage rows={[]} />) }
/** The filters hide every row: "No invoices match." with Clear filters. */
export const ListNoMatch: Story = { name: "List no match", globals: laptop, render: () => shell(<InvoicesPage rows={INVOICE_ROWS} initialFilters={[{ column: "status", values: ["canceled"] }, { column: "who", values: ["Hannah Garner"] }]} />) }

const page = (which: InvoiceFixture, globals: typeof laptop, initialDialog?: "remind" | "collect" | "cancel"): Story => ({ globals, parameters: { docs: { description: { story: INVOICE_NOTES[which] } } }, ...(globals === laptop && !initialDialog ? { play: ({ canvasElement }: { canvasElement: HTMLElement }) => expectTablesFitTheirCards(canvasElement) } : {}), render: () => shell(<InvoicePage invoice={invoicePageOf(which)} initialDialog={initialDialog} />) })

export const InvoiceSent: Story = { ...page("sent", laptop), name: "Invoice sent" }
export const InvoiceSentPhone: Story = { ...page("sent", phone), name: "Invoice sent, phone" }
export const InvoicePastDue: Story = { ...page("past-due", laptop), name: "Invoice past due" }
export const InvoicePastDuePhone: Story = { ...page("past-due", phone), name: "Invoice past due, phone" }
export const InvoicePaidByCard: Story = { ...page("paid-card", laptop), name: "Invoice paid by card" }
export const InvoicePaidByCardPhone: Story = { ...page("paid-card", phone), name: "Invoice paid by card, phone" }
export const InvoicePaidByCheck: Story = { ...page("paid-check", laptop), name: "Invoice paid by check" }
export const InvoicePaidByCheckPhone: Story = { ...page("paid-check", phone), name: "Invoice paid by check, phone" }
/** A paid invoice whose card payment was partly refunded: the invoice stays Paid, and Payments has a grey negative row right under the payment. */
export const InvoicePartRefunded: Story = { ...page("part-refunded", laptop), name: "Invoice part refunded" }
export const InvoicePartRefundedPhone: Story = { ...page("part-refunded", phone), name: "Invoice part refunded, phone" }
/** The final invoice of a job that took a deposit: $95 after the $50 credit, and Payments lists the payment and the deposit it credits. */
export const InvoicePaidWithDeposit: Story = { ...page("deposit", laptop), name: "Invoice paid with a deposit" }
export const InvoicePaidWithDepositPhone: Story = { ...page("deposit", phone), name: "Invoice paid with a deposit, phone" }
export const InvoiceRefunded: Story = { ...page("refunded", laptop), name: "Invoice refunded" }
export const InvoiceRefundedPhone: Story = { ...page("refunded", phone), name: "Invoice refunded, phone" }
export const InvoiceCanceled: Story = { ...page("canceled", laptop), name: "Invoice canceled" }
export const InvoiceCanceledPhone: Story = { ...page("canceled", phone), name: "Invoice canceled, phone" }

/** The reminder dialog: the channel from the customer's preference, a preview that cannot be edited, one optional line and a link to the wording in Settings. No caret. */
export const ReminderDialogOpen: Story = { ...page("sent", laptop, "remind"), name: "Reminder dialog open" }
export const ReminderDialogOpenPhone: Story = { ...page("sent", phone, "remind"), name: "Reminder dialog open, phone" }
/** Cancel invoice is destructive and has Cancel without notifying under the caret. */
export const CancelInvoiceDialog: Story = { ...page("past-due", laptop, "cancel"), name: "Cancel invoice dialog" }
