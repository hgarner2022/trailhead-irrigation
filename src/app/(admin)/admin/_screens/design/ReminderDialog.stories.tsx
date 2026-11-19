import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ReminderDialog } from "./ReminderDialog"

// The one payment-reminder dialog in each channel (Hannah, Nov 19 2026: "an option to send a reminder by email or by text"): the choice under
// the heading, the sentence and the preview following it. Pure screens; the buttons only close.

const INVOICE = { number: "INV-2026-0035", amount: "$145", service: "sprinkler repair", dueOn: "Nov 12" }
const WHO = { first: "Marcus", channel: "text" as const, phone: "(970) 555-0123", email: "marcus.bell@example.com" }

const meta = {
  title: "Design/Payment reminder",
  component: ReminderDialog,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "laptop", isRotated: false } },
  args: { who: WHO, invoice: INVOICE, onClose: () => undefined, onSend: () => undefined },
} satisfies Meta<typeof ReminderDialog>
export default meta
type Story = StoryObj<typeof meta>

/** A customer who likes texts: Text is chosen, the preview is the text bubble with the invoice's own pay link. */
export const Text: Story = {}

/** A customer who wants email: Email is chosen, the preview is the subject over the first lines of the body. */
export const Email: Story = { args: { who: { ...WHO, channel: "email" } } }

/** Both: the sentence says "by text and email" and both previews show; the added line goes into each. */
export const Both: Story = {}

/** No email on file: Email and Both are greyed, with "No email on file" in a tooltip. */
export const NoEmail: Story = { args: { who: { ...WHO, email: "" } } }

/** No mobile number: Text and Both are greyed and Email is chosen. */
export const NoMobile: Story = { args: { who: { ...WHO, phone: "", channel: "email" } } }

/** On a phone. */
export const EmailPhone: Story = { args: { who: { ...WHO, channel: "email" } }, globals: { viewport: { value: "phone", isRotated: false } } }
