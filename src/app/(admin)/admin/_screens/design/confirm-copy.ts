// The words of every confirmation a customer-facing action opens (Hannah, Nov 19 2026: "whenever there's a customer action, you need to have
// confirmation modals... and clear understanding of what's going to happen"). The rule for docs/DESIGN.md: a customer-facing action always
// confirms and states its effect, in one or two plain sentences with the amount, the card or the channel, and the message that goes out.
// Pure strings over the facts of the job, so the page's footer, the choice block and the stories read the same words.

export interface ConfirmCopy {
  title: string
  /** what happens, in one or two sentences */
  message: string
  /** the exact text that goes out, shown in a quote under the message */
  body?: string
  confirmLabel: string
  destructive?: boolean
  /** a checkbox, checked by default, that adds a part to what goes out: the sentence reads `with` when checked and `without` when not */
  /** the quiet twin under the caret: every customer-facing action can go ahead without notifying */
  quiet?: string
  /** Mark done on a late job asks which day it was done; the days offered, the first the default */
  /** asks which day it was done on, on the calendar; `today` is the latest day that may be chosen (the prototype's today) */
  doneOn?: { today: string }
  reportOption?: { label: string; with: string; without: string }
}

export interface ConfirmFacts {
  first: string
  /** how the customer wants to hear from us: a text by default */
  channel?: "text" | "email" | "both"
  email?: string
  /** no text has gone to this number yet, so the next one carries the opt-out line */
  firstText?: boolean
  /** the day passed and the job was never marked done */
  late?: boolean
  /** the customer's full name */
  customer?: string
  service: string
  amount: string
  phone: string
  address: string
  /** "Visa ending 4242" */
  cardWords?: string
  /** "Dec 2": when the open invoice is or was due */
  dueOn: string
  /** the open invoice is past its due day */
  pastDue?: boolean
  invoiceNumber?: string
  /** an invoice is out on the job: a payment settles it and closes its pay link */
  invoiceOpen?: boolean
}

/** The invoice's own pay link: the page is named by the invoice, never by another job's number. */
export const payLink = (invoiceNumber = "INV-2026-0001") => `trailheadirrigation.com/pay/${invoiceNumber}`

export const reminderText = (f: ConfirmFacts, line = ""): string =>
  `Trailhead: a reminder that your ${f.amount} invoice for the ${f.service} ${f.pastDue ? "was due" : "is due"} ${f.dueOn}. Pay here: ${payLink(f.invoiceNumber)}${line.trim() ? ` ${line.trim()}` : ""}`

/** Who a message reaches and how: the customer's contact preference. Every `ConfirmFacts` is one. */
export type Reach = Pick<ConfirmFacts, "first" | "channel" | "phone" | "email">

/** "by text at (970) 555-0123" or "by email at andrea@example.com": the customer's own channel. */
export const via = (c: Reach): string => (c.channel === "email" ? `by email at ${c.email ?? "the address on file"}` : `by text at ${c.phone}`)
/** A receipt is not a notification: every payment sends one, by the customer's own channel(s), so no payment has a "without notifying". */
export const receiptBy = (c: { channel?: "text" | "email" | "both" }): string => (c.channel === "email" ? "by email" : c.channel === "both" ? "by text and email" : "by text")
const notify = (c: Reach) => `and notify the customer ${via(c)}`

/** The toast after the money has gone through or the invoice has gone out: the page already shows the new state in Billing. */
export function doneToast(way: string, f: ConfirmFacts): string {
  switch (way) {
    case "card": return `Charged ${f.amount} to the ${f.cardWords ?? "card on file"}`
    case "check": return `Recorded a ${f.amount} check`
    case "venmo": return `Recorded a ${f.amount} Venmo payment`
    case "cash": return `Recorded ${f.amount} in cash`
    case "invoice": return `Invoice sent to ${f.first}`
    default: return "Done"
  }
}

/**
 * The effect of each way of paying, said under the chosen option of "How is this paid?" (that dialog's own button is the confirm). A card
 * charge or a recorded payment sends a receipt by the customer's own channel(s); a receipt is not a notification, so there is no
 * "without notifying" on any of them. Recording a payment against an open invoice also settles it and closes its pay link. Sending the
 * invoice is itself the notification.
 */
export function collectConfirm(way: string, f: ConfirmFacts, reference = ""): ConfirmCopy | null {
  const ref = reference.trim()
  const settles = f.invoiceOpen ? ` ${f.invoiceNumber ? `Invoice ${f.invoiceNumber}` : "The open invoice"} is settled and its pay link stops working.` : ""
  const sentence = (what: string) => `${what}. ${f.first} gets a receipt ${receiptBy(f)}.${settles}`
  switch (way) {
    case "card":
      return { title: `Charge ${f.amount}`, message: sentence(`Charge ${f.amount} to the ${f.cardWords ?? "card on file"}`), confirmLabel: `Charge ${f.amount}` }
    case "check":
      return { title: "Record the payment", message: sentence(`Record a ${f.amount} check${ref ? `, number ${ref}` : ""}`), confirmLabel: "Record the payment" }
    case "venmo":
      return { title: "Record the payment", message: sentence(`Record a ${f.amount} Venmo payment${ref ? ` from ${ref}` : ""}`), confirmLabel: "Record the payment" }
    case "cash":
      return { title: "Record the payment", message: sentence(`Record ${f.amount} in cash`), confirmLabel: "Record the payment" }
    case "invoice":
      return { title: "Send the invoice", message: `Send the invoice for ${f.amount} ${via(f)}, due ${f.dueOn}.`, confirmLabel: "Send the invoice", reportOption: { label: "Include the visit report (the checklist and photos)", with: `Send the invoice for ${f.amount} ${via(f)}, due ${f.dueOn}, with the visit report.`, without: `Send the invoice for ${f.amount} ${via(f)}, due ${f.dueOn}.` } }
    default:
      return null
  }
}

export const REMINDER_LINE_MAX = 140

/** The text or email a reminder sends, word for word, by the customer's channel. */
export const reminderBody = (c: Reach, o: { amount: string; service: string; dueOn: string; pastDue?: boolean; line?: string; number?: string }): string => {
  const sentence = `a reminder that your ${o.amount} invoice for the ${o.service} ${o.pastDue ? "was due" : "is due"} ${o.dueOn}.`
  const extra = o.line?.trim() ? ` ${o.line.trim()}` : ""
  return c.channel === "email" ? `Hi ${c.first}, ${sentence}${extra} Pay online: ${payLink(o.number)}\n\nThe Trailhead crew` : `Trailhead: ${sentence}${extra} Pay here: ${payLink(o.number)}`
}

/** The email's subject line: "Reminder: $145 invoice for your sprinkler repair, due Nov 12". */
export const reminderSubject = (o: { amount: string; service: string; dueOn: string; pastDue?: boolean }): string => `Reminder: ${o.amount} invoice for your ${o.service}, ${o.pastDue ? "past due since" : "due"} ${o.dueOn}`

export const reminderCopy = (c: Reach, o: { number: string }): ConfirmCopy => ({
  title: "Send a payment reminder",
  message: `Send the customer this reminder for invoice ${o.number} ${via(c)}. Nothing else changes.`,
  confirmLabel: "Send the reminder",
})

export const cardLinkCopy = (c: Reach): ConfirmCopy => ({ title: "Send the card link", message: `Send the customer a link to add a card ${via(c)}. The link is the notification.`, confirmLabel: "Send the link" })

export const refundCopy = (c: Reach, amount: string, how: string): ConfirmCopy => ({
  title: `Refund ${amount}`,
  message: `Record a ${amount} refund of the ${how} payment ${notify(c)} that it was refunded. A refund is a record of its own: the payment stays and nothing is deleted.`,
  confirmLabel: `Refund ${amount}`,
  quiet: "Refund without notifying",
  destructive: true,
})

export const resendInvoiceCopy = (c: Reach, o: { number: string; amount: string }): ConfirmCopy => ({ title: "Resend the invoice", message: `Send invoice ${o.number} for ${o.amount} to the customer again ${via(c)}, with the same pay link.`, confirmLabel: "Resend the invoice" })

export const cancelInvoiceCopy = (c: Reach, o: { number: string }): ConfirmCopy => ({
  title: "Cancel invoice",
  message: `Cancel invoice ${o.number} and close its pay link ${notify(c)} that it is canceled. The invoice stays on record as Canceled and the job is unpaid again.`,
  confirmLabel: "Cancel invoice",
  quiet: "Cancel without notifying",
  destructive: true,
})

export const deleteCustomerCopy = (name: string): ConfirmCopy => ({ title: "Delete customer", message: `Delete ${name}? Nothing has happened for this customer: no jobs, no messages, no payments. This cannot be undone.`, confirmLabel: "Delete customer", destructive: true })

export const mergeCopy = (name: string, other: string): ConfirmCopy => ({ title: "Merge customers", message: `Move every job, invoice, payment and message of ${other} onto ${name}, then remove ${other}. Nobody is notified. This cannot be undone.`, confirmLabel: "Merge customers", destructive: true })

/** The confirmation behind each footer button that reaches the customer or their money, by the button's label. */
export function footerConfirms(f: ConfirmFacts): Record<string, ConfirmCopy> {
  return {
    Move: { title: "Move the visit", message: `Move the ${f.service} to Wed, Nov 25 at 9:00 am and text ${f.first} the new day.`, confirmLabel: "Move the visit" },
    "On my way": { title: "On my way", message: `Notify ${f.first} that Ryan is on the way to ${f.address}, by text, and mark the job Active.`, confirmLabel: "Send and start", quiet: "Start without notifying" },
    "Mark done": f.late
      ? { title: "Mark done", message: `When was the ${f.service} at ${f.address} done? Nothing is charged and no one is notified; next you choose how it is paid.`, confirmLabel: "Mark done", doneOn: { today: "2026-11-18" } }
      : { title: "Mark done", message: `Mark the ${f.service} done at ${f.address}? Done now, 10:05 am. Nothing is charged and no one is notified; next you choose how it is paid.`, confirmLabel: "Mark done" },
    "Send a payment reminder": {
      title: "Send a payment reminder",
      message: `Send this text to ${f.first} at ${f.phone}.`,
      body: reminderText(f),
      confirmLabel: "Send the reminder",
    },
    [`Refund ${f.amount}`]: { title: `Refund ${f.amount}`, message: `Record a ${f.amount} refund. ${f.first} gets an email that it was refunded.`, confirmLabel: `Refund ${f.amount}`, destructive: true },
    "Add July": { title: "Add July", message: `Add the July inspection to ${f.first}'s Season Pass. It is charged to the card after the visit, at the standard rate, and ${f.first} gets an email that it was added.`, confirmLabel: "Add July" },
    "Skip a visit": { title: "Skip a visit", message: `Skip the next visit on ${f.first}'s Season Pass. ${f.first} gets an email that it is skipped, and nothing is charged for it.`, confirmLabel: "Skip the visit" },
    "Send card link": { title: "Send the card link", message: `Text ${f.first} at ${f.phone} a link to add a card.`, confirmLabel: "Send the link" },
    "Cancel job": { title: "Cancel job", message: `Cancel this job. ${f.first} gets ${f.channel === "email" ? "an email" : "a text"} that the ${f.service} is canceled. Nothing is charged.`, confirmLabel: "Cancel job", destructive: true, quiet: "Cancel without notifying" },
    "Delete job": { title: "Delete job", message: `Delete this job for ${f.customer ?? f.first}? It was added by mistake and nothing was sent or charged. This cannot be undone.`, confirmLabel: "Delete", destructive: true },
    "Cancel pass": { title: "Cancel pass", message: `Cancel the Season Pass. ${f.first} gets an email that it is canceled and the visits ahead are removed. Nothing more is charged.`, confirmLabel: "Cancel pass", destructive: true },
  }
}
