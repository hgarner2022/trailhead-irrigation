import type { AskCopy } from "@/components/blocks/CollectPayment"

// The words of every confirmation the customer page and the invoice page open (Hannah, Nov 19 2026: every customer-facing action confirms in
// a dialog that states its exact effect and the channel from the customer's contact preference, "...and notify the customer by text at
// (970) 555-0123", with a "without notifying" path under the caret; a reminder has no caret because the reminder is the notification;
// recording a payment settles an open invoice and closes its pay link, and the sentence says so). Pure strings over the customer's contact.

export interface Contact {
  first: string
  channel: "text" | "email"
  phone: string
  email: string
}

export interface Copy {
  title: string
  message: string
  confirmLabel: string
  /** the quiet twin under the caret; none for an action that is itself the notification */
  quiet?: string
  destructive?: boolean
  /** the exact words that go out, quoted under the message */
  body?: string
}

/** "by text at (970) 555-0123" or "by email at andrea@example.com": the customer's own channel. */
export const via = (c: Contact): string => (c.channel === "text" ? `by text at ${c.phone}` : `by email at ${c.email}`)
const notify = (c: Contact) => `and notify the customer ${via(c)}`

export const PAY_LINK = "trailheadirrigation.com/pay/1042"

export function collectCopy(way: string, c: Contact, o: { amount: string; cardWords?: string; reference?: string; invoiceNumber?: string; dueOn?: string }): AskCopy | null {
  const ref = (o.reference ?? "").trim()
  const settles = o.invoiceNumber ? ` Invoice ${o.invoiceNumber} is settled and its pay link stops working.` : ""
  switch (way) {
    case "card":
      return { title: `Charge ${o.amount}`, message: `Charge ${o.amount} to the ${o.cardWords ?? "card on file"} ${notify(c)} a receipt.${settles}`, confirmLabel: `Charge ${o.amount}`, quiet: "Charge without notifying" }
    case "check":
      return { title: "Record the payment", message: `Record a ${o.amount} check${ref ? `, number ${ref}` : ""} ${notify(c)} a receipt.${settles}`, confirmLabel: "Record the payment", quiet: "Record without notifying" }
    case "venmo":
      return { title: "Record the payment", message: `Record a ${o.amount} Venmo payment${ref ? ` from ${ref}` : ""} ${notify(c)} a receipt.${settles}`, confirmLabel: "Record the payment", quiet: "Record without notifying" }
    case "cash":
      return { title: "Record the payment", message: `Record ${o.amount} in cash ${notify(c)} a receipt.${settles}`, confirmLabel: "Record the payment", quiet: "Record without notifying" }
    case "invoice":
      return { title: "Send the invoice", message: `Send the invoice for ${o.amount}, due ${o.dueOn ?? "in 14 days"}, ${via(c)}.`, confirmLabel: "Send the invoice" }
    default:
      return null
  }
}

/** The text or email a reminder sends, word for word. */
export const reminderBody = (c: Contact, o: { amount: string; service: string; dueOn: string; pastDue?: boolean; line?: string }): string => {
  const sentence = `a reminder that your ${o.amount} invoice for the ${o.service} ${o.pastDue ? "was due" : "is due"} ${o.dueOn}.`
  const extra = o.line?.trim() ? ` ${o.line.trim()}` : ""
  return c.channel === "text" ? `Trailhead: ${sentence}${extra} Pay here: ${PAY_LINK}` : `Hi ${c.first}, ${sentence}${extra} Pay online: ${PAY_LINK}\n\nThe Trailhead crew`
}

export const REMINDER_LINE_MAX = 140

export const reminderCopy = (c: Contact, o: { number: string; amount: string }): Copy => ({
  title: "Send a payment reminder",
  message: `Send the customer this reminder for invoice ${o.number} ${via(c)}. Nothing else changes.`,
  confirmLabel: "Send the reminder",
})

export const cardLinkCopy = (c: Contact): Copy => ({
  title: "Send the card link",
  message: `Send the customer a link to add a card ${via(c)}. The link is the notification.`,
  confirmLabel: "Send the link",
})

export const refundCopy = (c: Contact, amount: string, how: string): Copy => ({
  title: `Refund ${amount}`,
  message: `Record a ${amount} refund of the ${how} payment ${notify(c)} that it was refunded. A refund is a record of its own: the payment stays and nothing is deleted.`,
  confirmLabel: `Refund ${amount}`,
  quiet: "Refund without notifying",
  destructive: true,
})

export const resendInvoiceCopy = (c: Contact, o: { number: string; amount: string }): Copy => ({
  title: "Resend the invoice",
  message: `Send invoice ${o.number} for ${o.amount} to the customer again ${via(c)}, with the same pay link.`,
  confirmLabel: "Resend the invoice",
})

export const cancelInvoiceCopy = (c: Contact, o: { number: string }): Copy => ({
  title: "Cancel invoice",
  message: `Cancel invoice ${o.number} and close its pay link ${notify(c)} that it is canceled. The invoice stays on record as Canceled and the job is unpaid again.`,
  confirmLabel: "Cancel invoice",
  quiet: "Cancel without notifying",
  destructive: true,
})

export const deleteCustomerCopy = (name: string): Copy => ({
  title: "Delete customer",
  message: `Delete ${name}? Nothing has happened for this customer: no jobs, no messages, no payments. This cannot be undone.`,
  confirmLabel: "Delete customer",
  destructive: true,
})

export const mergeCopy = (name: string, other: string): Copy => ({
  title: "Merge customers",
  message: `Move every job, invoice, payment and message of ${other} onto ${name}, then remove ${other}. Nobody is notified. This cannot be undone.`,
  confirmLabel: "Merge customers",
  destructive: true,
})
