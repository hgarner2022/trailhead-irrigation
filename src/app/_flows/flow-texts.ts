import { receiptEmail } from "@/emails/account-messages"
import type { InvoiceData, VisitCancelledData, VisitData } from "@/emails/types"
import { dateMovedText, dateSetText, invoiceText, onTheWayText, visitCancelledText } from "@/sms/texts"
import type { FlowText } from "./FlowFrame"

// The texts and emails the flows show, each built by the real renderer over fixture facts (src/sms/texts.ts, src/emails/account-messages.ts).
export const ORIGIN = "https://www.trailheadirrigation.com"
const base = { origin: ORIGIN, firstName: "Andrea", accountUrl: `${ORIGIN}/account`, signInUrl: `${ORIGIN}/account/sign-in` }
const visitFacts = (day: string, startTime: string | null, over: Partial<VisitData["visit"]> = {}): VisitData["visit"] => ({
  id: "v1", name: "spring turn-on", day, startTime, who: "Ryan", address: "412 Briggs Street", location: "412 Briggs Street, Erie", icsUrl: `${ORIGIN}/api/visits/v1/calendar.ics?token=t`, visitUrl: `${ORIGIN}/account/visits/v1?t=abc`, ...over,
})

export const dateSet = (day: string, start: string | null): FlowText => ({ id: `set-${day}`, channel: "text", body: dateSetText({ ...base, visit: visitFacts(day, start) }) })
export const dateMoved = (day: string, start: string | null, id: string): FlowText => ({ id, channel: "text", body: dateMovedText({ ...base, visit: visitFacts(day, start) }) })
export const onMyWay = (day: string, start: string | null, id: string): FlowText => ({ id, channel: "text", body: onTheWayText({ ...base, visit: visitFacts(day, start) }) })
export const canceled = (day: string | null, id: string): FlowText => {
  const d: VisitCancelledData = { ...base, serviceName: "spring turn-on", address: "412 Briggs Street", day, paid: 0, visitUrl: `${ORIGIN}/account/visits/v1?t=abc` }
  return { id, channel: "text", body: visitCancelledText(d) }
}
export const invoice = (id: string): FlowText => {
  const d: InvoiceData = { ...base, invoiceNumber: "INV-2027-0001", visitName: "repair", address: "412 Briggs Street", lines: [{ name: "Repair", amount: 115 }], total: 115, dueOn: "2027-12-01", payUrl: `${ORIGIN}/pay/inv_1?token=abc` } as InvoiceData
  return { id, channel: "text", body: invoiceText(d) }
}
export const receipt = (id: string, paidOn: string): FlowText => {
  const e = receiptEmail({ ...base, amount: 115, serviceName: "repair", address: "412 Briggs Street", paidOn, total: 115, card: "Visa ending 4242", nextLine: "", receiptUrl: null })
  const lines = e.text.split("\n").map((l) => l.trim()).filter(Boolean)
  return { id, channel: "email", subject: e.subject, body: lines.slice(0, 3).join(" ") }
}
