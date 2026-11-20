import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { ReminderDialog } from "./ReminderDialog"
import { ScheduleDialog } from "./ScheduleDialog"
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
  title: "Admin/Confirmations",
  component: Dialog,
  parameters: { layout: "fullscreen", docs: { description: { component: "Every customer-facing action confirms in a dialog that states the exact effect and the channel from the contact preference. Open one to read its words and the without-notifying path. The payment reminder dialog (text, email or both, with its preview) and the Schedule and Move dialog with its crew options are here too, as the dialogs themselves." } } },
  globals: { viewport: { value: "laptop", isRotated: false } },
  args: { copy: FOOTER["Cancel job"]! },
} satisfies Meta<typeof Dialog>
export default meta
type Story = StoryObj<typeof meta>

const story = (copy: ConfirmCopy | null): Story => ({ args: { copy: copy! } })

/** "Charge $145 to the Visa ending 4242. Andrea gets a receipt by email." */
export const ChargeCard: Story = { ...story(collectConfirm("card", FACTS)), name: "Charge card" }
/** "Record a $145 check, number 1042. Andrea gets a receipt by email." */
export const RecordCheck: Story = { ...story(collectConfirm("check", FACTS, "1042")), name: "Record check" }
export const RecordVenmo: Story = { ...story(collectConfirm("venmo", FACTS, "@andrea-d")), name: "Record venmo" }
export const RecordCash: Story = { ...story(collectConfirm("cash", FACTS)), name: "Record cash" }
/** "Send the invoice for $145 by text to (970) 555-0123, due Dec 2." */
export const SendInvoice: Story = { ...story(collectConfirm("invoice", FACTS)), name: "Send invoice" }
/** The exact text that goes out, with the number it goes to. */
export const PaymentReminderDue: Story = { ...story(footerConfirms(FACTS)["Send a payment reminder"]!), name: "Payment reminder due" }
export const PaymentReminderPastDue: Story = { ...story(footerConfirms({ ...FACTS, dueOn: "Nov 17", pastDue: true })["Send a payment reminder"]!), name: "Payment reminder past due" }
export const MoveVisit: Story = { ...story(FOOTER.Move!), name: "Move visit" }
export const OnMyWay: Story = { ...story(FOOTER["On my way"]!), name: "On my way" }
/** The same check while an invoice is out: the receipt, and the open invoice is settled and its pay link closes. */
export const RecordCheckSettlesInvoice: Story = { ...story(collectConfirm("check", { ...FACTS, invoiceOpen: true }, "1042")), name: "Record check settles invoice" }
export const Refund: Story = { ...story(FOOTER["Refund $145"]!), name: "Refund" }
export const SendCardLink: Story = { ...story(FOOTER["Send card link"]!), name: "Send card link" }
/** "Cancel this job. Andrea gets a text that the repair is canceled. Nothing is charged." */
export const CancelJob: Story = { ...story(FOOTER["Cancel job"]!), name: "Cancel job" }
export const CancelPass: Story = { ...story(FOOTER["Cancel pass"]!), name: "Cancel pass" }
export const CancelJobPhone: Story = { name: "Cancel job, phone", ...story(FOOTER["Cancel job"]!), globals: { viewport: { value: "phone", isRotated: false } } }

// The payment reminder dialog in each channel (Hannah, Nov 19 2026: "an option to send a reminder by email or by text"): the choice under the heading, the sentence and the preview following it.
const INVOICE = { number: "INV-2026-0035", amount: "$145", service: "sprinkler repair", dueOn: "Nov 12" }
const WHO = { first: "Marcus", channel: "text" as "text" | "email", phone: "(970) 555-0123", email: "marcus.bell@example.com" }
const reminder = (who: Partial<typeof WHO>) => <ReminderDialog who={{ ...WHO, ...who }} invoice={INVOICE} onClose={() => undefined} onSend={() => undefined} />
const phone = { viewport: { value: "phone", isRotated: false } }

/** A customer who likes texts: Text is chosen, the preview is the text bubble with the invoice's own pay link. */
export const ReminderText: Story = { name: "Reminder dialog, text", render: () => reminder({}) }
/** A customer who wants email: Email is chosen, the preview is the subject over the first lines of the body. */
export const ReminderEmail: Story = { name: "Reminder dialog, email", render: () => reminder({ channel: "email" }) }
/** No email on file: Email and Both are greyed, with "No email on file" in a tooltip. */
export const ReminderNoEmail: Story = { name: "Reminder dialog, no email", render: () => reminder({ email: "" }) }
/** No mobile number: Text and Both are greyed and Email is chosen. */
export const ReminderNoMobile: Story = { name: "Reminder dialog, no mobile", render: () => reminder({ phone: "", channel: "email" }) }
export const ReminderEmailPhone: Story = { name: "Reminder dialog, email, phone", render: () => reminder({ channel: "email" }), globals: phone }

// The Schedule and Move dialog with its crew options (Hannah, Nov 19 2026): Who allows more than one person (the customer hears the first one's first name); when the chosen person is not the
// signed-in user there is a box "Text Tech Two that it's assigned" over a quiet line of the exact text; "Remind the crew the morning of"; "Instructions for the crew", 140 characters.
const SCHEDULE = { verb: "Schedule" as const, first: "Andrea", channel: "text" as const, address: "480 Briggs St", service: "Sprinkler repair", signedIn: "Ryan Garner", onClose: () => undefined, onConfirm: () => undefined }

/** Ryan assigns himself: there is no crew-text box, and the sentence names only the customer's text. */
export const ScheduleSelf: Story = { name: "Schedule dialog, self assigned", render: () => <ScheduleDialog {...SCHEDULE} /> }
/** Tech Two is chosen and the box is on: the quiet line shows the exact text and the sentence adds "Tech Two gets a text that it's assigned." */
export const ScheduleTech: Story = { name: "Schedule dialog, tech assigned", render: () => <ScheduleDialog {...SCHEDULE} initialPeople={["Tech Two"]} initialCrewText /> }
/** Two people: Ryan is first, so the customer hears about Ryan; Tech Two is the one who is texted. */
export const ScheduleTwoPeople: Story = { name: "Schedule dialog, two people", render: () => <ScheduleDialog {...SCHEDULE} initialPeople={["Ryan Garner", "Tech Two"]} initialCrewText /> }
/** Move, on a phone. */
export const ScheduleMovePhone: Story = { name: "Schedule dialog, move, phone", render: () => <ScheduleDialog {...SCHEDULE} verb="Move" initialPeople={["Tech Two"]} />, globals: phone }
