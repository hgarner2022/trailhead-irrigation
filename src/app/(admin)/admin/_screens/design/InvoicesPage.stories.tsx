import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { AdminShell } from "@/components/blocks/AdminShell"
import { InvoicePage } from "./InvoicePanel"
import { InvoicesPage } from "./InvoicesPage"
import { expectTablesFitTheirCards } from "./fit-the-card"
import { INVOICE_NOTES, INVOICE_ROWS, invoicePageOf, type InvoiceFixture } from "./invoice-fixtures"

// Invoices, the primary nav item, and the invoice as a page of its own, each at 1280 (Laptop) and 375 (Phone): the list with its four tiles
// (each a filter), past due first; and the invoice sent, past due, paid by card (card kept), paid by check and canceled. Pure screens over
// fixtures: nothing is sent.

const meta = { title: "Design/Invoices", parameters: { layout: "fullscreen" } } satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const laptop = { viewport: { value: "laptop", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }
const shell = (children: React.ReactNode) => (
  <AdminShell current="jobs" user={{ initials: "HG", name: "Hannah" }}>
    {children}
  </AdminShell>
)

/** Ryan sees four tiles and every invoice, past due first, with Remind and Collect payment on the rows that are unpaid. Each tile filters the table. */
export const List: Story = { globals: laptop, render: () => shell(<InvoicesPage rows={INVOICE_ROWS} />) }
export const ListPhone: Story = { globals: phone, render: () => shell(<InvoicesPage rows={INVOICE_ROWS} />) }
/** Ryan sees no invoices yet and is told how one gets made. */
export const ListEmpty: Story = { globals: laptop, render: () => shell(<InvoicesPage rows={[]} />) }
/** The filters hide every row: "No invoices match." with Clear filters. */
export const ListNoMatch: Story = { globals: laptop, render: () => shell(<InvoicesPage rows={INVOICE_ROWS} initialFilters={[{ column: "status", values: ["canceled"] }, { column: "who", values: ["Hannah Garner"] }]} />) }

const page = (which: InvoiceFixture, globals: typeof laptop, initialDialog?: "remind" | "collect" | "cancel"): Story => ({ globals, parameters: { docs: { description: { story: INVOICE_NOTES[which] } } }, ...(globals === laptop && !initialDialog ? { play: ({ canvasElement }: { canvasElement: HTMLElement }) => expectTablesFitTheirCards(canvasElement) } : {}), render: () => shell(<InvoicePage invoice={invoicePageOf(which)} initialDialog={initialDialog} />) })

export const InvoiceSent: Story = page("sent", laptop)
export const InvoiceSentPhone: Story = page("sent", phone)
export const InvoicePastDue: Story = page("past-due", laptop)
export const InvoicePastDuePhone: Story = page("past-due", phone)
export const InvoicePaidByCard: Story = page("paid-card", laptop)
export const InvoicePaidByCardPhone: Story = page("paid-card", phone)
export const InvoicePaidByCheck: Story = page("paid-check", laptop)
export const InvoicePaidByCheckPhone: Story = page("paid-check", phone)
export const InvoiceCanceled: Story = page("canceled", laptop)
export const InvoiceCanceledPhone: Story = page("canceled", phone)

/** The reminder dialog: the channel from the customer's preference, a preview that cannot be edited, one optional line and a link to the wording in Settings. No caret. */
export const ReminderDialogOpen: Story = page("sent", laptop, "remind")
export const ReminderDialogOpenPhone: Story = page("sent", phone, "remind")
/** Cancel invoice is destructive and has Cancel without notifying under the caret. */
export const CancelInvoiceDialog: Story = page("past-due", laptop, "cancel")
