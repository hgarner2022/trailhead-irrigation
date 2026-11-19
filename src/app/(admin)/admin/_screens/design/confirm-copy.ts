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
  reportOption?: { label: string; with: string; without: string }
}

export interface ConfirmFacts {
  first: string
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
}

const PAY_LINK = "trailheadirrigation.com/pay/1042"

export const reminderText = (f: ConfirmFacts): string =>
  `Trailhead: a reminder that your ${f.amount} invoice for the ${f.service} ${f.pastDue ? "was due" : "is due"} ${f.dueOn}. Pay here: ${PAY_LINK}`

export function collectConfirm(way: string, f: ConfirmFacts, reference = ""): ConfirmCopy | null {
  const ref = reference.trim()
  switch (way) {
    case "card":
      return { title: `Charge ${f.amount}`, message: `Charge ${f.amount} to the ${f.cardWords ?? "card on file"}. ${f.first} gets a receipt by email.`, confirmLabel: `Charge ${f.amount}` }
    case "check":
      return { title: "Record the check", message: `Record a ${f.amount} check${ref ? `, number ${ref}` : ""}. ${f.first} gets a receipt by email.`, confirmLabel: "Record the check" }
    case "venmo":
      return { title: "Record the Venmo payment", message: `Record a ${f.amount} Venmo payment${ref ? ` from ${ref}` : ""}. ${f.first} gets a receipt by email.`, confirmLabel: "Record the Venmo payment" }
    case "cash":
      return { title: "Record the cash", message: `Record ${f.amount} in cash. ${f.first} gets a receipt by email.`, confirmLabel: "Record the cash" }
    case "invoice":
      return { title: "Send the invoice", message: `Send the invoice for ${f.amount} by text to ${f.phone}, due ${f.dueOn}.`, confirmLabel: "Send the invoice", reportOption: { label: "Include the visit report (the checklist and photos)", with: `Send the invoice for ${f.amount} by text to ${f.phone}, due ${f.dueOn}, with the visit report.`, without: `Send the invoice for ${f.amount} by text to ${f.phone}, due ${f.dueOn}.` } }
    default:
      return null
  }
}

/** The confirmation behind each footer button that reaches the customer or their money, by the button's label. */
export function footerConfirms(f: ConfirmFacts): Record<string, ConfirmCopy> {
  return {
    Move: { title: "Move the visit", message: `Move the ${f.service} to Wed, Nov 25 at 9:00 am and text ${f.first} the new day.`, confirmLabel: "Move the visit" },
    "On my way": { title: "Send On my way", message: `Text ${f.first} that Ryan is on the way to ${f.address}.`, confirmLabel: "Send" },
    "Send a payment reminder": {
      title: "Send a payment reminder",
      message: `Send this text to ${f.first} at ${f.phone}.`,
      body: reminderText(f),
      confirmLabel: "Send the reminder",
    },
    "Record the payment": { title: "Record the payment", message: `Record that ${f.first} paid ${f.amount}. The open invoice is settled and ${f.first} gets a receipt by email.`, confirmLabel: "Record the payment" },
    "Refund $145": { title: "Refund $145", message: `Record a $145 refund. ${f.first} gets an email that it was refunded.`, confirmLabel: "Refund $145", destructive: true },
    "Send card link": { title: "Send the card link", message: `Text ${f.first} at ${f.phone} a link to add a card.`, confirmLabel: "Send the link" },
    "Cancel job": { title: "Cancel job", message: `Cancel this job. ${f.first} gets a text that the ${f.service} is canceled. Nothing is charged.`, confirmLabel: "Cancel job", destructive: true },
    "Cancel pass": { title: "Cancel pass", message: `Cancel the Season Pass. ${f.first} gets an email that it is canceled and the visits ahead are removed. Nothing more is charged.`, confirmLabel: "Cancel pass", destructive: true },
  }
}
