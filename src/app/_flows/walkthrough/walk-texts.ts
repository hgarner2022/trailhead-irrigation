import { receiptEmail } from "@/emails/account-messages"
import { invoiceEmail } from "@/emails/invoice"
import type { InvoiceData, VisitData } from "@/emails/types"
import { clock12 } from "@/lib/booking/day-time"
import { dateConfirmText, dateSetText, dayBeforeText, invoiceText, onTheWayText } from "@/sms/texts"
import { longDay } from "@/lib/portal/words"
import type { FlowText } from "../FlowFrame"
import type { ContactChannel } from "./ContactPreference"

// The messages the customer gets, in the order she meets them, each from the real renderer over fixture facts (src/sms/texts.ts): the date set
// when she books, the text two weeks out, the day before with the exact time, on my way, the invoice and the receipt. The channel is the contact
// preference she chose: a text, an email of the same words, or both. Every link opens the visit page (or the pay page) inside the prototype.

const LATER = { optOut: false }
const ORIGIN = "https://www.trailheadirrigation.com"
const base = { origin: ORIGIN, firstName: "Andrea", accountUrl: `${ORIGIN}/account`, signInUrl: `${ORIGIN}/account/sign-in` }

export interface TextFacts {
  service: string
  day: string
  start: string
  street: string
  town: string
  firstName: string
}
export const DEFAULT_FACTS: TextFacts = { service: "spring turn-on", day: "2027-04-28", start: "10:30", street: "412 Briggs Street", town: "Erie", firstName: "Andrea" }

const visitOf = (f: TextFacts): VisitData["visit"] => ({
  id: "v1", name: f.service, day: f.day, startTime: f.start, who: "Ryan", address: f.street, location: `${f.street}, ${f.town}`,
  icsUrl: `${ORIGIN}/api/visits/v1/calendar.ics?token=t`, visitUrl: `${ORIGIN}/account/visits/v1?t=abc`,
})

type Kind = "date-set" | "date-confirm" | "day-before" | "on-the-way" | "invoice"
const SUBJECT: Record<Kind, (f: TextFacts) => string> = {
  "date-set": (f) => `Your ${f.service} is booked, ${longDay(f.day)} at ${clock12(f.start)}`,
  "date-confirm": (f) => `Two weeks until your ${f.service}`,
  "day-before": (f) => `Ryan is coming tomorrow at ${clock12(f.start)}`,
  "on-the-way": () => "Ryan is on the way",
  invoice: () => "Your invoice from Trailhead",
}

/** One message in the customer's channel: a text, an email, or both. */
function inChannel(kind: Kind, body: string, f: TextFacts, channel: ContactChannel): FlowText[] {
  const out: FlowText[] = []
  if (channel !== "email") out.push({ id: `${kind}-text`, channel: "text", body })
  if (channel !== "text") out.push({ id: `${kind}-email`, channel: "email", subject: SUBJECT[kind](f), body: body.replace(/ Reply STOP to opt out\.$/, "") })
  return out
}

/** The date-set message alone: what the booking sends the moment it is made. It is the first text this number ever gets, so it ends with the opt-out line (`isFirstText`). */
export function bookingMessages(f: TextFacts, channel: ContactChannel): FlowText[] {
  return inChannel("date-set", dateSetText({ ...base, firstName: f.firstName, visit: visitOf(f) }, { optOut: true }), f, channel)
}

// The invoice the Pay an invoice step starts from: $115 for the repair, the amount the pay page shows.
const invoiceOf = (f: TextFacts): InvoiceData =>
  ({ ...base, firstName: f.firstName, invoiceNumber: "INV-2027-0001", visitName: "repair", address: f.street, lines: [{ name: "Repair", amount: 115 }], total: 115, dueOn: "2027-12-01", payUrl: `${ORIGIN}/pay/inv_1?token=abc` }) as InvoiceData

/** The invoice message alone, which is where the Pay an invoice step begins: the invoice text and the real invoice email, each with its one pay link. */
export function invoiceMessages(f: TextFacts, channel: ContactChannel): FlowText[] {
  const d = invoiceOf(f)
  const out: FlowText[] = []
  if (channel !== "email") out.push({ id: "invoice-text", channel: "text", body: invoiceText(d, { optOut: false }) })
  if (channel !== "text") {
    const mail = invoiceEmail(d)
    out.push({ id: "invoice-email", channel: "email", subject: mail.subject, body: mail.text })
  }
  return out
}

/** The whole sequence for the Texts and emails step. */
export function allMessages(f: TextFacts, channel: ContactChannel): FlowText[] {
  const data: VisitData = { ...base, firstName: f.firstName, visit: visitOf(f) }
  const invoice: InvoiceData = { ...base, firstName: f.firstName, invoiceNumber: "INV-2027-0001", visitName: f.service, address: f.street, lines: [{ name: "Repair", amount: 145 }], total: 145, dueOn: "2027-12-01", payUrl: `${ORIGIN}/pay/inv_1?token=abc` } as InvoiceData
  const receipt = receiptEmail({ ...base, firstName: f.firstName, amount: 145, serviceName: f.service, address: f.street, paidOn: "2027-04-20", total: 145, card: "Visa ending 4242", nextLine: "", receiptUrl: null })
  const lines = receipt.text.split("\n").map((l) => l.trim()).filter(Boolean)
  return [
    // "Reply STOP to opt out." ends the first text this number gets and no later one (`isFirstText` in src/lib/messaging/saved.ts): the thread below is one number's texts in order.
    ...inChannel("date-set", dateSetText(data, { optOut: true }), f, channel),
    ...inChannel("date-confirm", dateConfirmText(data, LATER), f, channel),
    ...inChannel("day-before", dayBeforeText(data, LATER), f, channel),
    ...inChannel("on-the-way", onTheWayText(data, LATER), f, channel === "email" ? "text" : channel),
    ...inChannel("invoice", invoiceText(invoice, LATER), f, channel),
    { id: "receipt-email", channel: "email", subject: receipt.subject, body: lines.slice(0, 3).join(" ") },
  ]
}
