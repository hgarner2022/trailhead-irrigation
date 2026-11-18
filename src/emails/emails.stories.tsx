import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { renderEmail } from "./render"

// The real HTML of the receipt and the invoice, built by the same renderer the sender uses and shown in a frame the way an
// inbox shows it, so the line-item table, the totals and the buttons can be looked at. Nothing is sent: the data is made up.

const origin = "https://www.trailheadirrigation.com"
const base = { origin, firstName: "Andrea", accountUrl: `${origin}/account`, signInUrl: `${origin}/account/sign-in?email=andrea%40example.com` }
const lines = [
  { name: "Repair", amount: 145, quantity: 1, unitPrice: 145 },
  { name: "Extra zones", amount: 20, quantity: 2, unitPrice: 10 },
]

const receipt = renderEmail("receipt", {
  ...base, serviceName: "repair", address: "480 Briggs St", paidOn: "2027-05-05", card: "Visa ending 4242", amount: 178, who: "Ryan", day: "2027-05-05", number: "R-1A2B3C4D",
  lines, subtotal: 165, tax: 13, total: 178, nextLine: "Your fall blowout is planned for early October.", receiptUrl: "https://pay.stripe.com/r/1",
})!
const invoice = renderEmail("invoice", {
  ...base, invoiceNumber: "INV-2027-0001", visitName: "repair", address: "480 Briggs St", who: "Ryan", day: "2027-05-04", lines, amount: 178, subtotal: 165, tax: 13, total: 178, dueOn: "2027-05-21", payUrl: `${origin}/pay/inv1?token=abc`,
})!

function EmailFrame({ subject, html }: { subject: string; html: string }) {
  return (
    <figure className="mx-auto max-w-2xl">
      <figcaption className="mb-2 text-sm text-muted-foreground">Subject: {subject}</figcaption>
      <iframe title={subject} srcDoc={html} className="h-[900px] w-full rounded-lg border border-border bg-white" />
    </figure>
  )
}

const meta = {
  title: "Emails/Customer emails",
  component: EmailFrame,
  parameters: { layout: "padded" },
} satisfies Meta<typeof EmailFrame>
export default meta
type Story = StoryObj<typeof meta>

/** A paid visit: where, who and when, the receipt number, each line, the totals, what was paid and one link to the account. */
export const Receipt: Story = { args: { subject: receipt.subject, html: receipt.html } }

/** An invoice: the same table, the amount due, the due day and one Pay button. */
export const Invoice: Story = { args: { subject: invoice.subject, html: invoice.html } }
