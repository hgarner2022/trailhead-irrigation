import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { collectConfirm, footerConfirms, type ConfirmCopy, type ConfirmFacts } from "./confirm-copy"

// One confirmation per customer-facing action (docs/DESIGN.md: a customer-facing action always confirms and states its effect). Each says
// the amount, the card or the channel and the message that goes out, in one or two plain sentences. Pure screens over the words in
// `confirm-copy.ts`; the buttons only close.

const FACTS: ConfirmFacts = { first: "Andrea", service: "repair", amount: "$145", phone: "(970) 555-0123", address: "480 Briggs St", cardWords: "Visa ending 4242", dueOn: "Dec 2" }
const FOOTER = footerConfirms(FACTS)

function Dialog({ copy }: { copy: ConfirmCopy }) {
  return (
    <ConfirmDialog open onOpenChange={() => undefined} title={copy.title} message={copy.message} confirmLabel={copy.confirmLabel} destructive={copy.destructive} slot="confirm-story" onConfirm={async () => ({ ok: true })}>
      {copy.body && <p className="whitespace-pre-wrap rounded-lg bg-stone p-3 text-sm">{copy.body}</p>}
    </ConfirmDialog>
  )
}

const meta = {
  title: "Design/Confirmations",
  component: Dialog,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "laptop", isRotated: false } },
  args: { copy: FOOTER["Cancel job"]! },
} satisfies Meta<typeof Dialog>
export default meta
type Story = StoryObj<typeof meta>

const story = (copy: ConfirmCopy | null): Story => ({ args: { copy: copy! } })

/** "Charge $145 to the Visa ending 4242. Andrea gets a receipt by email." */
export const ChargeCard: Story = story(collectConfirm("card", FACTS))
/** "Record a $145 check, number 1042. Andrea gets a receipt by email." */
export const RecordCheck: Story = story(collectConfirm("check", FACTS, "1042"))
export const RecordVenmo: Story = story(collectConfirm("venmo", FACTS, "@andrea-d"))
export const RecordCash: Story = story(collectConfirm("cash", FACTS))
/** "Send the invoice for $145 by text to (970) 555-0123, due Dec 2." */
export const SendInvoice: Story = story(collectConfirm("invoice", FACTS))
/** The exact text that goes out, with the number it goes to. */
export const PaymentReminderDue: Story = story(footerConfirms(FACTS)["Send a payment reminder"]!)
export const PaymentReminderPastDue: Story = story(footerConfirms({ ...FACTS, dueOn: "Nov 17", pastDue: true })["Send a payment reminder"]!)
export const MoveVisit: Story = story(FOOTER.Move!)
export const OnMyWay: Story = story(FOOTER["On my way"]!)
/** The same check while an invoice is out: the receipt, and the open invoice is settled and its pay link closes. */
export const RecordCheckSettlesInvoice: Story = story(collectConfirm("check", { ...FACTS, invoiceOpen: true }, "1042"))
export const Refund: Story = story(FOOTER["Refund $145"]!)
export const SendCardLink: Story = story(FOOTER["Send card link"]!)
/** "Cancel this job. Andrea gets a text that the repair is canceled. Nothing is charged." */
export const CancelJob: Story = story(FOOTER["Cancel job"]!)
export const CancelPass: Story = story(FOOTER["Cancel pass"]!)
export const CancelJobPhone: Story = { ...story(FOOTER["Cancel job"]!), globals: { viewport: { value: "phone", isRotated: false } } }
