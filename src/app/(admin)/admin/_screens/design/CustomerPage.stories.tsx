import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { AdminShell } from "@/components/blocks/AdminShell"
import { CustomerPage, type CustomerDialog } from "./CustomerPage"
import { expectTablesFitTheirCards } from "./fit-the-card"
import { STATE_NOTES, customerPageOf, type CustomerState } from "./customer-fixtures"

// The customer page on the job page's frame, at 1280 (Laptop) and 375 (Phone): a pass holder with an open repair and an unpaid invoice, a
// two-season customer (the renewal chain), a one-off customer paid in full, a customer with nothing yet, and the dialogs behind the buttons
// (Collect payment, the card link, Send a message). Pure screens over fixtures: no handlers, no API.

const meta = {
  title: "Design/Customer page",
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
const story = (state: CustomerState, globals: typeof laptop, initialDialog?: CustomerDialog): Story => ({ args: { customer: customerPageOf(state), initialDialog }, globals, parameters: { docs: { description: { story: STATE_NOTES[state] } } }, ...(globals === laptop && !initialDialog ? { play: ({ canvasElement }) => expectTablesFitTheirCards(canvasElement) } : {}) })

export const PassHolderUnpaid: Story = { ...story("pass-holder", laptop), name: "Pass holder unpaid" }
export const PassHolderUnpaidPhone: Story = { ...story("pass-holder", phone), name: "Pass holder unpaid phone" }
export const TwoSeasons: Story = { ...story("two-seasons", laptop), name: "Two seasons" }
export const TwoSeasonsPhone: Story = { ...story("two-seasons", phone), name: "Two seasons phone" }
export const OneOffPaidInFull: Story = { ...story("one-off", laptop), name: "One off paid in full" }
export const OneOffPaidInFullPhone: Story = { ...story("one-off", phone), name: "One off paid in full phone" }
export const NothingYet: Story = { ...story("nothing-yet", laptop), name: "Nothing yet" }
export const NothingYetPhone: Story = { ...story("nothing-yet", phone), name: "Nothing yet phone" }

/** Collect payment opens "How is this paid?": the card on file first and selected, Check with an empty number box, Venmo, Cash. Send an invoice is not offered because one is out. */
export const CollectPaymentDialog: Story = { ...story("pass-holder", laptop, "collect"), name: "Collect payment dialog" }
export const CollectPaymentDialogPhone: Story = { ...story("pass-holder", phone, "collect"), name: "Collect payment dialog phone" }
/** Update card sends the card link; the link is the notification, so the dialog has no caret. */
export const CardLinkDialog: Story = { ...story("pass-holder", laptop, "card-link"), name: "Card link dialog" }
export const SendAMessageDialog: Story = { ...story("pass-holder", laptop, "message"), name: "Send amessage dialog" }
export const SendAMessageDialogPhone: Story = { ...story("pass-holder", phone, "message"), name: "Send amessage dialog phone" }
/** Refund is destructive: it names the channel and has Refund without notifying under the caret. */
export const RefundDialog: Story = { ...story("pass-holder", laptop, "refund"), name: "Refund dialog" }
