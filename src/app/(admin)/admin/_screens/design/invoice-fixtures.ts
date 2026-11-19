import type { BillingRowData } from "@/components/blocks/BillingSection"
import type { LineItem, LineTotal } from "@/components/blocks/LineItemList"
import type { FooterAction } from "@/components/blocks/RecordFooter"
import type { Message } from "@/lib/admin/types"
import { noop } from "./job-fixtures"

// Design fixtures for Invoices, the invoice panel and a customer's Billing. Today is Wed, Nov 18, 2026. Invoice words are the glossary's:
// Sent, Past due, Paid, Voided (a canceled invoice stays on record). No wiring.

export type InvoiceStatus = "sent" | "past-due" | "part-paid" | "paid" | "voided"
export const INVOICE_WORDS: Record<InvoiceStatus, string> = { sent: "Sent", "past-due": "Past due", "part-paid": "Part paid", paid: "Paid", voided: "Voided" }

export interface InvoiceGridRow {
  id: string
  name: string
  number: string
  due: string
  /** sorts the Due column */
  dueOn: string
  forText: string
  status: InvoiceStatus
  total: number
  balance: number
  /** the Date filter's bucket */
  range: "this-month" | "last-30" | "earlier"
}

const row = (id: string, name: string, number: string, due: string, dueOn: string, forText: string, status: InvoiceStatus, total: number, balance: number, range: InvoiceGridRow["range"] = "this-month"): InvoiceGridRow =>
  ({ id, name, number, due, dueOn, forText, status, total, balance, range })

/** Past due first, then the ones that are out by due day, then the paid and voided. */
export const INVOICE_ROWS: InvoiceGridRow[] = [
  row("i1", "Reese Holloway", "1038", "Nov 17", "2026-11-17", "Fall blowout, 51 Shadow Ln", "past-due", 115, 115),
  row("i2", "Joe Alvarez", "1035", "Nov 12", "2026-11-12", "Repair, 22 Pine St", "past-due", 145, 145, "last-30"),
  row("i3", "Marcus Bell", "1042", "Dec 2", "2026-12-02", "Repair, 91 Main St", "sent", 145, 145),
  row("i4", "Lena Park", "1041", "Dec 1", "2026-12-01", "Valve replacement, 7 Oak Ct", "part-paid", 230, 85),
  row("i5", "Priya Shah", "1040", "Nov 26", "2026-11-26", "Repair, 330 Elm Dr", "paid", 145, 0),
  row("i6", "Dana Cho", "1033", "Nov 9", "2026-11-09", "Spring turn-on, 18 Cedar Way", "paid", 145, 0, "last-30"),
  row("i7", "Tom Becker", "1021", "Oct 14", "2026-10-14", "Repair, 600 Hill Rd", "voided", 145, 0, "earlier"),
]
export const OWED = INVOICE_ROWS.reduce((n, r) => n + r.balance, 0)
export const PAST_DUE = INVOICE_ROWS.filter((r) => r.status === "past-due").reduce((n, r) => n + r.balance, 0)

export interface InvoiceDetail {
  number: string
  status: InvoiceStatus
  customer: string
  job: string
  sent: string
  due: string
  terms: string
  reminders: string
  lines: LineItem[]
  totals: LineTotal[]
  payments: BillingRowData[]
  messages: Message[]
  /** Remind was pressed today: the button reads "Reminded today" and waits */
  remindedToday?: boolean
  footer: { primary?: FooterAction; secondary?: [FooterAction]; more: FooterAction[]; destructive?: FooterAction }
}

const act = (label: string, disabled?: boolean): FooterAction => ({ label, onClick: noop, disabled })
const LINES: LineItem[] = [{ name: "Repair", description: "A visit to find the problem and fix what we can that day.", amount: "$145" }]
const msg = (id: string, at: string, kind: Message["kind"], channel: "sms" | "email", body: string): Message => ({ id, clientId: "c-1", jobId: "job-1", channel, kind, body, at, status: "delivered" })
const REMINDERS = "3 days before, on the due date, 7 days after"
const QUIET: FooterAction[] = [act("Open job"), act("Open customer")]
const OUT_MORE: FooterAction[] = [act("Copy pay link"), act("Open job"), act("Open customer")]

export function invoiceOf(status: InvoiceStatus | "sent-reminded"): InvoiceDetail {
  const base = { number: "1042", customer: "Marcus Bell", job: "Sprinkler repair visit", sent: "Nov 18", due: "Dec 2", terms: "Due in 14 days", lines: LINES, messages: [msg("m1", "2026-11-18T17:55:00Z", "invoice", "sms", "Trailhead: invoice for your repair, $145, due Dec 2.")] }
  const owed: LineTotal[] = [["Subtotal", "$145"], ["Tax", "$0"], ["Total", "$145", "strong"], ["Paid", "$0"], ["Balance", "$145", "alert"]]
  switch (status) {
    case "sent":
    case "sent-reminded":
      return { ...base, status: "sent", reminders: `${REMINDERS}. Next Nov 29.`, totals: owed, payments: [], remindedToday: status === "sent-reminded", footer: { primary: act(status === "sent-reminded" ? "Reminded today" : "Remind", status === "sent-reminded"), secondary: [act("Record the payment")], more: OUT_MORE, destructive: act("Cancel invoice") } }
    case "past-due":
      return { ...base, number: "1038", customer: "Reese Holloway", sent: "Nov 3", due: "Nov 17", status, reminders: `${REMINDERS}. Next Nov 24.`, totals: owed, payments: [], messages: [msg("m2", "2026-11-17T17:00:00Z", "invoice-reminder", "sms", "Trailhead: invoice 1038, $145, is due today."), ...base.messages], footer: { primary: act("Remind"), secondary: [act("Record the payment")], more: OUT_MORE, destructive: act("Cancel invoice") } }
    case "part-paid":
      return { ...base, number: "1041", customer: "Lena Park", status, reminders: `${REMINDERS}. Next Nov 28.`, lines: [{ name: "Repair", description: "One visit.", amount: "$145" }, { name: "Valve replacement", description: "A new zone valve.", amount: "$85" }], totals: [["Subtotal", "$230"], ["Tax", "$0"], ["Total", "$230", "strong"], ["Paid", "$145"], ["Balance", "$85", "alert"]], payments: [{ id: "p1", kind: "payment", title: "Check", detail: "Nov 20 · check 2210", amount: "$145" }], footer: { primary: act("Remind"), secondary: [act("Record the payment")], more: OUT_MORE, destructive: act("Cancel invoice") } }
    case "paid":
      return { ...base, status, reminders: "No more reminders, it is paid.", totals: [["Subtotal", "$145"], ["Tax", "$0"], ["Total", "$145", "strong"], ["Paid", "$145"], ["Balance", "$0"]], payments: [{ id: "p2", kind: "payment", title: "Card", detail: "Nov 19 · from the pay link", amount: "$145" }], messages: [msg("m3", "2026-11-19T15:01:00Z", "receipt", "email", "Receipt: $145 for your repair at 91 Main St"), ...base.messages], footer: { more: QUIET } }
    case "voided":
      return { ...base, status, reminders: "None, it is voided.", totals: [["Total", "$145", "strong"], ["Balance", "$0"]], payments: [], footer: { more: QUIET } }
  }
}

export const INVOICE_NOTES: Record<InvoiceStatus | "sent-reminded", string> = {
  sent: "Ryan sees a sent invoice with its reminder schedule and the next reminder date. The one primary action is Remind.",
  "sent-reminded": "Ryan sees Reminded today, greyed until tomorrow. The one primary action waits; Record the payment is still there.",
  "past-due": "Ryan sees Past due in red, the reminders already sent and the next one. The one primary action is Remind.",
  "part-paid": "Ryan sees a check recorded by hand and the balance still open. The one primary action is Remind.",
  paid: "Ryan sees Paid with the payment and the receipt text. There is no primary action; the quiet ones are under More.",
  voided: "Ryan sees a voided invoice kept on record with nothing owed. There is no primary action.",
}
