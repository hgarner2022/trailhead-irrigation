import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { AdminShell } from "@/components/blocks/AdminShell"
import { CustomerPage, type CustomerDialog } from "./CustomerPage"
import { expectTablesFitTheirCards } from "./fit-the-card"
import { STATE_NOTES, customerPageOf, type CustomerState } from "./customer-fixtures"

// The customer page on the job page's frame, at 1280 (Laptop) and 375 (Phone): a pass holder with an open repair and an unpaid invoice, a
// two-season customer (the renewal chain), a one-off customer paid in full, a customer with nothing yet, and the dialogs behind the buttons
// (Collect payment, the card link, Send a message). Pure screens over fixtures: no handlers, no API.

const meta = {
  title: "Admin/Customer page",
  component: CustomerPage,
  parameters: { layout: "fullscreen", docs: { description: { component: "The customer page for a pass holder, two seasons, a one-off customer and a customer with nothing yet, with its dialogs. Every tile and record name is a link." } } },
  args: { customer: customerPageOf("pass-holder") },
  render: (args) => (
    <AdminShell current="customers" user={{ initials: "HG", name: "Hannah" }}>
      <CustomerPage {...args} />
    </AdminShell>
  ),
} satisfies Meta<typeof CustomerPage>
export default meta
type Story = StoryObj<typeof meta>

const laptop = { viewport: { value: "laptop", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }
const story = (state: CustomerState, globals: typeof laptop, initialDialog?: CustomerDialog, initialConsent?: "opt-in" | "history"): Story => ({ args: { customer: customerPageOf(state), initialDialog, initialConsent }, globals, parameters: { docs: { description: { story: STATE_NOTES[state] } } }, ...(globals === laptop && !initialDialog && !initialConsent ? { play: ({ canvasElement }) => expectTablesFitTheirCards(canvasElement) } : {}) })

export const PassHolderUnpaid: Story = { ...story("pass-holder", laptop), name: "Pass holder unpaid" }
export const PassHolderUnpaidPhone: Story = { ...story("pass-holder", phone), name: "Pass holder unpaid, phone" }
export const TwoSeasons: Story = { ...story("two-seasons", laptop), name: "Two seasons" }
export const TwoSeasonsPhone: Story = { ...story("two-seasons", phone), name: "Two seasons, phone" }
export const OneOffPaidInFull: Story = { ...story("one-off", laptop), name: "One off paid in full" }
export const OneOffPaidInFullPhone: Story = { ...story("one-off", phone), name: "One off paid in full, phone" }
export const OptedOutOfMarketing: Story = { ...story("opted-out", laptop), name: "Opted out of marketing" }
export const OptedOutOfMarketingPhone: Story = { ...story("opted-out", phone), name: "Opted out of marketing, phone" }
/** STOP replied: the Consent card says every text goes as an email, in neutral words. (Two Seasons is this customer.) */
export const StopReplied: Story = { ...story("two-seasons", laptop), name: "Stop replied" }
/** Billing with a deposit: the $50 check is a payment with no invoice, the final invoice credits it and is one row with the card payment. Total, Paid and Unpaid show. */
export const PaidWithDeposit: Story = { ...story("deposit", laptop), name: "Paid with a deposit" }
export const PaidWithDepositPhone: Story = { ...story("deposit", phone), name: "Paid with a deposit, phone" }
/** Billing paid by check: one Payments row, no invoice, no figures. (Rosa Medina, the opted-out customer.) */
export const BillingPaidByCheck: Story = { ...story("opted-out", laptop), name: "Billing, paid by check" }
export const BillingPaidByCheckPhone: Story = { ...story("opted-out", phone), name: "Billing, paid by check, phone" }
/** Billing paid by card: the invoice and its card payment are one row. (Marcus Webb, the one-off customer.) */
export const BillingPaidByCard: Story = { ...story("one-off", laptop), name: "Billing, paid by card" }
export const BillingPaidByCardPhone: Story = { ...story("one-off", phone), name: "Billing, paid by card, phone" }
export const RefundedInFull: Story = { ...story("refunded", laptop), name: "Refunded in full" }
export const RefundedInFullPhone: Story = { ...story("refunded", phone), name: "Refunded in full, phone" }
export const PartRefunded: Story = { ...story("part-refunded", laptop), name: "Part refunded" }
export const PartRefundedPhone: Story = { ...story("part-refunded", phone), name: "Part refunded, phone" }
/** Turning a marketing channel on needs a source and a note: the customer's own yes. */
export const OptInDialog: Story = { ...story("one-off", laptop, undefined, "opt-in"), name: "Opt in dialog" }
export const OptInDialogPhone: Story = { ...story("one-off", phone, undefined, "opt-in"), name: "Opt in dialog, phone" }
/** Consent history: newest first, date, what changed, source, who. */
export const ConsentHistory: Story = { ...story("opted-out", laptop, undefined, "history"), name: "Consent history" }
/** Active because a job was done 20 months ago (any job in the last 24 months). The past due invoice is the band's Unpaid tile and Billing, never a pill in the header. */
export const ActiveByRecentJob: Story = { ...story("active-recent", laptop), name: "Active by recent job" }
export const ActiveByRecentJobPhone: Story = { ...story("active-recent", phone), name: "Active by recent job, phone" }
/** Past customer: a job 30 months ago and nothing ahead. Do not service is marked, with the red tag beside the status. */
export const PastCustomerDoNotService: Story = { ...story("past-customer", laptop), name: "Past customer do not service" }
export const PastCustomerDoNotServicePhone: Story = { ...story("past-customer", phone), name: "Past customer do not service, phone" }
/** Archived: the grey status and the quiet banner with Unarchive. */
export const Archived: Story = { ...story("archived", laptop), name: "Archived" }
export const ArchivedPhone: Story = { ...story("archived", phone), name: "Archived, phone" }
/** Archive is refused while a job, visit or pass is open, and says which. */
export const ArchiveRefused: Story = { ...story("pass-holder", laptop, "archive"), name: "Archive refused" }
export const ArchiveRefusedPhone: Story = { ...story("pass-holder", phone, "archive"), name: "Archive refused, phone" }
/** With nothing open, the confirm names the balance, in the destructive colour. */
export const ArchiveConfirmWithBalance: Story = { ...story("active-recent", laptop, "archive"), name: "Archive confirm with balance" }
export const ArchiveConfirmWithBalancePhone: Story = { ...story("active-recent", phone, "archive"), name: "Archive confirm with balance, phone" }
export const NothingYet: Story = { ...story("nothing-yet", laptop), name: "Nothing yet" }
export const NothingYetPhone: Story = { ...story("nothing-yet", phone), name: "Nothing yet, phone" }

/** Collect payment opens "How is this paid?": the card on file first and selected, Check with an empty number box, Venmo, Cash. Send an invoice is not offered because one is out. */
export const CollectPaymentDialog: Story = { ...story("pass-holder", laptop, "collect"), name: "Collect payment dialog" }
export const CollectPaymentDialogPhone: Story = { ...story("pass-holder", phone, "collect"), name: "Collect payment dialog, phone" }
/** Update card sends the card link; the link is the notification, so the dialog has no caret. */
export const CardLinkDialog: Story = { ...story("pass-holder", laptop, "card-link"), name: "Card link dialog" }
export const SendAMessageDialog: Story = { ...story("pass-holder", laptop, "message"), name: "Send a message dialog" }
export const SendAMessageDialogPhone: Story = { ...story("pass-holder", phone, "message"), name: "Send a message dialog, phone" }
/** Refund is destructive: it names the channel and has Refund without notifying under the caret. */
export const RefundDialog: Story = { ...story("pass-holder", laptop, "refund"), name: "Refund dialog" }
