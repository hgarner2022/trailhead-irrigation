import type { LineItem, LineTotal } from "@/components/blocks/LineItemList"
import type { RecordFact } from "@/components/blocks/RecordPanel"
import type { PillStatus } from "@/components/blocks/StatusPill"
import type { Message } from "@/lib/admin/types"
import type { TimelineLine } from "@/lib/events/timeline"
import type { Reach } from "./confirm-copy"
import type { CustomerPaymentRow } from "./customer-fixtures"

// Design fixtures for the Invoices object (docs/plans/2026-11-18-invoice-workflow-research.md): the list and the invoice page. Today is
// Wednesday, Nov 18, 2026. Invoice words are the glossary's: Invoice sent, Past due, Paid, Canceled. A payment on an invoice settles it, so an
// invoice has one status and its payments are rows under it. No wiring.

export type InvoiceStatus = "sent" | "past-due" | "paid" | "refunded" | "canceled"
export const INVOICE_PILL: Record<InvoiceStatus, { pill: PillStatus; label: string }> = {
  sent: { pill: "bill-sent", label: "Invoice sent" },
  "past-due": { pill: "overdue", label: "Past due" },
  paid: { pill: "paid", label: "Paid" },
  refunded: { pill: "refunded", label: "Refunded" },
  canceled: { pill: "cancelled", label: "Canceled" },
}
export const INVOICE_STATUSES: readonly InvoiceStatus[] = ["sent", "past-due", "paid", "refunded", "canceled"]

export const TODAY = "2026-11-18"

export interface InvoiceListRow {
  id: string
  /** "INV-2026-0038" */
  number: string
  customerId: string
  customer: string
  street: string
  jobId: string
  jobName: string
  /** whole dollars, tax included */
  amount: number
  /** whole dollars still unpaid */
  balance: number
  sentOn: string
  dueOn: string
  paidOn?: string
  status: InvoiceStatus
  who: string
  /** the customer is marked Do not service: a red dot on their chip */
  doNotService?: boolean
  /** Remind was already pressed today: the row's Remind waits until tomorrow */
  remindedToday?: boolean
}

export const money = (n: number) => `$${n.toLocaleString("en-US")}`
const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
export const dayWords = (iso: string) => DAY.format(new Date(`${iso}T12:00:00Z`))

const row = (id: string, n: string, customer: string, street: string, jobName: string, amount: number, sentOn: string, dueOn: string, status: InvoiceStatus, who: string, over: Partial<InvoiceListRow> = {}): InvoiceListRow => ({
  id,
  number: `INV-2026-${n}`,
  customerId: `c-${id}`,
  customer,
  street,
  jobId: `j-${id}`,
  jobName,
  amount,
  balance: status === "sent" || status === "past-due" ? amount : 0,
  sentOn,
  dueOn,
  status,
  who,
  ...over,
})

export const INVOICE_ROWS: InvoiceListRow[] = [
  row("i38", "0038", "Reese Holloway", "51 Shadow Ln", "Fall blowout", 124, "2026-11-03", "2026-11-17", "past-due", "Ryan Garner"),
  row("i35", "0035", "Joe Alvarez", "22 Pine St", "Sprinkler repair", 145, "2026-10-29", "2026-11-12", "past-due", "Hannah Garner"),
  row("i42", "0042", "Marcus Bell", "91 Main St", "Sprinkler repair", 145, "2026-11-12", "2026-12-02", "sent", "Ryan Garner"),
  row("i41", "0041", "Lena Park", "7 Oak Ct", "Valve replacement", 230, "2026-11-11", "2026-11-25", "sent", "Ryan Garner", { remindedToday: true }),
  row("i44", "0044", "Greg Olsen", "5 Birch Ln", "Fall blowout", 115, "2026-11-16", "2026-11-30", "sent", "Hannah Garner"),
  row("i40", "0040", "Priya Shah", "330 Elm Dr", "Sprinkler repair", 145, "2026-11-10", "2026-11-24", "paid", "Hannah Garner", { paidOn: "2026-11-17" }),
  row("i33", "0033", "Dana Cho", "18 Cedar Way", "Fall blowout", 115, "2026-11-02", "2026-11-16", "paid", "Ryan Garner", { paidOn: "2026-11-09" }),
  row("i29", "0029", "Sam Ortiz", "14 Aspen Dr", "Sprinkler repair", 145, "2026-10-20", "2026-11-03", "paid", "Ryan Garner", { paidOn: "2026-10-28" }),
  row("i21", "0021", "Tom Becker", "600 Hill Rd", "Sprinkler repair", 145, "2026-10-12", "2026-10-26", "canceled", "Ryan Garner", { doNotService: true }),
]

const inMonth = (iso: string | undefined) => Boolean(iso?.startsWith("2026-11"))
const sum = (rows: readonly InvoiceListRow[], f: (r: InvoiceListRow) => number) => rows.reduce((n, r) => n + f(r), 0)

/** The four tiles of the Invoices page, read from the rows. */
export function invoiceTotals(rows: readonly InvoiceListRow[]) {
  const unpaid = rows.filter((r) => r.balance > 0)
  const pastDue = rows.filter((r) => r.status === "past-due")
  const sent = rows.filter((r) => inMonth(r.sentOn))
  const paid = rows.filter((r) => inMonth(r.paidOn))
  return {
    unpaid: { total: sum(unpaid, (r) => r.balance), count: unpaid.length },
    pastDue: { total: sum(pastDue, (r) => r.balance), count: pastDue.length },
    sent: { total: sum(sent, (r) => r.amount), count: sent.length },
    paid: { total: sum(paid, (r) => r.amount), count: paid.length },
  }
}

/** Past due first (the oldest due day on top), then the ones still out by due day, then the paid and canceled, newest first. */
export function sortInvoiceRows(rows: readonly InvoiceListRow[]): InvoiceListRow[] {
  const rank = (r: InvoiceListRow) => (r.status === "past-due" ? 0 : r.status === "sent" ? 1 : 2)
  return [...rows].sort((a, b) => rank(a) - rank(b) || (rank(a) < 2 ? a.dueOn.localeCompare(b.dueOn) : b.sentOn.localeCompare(a.sentOn)))
}

export type ReminderHow = "By hand" | "Scheduled, 3 days before due" | "Scheduled, on the due date" | "Scheduled, 7 days after due"

export interface ReminderRow {
  id: string
  sentOn: string
  sortAt: string
  how: ReminderHow
  /** where it went: the number or address */
  to: string
  words: string
}

export interface InvoicePageData {
  id: string
  number: string
  status: InvoiceStatus
  customer: { id: string; name: string; doNotService?: boolean; contact: Required<Reach>; phone: { text: string; href: string }; street: string; town: string }
  job: { id: string; name: string; status: PillStatus; statusLabel: string; next: string; total: string }
  property: RecordFact[]
  amount: string
  unpaid: string
  sent: string
  due: string
  paidOn?: { label: string; paymentId: string }
  /** the payment was refunded: the invoice reads Refunded, never Past due, and offers no reminder */
  refundedOn?: { label: string; paymentId: string }
  lines: LineItem[]
  totals: LineTotal[]
  payments: CustomerPaymentRow[]
  reminders: ReminderRow[]
  /** the schedule: the next automatic reminder, or none once paid or canceled; `paused` while Ryan has stopped it */
  schedule: { next: string; paused?: boolean } | null
  remindedToday?: boolean
  card?: { brand: string; last4: string }
  messages: Message[]
  notes: TimelineLine[]
}

const msg = (id: string, at: string, channel: "sms" | "email", kind: Message["kind"], body: string, status: Message["status"] = "delivered"): Message => ({ id, clientId: "c-1", jobId: "job-1", channel, kind, body, at, status })
const note = (id: string, at: string, what: string, actor = "Ryan"): TimelineLine => ({ id, at, actor, what, kind: "event" })
const PROPERTY: RecordFact[] = [["Zones", "8"], ["Controller", "Rachio 3, garage"], ["Gate code", "4417"], ["Must be home", "No"]]
const BELL = { id: "c-i42", name: "Marcus Bell", contact: { first: "Marcus", channel: "text", phone: "(970) 555-0188", email: "marcus.bell@example.com" } as Required<Reach>, phone: { text: "(970) 555-0188", href: "tel:+19705550188" }, street: "91 Main St", town: "Longmont, CO" }
const stripe = "https://dashboard.stripe.com/payments/pi_demo"
const repairLines: LineItem[] = [{ name: "Repair", description: "A visit to find the problem and fix what we can that day.", amount: "$145" }]
const owed = (total: string, tax = "$0", subtotal = total): LineTotal[] => [["Subtotal", subtotal], ["Tax", tax], ["Total", total, "strong"], ["Paid", "$0"], ["Unpaid", total, "alert"]]
const paidTotals = (total: string): LineTotal[] => [["Subtotal", total], ["Tax", "$0"], ["Total", total, "strong"], ["Paid", total], ["Unpaid", "$0"]]

export type InvoiceFixture = "sent" | "past-due" | "paid-card" | "paid-check" | "refunded" | "canceled"
export const INVOICE_FIXTURES: readonly InvoiceFixture[] = ["sent", "past-due", "paid-card", "paid-check", "refunded", "canceled"]

export function invoicePageOf(which: InvoiceFixture): InvoicePageData {
  const base = { id: "i42", number: "INV-2026-0042", customer: BELL, property: PROPERTY, job: { id: "j-i42", name: "Sprinkler repair", status: "done" as PillStatus, statusLabel: "Done", next: "None ahead", total: "$145" }, amount: "$145", unpaid: "$145", sent: "Nov 12", due: "Dec 2", lines: repairLines, totals: owed("$145"), payments: [], reminders: [], messages: [msg("m1", "2026-11-12T21:42:00Z", "sms", "invoice", "Trailhead: invoice INV-2026-0042 for your repair, $145, due Dec 2.")], notes: [note("n1", "2026-11-12T21:40:00Z", "Sent invoice INV-2026-0042, $145, due Dec 2")] }
  switch (which) {
    case "sent":
      return { ...base, status: "sent", schedule: { next: "Nov 29, 3 days before due" } }
    case "past-due":
      return {
        ...base,
        id: "i38",
        number: "INV-2026-0038",
        status: "past-due",
        customer: { id: "c-i38", name: "Reese Holloway", contact: { first: "Reese", channel: "email", phone: "(970) 555-0140", email: "reese.holloway@example.com" }, phone: { text: "(970) 555-0140", href: "tel:+19705550140" }, street: "51 Shadow Ln", town: "Firestone, CO" },
        job: { id: "j-i38", name: "Fall blowout", status: "done", statusLabel: "Done", next: "None ahead", total: "$124" },
        amount: "$124",
        unpaid: "$124",
        sent: "Nov 3",
        due: "Nov 17",
        lines: [{ name: "Fall blowout", description: "Compressed air through every zone before the first hard freeze.", amount: "$115" }],
        totals: [["Subtotal", "$115"], ["Tax", "$9"], ["Total", "$124", "strong"], ["Paid", "$0"], ["Unpaid", "$124", "alert"]],
        reminders: [
          { id: "r2", sentOn: "Nov 17", sortAt: "2026-11-17", how: "Scheduled, on the due date", to: "reese.holloway@example.com", words: "Delivered" },
          { id: "r1", sentOn: "Nov 14", sortAt: "2026-11-14", how: "Scheduled, 3 days before due", to: "reese.holloway@example.com", words: "Delivered" },
        ],
        schedule: { next: "Nov 24, 7 days after due" },
        messages: [msg("m3", "2026-11-17T17:00:00Z", "email", "invoice-reminder", "Hi Reese, a reminder that your $124 invoice for the fall blowout was due Nov 17. Pay online: trailheadirrigation.com/pay/0038"), msg("m2", "2026-11-03T17:00:00Z", "email", "invoice", "Invoice INV-2026-0038: $124 for your fall blowout at 51 Shadow Ln", "sent")],
        notes: [note("n2", "2026-11-17T17:00:00Z", "Reminder emailed, on the due date", "Trailhead"), note("n1", "2026-11-03T17:00:00Z", "Sent invoice INV-2026-0038, $124, due Nov 17")],
      }
    case "paid-card":
      return {
        ...base,
        id: "i33",
        number: "INV-2026-0033",
        status: "paid",
        customer: { id: "c-i33", name: "Dana Cho", contact: { first: "Dana", channel: "text", phone: "(970) 555-0171", email: "dana.cho@example.com" }, phone: { text: "(970) 555-0171", href: "tel:+19705550171" }, street: "18 Cedar Way", town: "Erie, CO" },
        job: { id: "j-i33", name: "Fall blowout", status: "done", statusLabel: "Done", next: "None ahead", total: "$115" },
        amount: "$115",
        unpaid: "$0",
        sent: "Nov 2",
        due: "Nov 16",
        paidOn: { label: "Nov 9, card", paymentId: "p-i33" },
        lines: [{ name: "Fall blowout", description: "Compressed air through every zone before the first hard freeze.", amount: "$115" }],
        totals: paidTotals("$115"),
        payments: [{ id: "p-i33", receipt: "R-1066", date: "Nov 9", sortDay: "2026-11-09", jobId: "j-i33", jobName: "Fall blowout", how: "Card, kept on file", amount: "$115", stripeUrl: stripe }],
        card: { brand: "Visa", last4: "4242" },
        schedule: null,
        messages: [msg("m2", "2026-11-09T15:01:00Z", "sms", "receipt", "Trailhead: receipt for $115, your fall blowout at 18 Cedar Way."), msg("m1", "2026-11-02T17:00:00Z", "sms", "invoice", "Trailhead: invoice INV-2026-0033 for your fall blowout, $115, due Nov 16.")],
        notes: [note("n2", "2026-11-09T15:00:00Z", "Paid $115 by card from the pay link, card kept on file", "Dana"), note("n1", "2026-11-02T17:00:00Z", "Sent invoice INV-2026-0033, $115, due Nov 16")],
      }
    case "paid-check":
      return {
        ...base,
        id: "i40",
        number: "INV-2026-0040",
        status: "paid",
        customer: { id: "c-i40", name: "Priya Shah", contact: { first: "Priya", channel: "text", phone: "(970) 555-0166", email: "priya.shah@example.com" }, phone: { text: "(970) 555-0166", href: "tel:+19705550166" }, street: "330 Elm Dr", town: "Lafayette, CO" },
        job: { id: "j-i40", name: "Sprinkler repair", status: "done", statusLabel: "Done", next: "None ahead", total: "$145" },
        sent: "Nov 10",
        due: "Nov 24",
        unpaid: "$0",
        paidOn: { label: "Nov 17, check", paymentId: "p-i40" },
        totals: paidTotals("$145"),
        payments: [{ id: "p-i40", receipt: "R-1071", date: "Nov 17", sortDay: "2026-11-17", jobId: "j-i40", jobName: "Sprinkler repair", how: "Check 2210", amount: "$145" }],
        schedule: null,
        reminders: [{ id: "r1", sentOn: "Nov 14", sortAt: "2026-11-14", how: "By hand", to: "(970) 555-0166", words: "Delivered" }],
        messages: [msg("m3", "2026-11-17T20:00:00Z", "sms", "receipt", "Trailhead: receipt for $145, your repair at 330 Elm Dr."), msg("m2", "2026-11-14T16:00:00Z", "sms", "invoice-reminder", "Trailhead: a reminder that your $145 invoice for the repair is due Nov 24. Pay here: trailheadirrigation.com/pay/0040"), msg("m1", "2026-11-10T17:00:00Z", "sms", "invoice", "Trailhead: invoice INV-2026-0040 for your repair, $145, due Nov 24.")],
        notes: [note("n2", "2026-11-17T20:00:00Z", "Recorded a $145 check, number 2210. The invoice is paid and its pay link is closed"), note("n1", "2026-11-10T17:00:00Z", "Sent invoice INV-2026-0040, $145, due Nov 24")],
      }
    case "refunded":
      return {
        ...base,
        id: "i51",
        number: "INV-2026-0051",
        status: "refunded",
        customer: { id: "c6", name: "Nora Quinn", contact: { first: "Nora", channel: "text", phone: "(970) 555-0123", email: "nora.quinn@example.com" }, phone: { text: "(970) 555-0123", href: "tel:+19705550123" }, street: "203 Maple Ct", town: "Lafayette, CO" },
        job: { id: "j1", name: "Sprinkler repair", status: "refunded", statusLabel: "Refunded", next: "None ahead", total: "$145" },
        sent: "Nov 18",
        due: "Dec 2",
        unpaid: "$0",
        refundedOn: { label: "Nov 19, to the card", paymentId: "r1" },
        totals: [["Subtotal", "$145"], ["Tax", "$0"], ["Total", "$145", "strong"], ["Paid", "$0"], ["Refunded", "$145"]],
        payments: [
          { id: "r1", receipt: "R-1102", date: "Nov 19", sortDay: "2026-11-19", jobId: "j1", jobName: "Sprinkler repair", how: "Card", amount: "-$145", refund: true },
          { id: "p1", receipt: "R-1101", date: "Nov 18", sortDay: "2026-11-18", jobId: "j1", jobName: "Sprinkler repair", how: "Card", amount: "$145", stripeUrl: stripe, refunded: true },
        ],
        card: { brand: "Visa", last4: "4242" },
        schedule: null,
        messages: [msg("m2", "2026-11-19T15:01:00Z", "sms", "receipt", "Trailhead: $145 was refunded to your card for the repair at 203 Maple Ct."), msg("m1", "2026-11-18T17:55:00Z", "sms", "invoice", "Trailhead: invoice INV-2026-0051 for your repair, $145, due Dec 2.")],
        notes: [note("n3", "2026-11-19T15:00:00Z", "Refunded $145 to the card. The invoice reads Refunded and no reminders are sent"), note("n2", "2026-11-18T17:50:00Z", "Paid $145 by card from the pay link"), note("n1", "2026-11-18T17:40:00Z", "Sent invoice INV-2026-0051, $145, due Dec 2")],
      }
    case "canceled":
      return {
        ...base,
        id: "i21",
        number: "INV-2026-0021",
        status: "canceled",
        customer: { id: "c-i21", name: "Tom Becker", doNotService: true, contact: { first: "Tom", channel: "text", phone: "(970) 555-0123", email: "tom.becker@example.com" }, phone: { text: "(970) 555-0123", href: "tel:+19705550123" }, street: "600 Hill Rd", town: "Broomfield, CO" },
        job: { id: "j-i21", name: "Sprinkler repair", status: "cancelled", statusLabel: "Canceled", next: "None ahead", total: "$145" },
        sent: "Oct 12",
        due: "Oct 26",
        unpaid: "$0",
        totals: [["Subtotal", "$145"], ["Tax", "$0"], ["Total", "$145", "strong"], ["Paid", "$0"], ["Unpaid", "$0"]],
        schedule: null,
        messages: [msg("m2", "2026-10-15T17:00:00Z", "sms", "invoice", "Trailhead: invoice INV-2026-0021 is canceled. You owe nothing for it."), msg("m1", "2026-10-12T17:00:00Z", "sms", "invoice", "Trailhead: invoice INV-2026-0021 for your repair, $145, due Oct 26.")],
        notes: [note("n2", "2026-10-15T17:00:00Z", "Canceled invoice INV-2026-0021 and closed its pay link"), note("n1", "2026-10-12T17:00:00Z", "Sent invoice INV-2026-0021, $145, due Oct 26")],
      }
  }
}

export const INVOICE_NOTES: Record<InvoiceFixture, string> = {
  sent: "Ryan sees a sent invoice, due Dec 2, no reminder sent yet and the next one scheduled for Nov 29. The one primary action is Send a payment reminder; Collect payment sits beside it.",
  "past-due": "Ryan sees Past due in red, two scheduled reminders already sent and the next one set for 7 days after the due date. The tax is on the lines.",
  "paid-card": "Ryan sees Paid by card from the pay link, with the card kept on file and its receipt and Stripe link. There is no primary action and no reminder schedule.",
  "paid-check": "Ryan sees Paid by a check he recorded: the recording settled the invoice and closed its pay link. There is no primary action.",
  refunded: "Ryan sees an invoice whose card payment was refunded: a grey Refunded pill, never Past due, both rows in Payments (the payment and its negative grey refund), no reminder offered and no Collect payment.",
  canceled: "Ryan sees a canceled invoice kept on record: nothing owed, its pay link closed, no reminders.",
}
