// The texts that do not exist yet (receipt, refund, a visit canceled by us, a crew assignment). Each follows docs/UX_WRITING.md rule 9: "Trailhead:" first, the fact
// first with the service and the street, one link, plain ASCII, "Reply STOP to opt out." only on the first text to a number. Every fact is one the message's data holds.
import { BUSINESS, ACCOUNT_NAME, dollars, shortDay, timeText } from "../format"
import { OPT_OUT } from "@/sms/texts"
import type { CanceledByUsData, RefundData } from "../design/messages"
import type { ReceiptData } from "../types"

const tail = (optOut: boolean) => (optOut ? ` ${OPT_OUT}` : "")

/** "paid by Visa ending 4242", "paid by check" and its number, "paid by cash". */
const how = (d: ReceiptData) => d.paidBy ?? d.card

export const receiptText = (d: ReceiptData, o: { optOut: boolean }) => `Trailhead: receipt for ${dollars(d.amount)}, your ${d.serviceName} at ${d.address}${how(d) ? `, paid by ${how(d)}` : ""}. Your ${ACCOUNT_NAME}: ${d.accountUrl}${tail(o.optOut)}`

export const refundText = (d: RefundData, o: { optOut: boolean }) => `Trailhead: ${dollars(d.amount)} refunded to your ${d.card} for your ${d.serviceName} at ${d.address}. Your ${ACCOUNT_NAME}: ${d.accountUrl}${tail(o.optOut)}`

export const canceledByUsText = (d: CanceledByUsData, o: { optOut: boolean }) =>
  `Trailhead: your ${d.serviceName} at ${d.address}${d.day ? ` on ${shortDay(d.day)}` : ""} is canceled. ${d.paid > 0 ? `The ${dollars(d.paid)} you paid stays as it is.` : "Nothing was charged."} Text or call Ryan at ${BUSINESS.phone}. See your visit: ${d.visitUrl}${tail(o.optOut)}`

/** To the crew, not the customer: no opt-out line. The day, the time, the service, the customer and the street; no gate code (a tech never sees it). */
export const crewAssignedText = (d: { day: string; startTime: string; serviceName: string; customer: string; address: string; town: string; visitUrl: string }) =>
  `Trailhead: ${shortDay(d.day)} at ${timeText(d.startTime)}, ${d.serviceName}, ${d.customer}, ${d.address}, ${d.town}. Open the visit: ${d.visitUrl}`

/** The text the office gets when a customer moves or cancels their own visit: `Trailhead: ` and the Home row's words (src/lib/portal/alerts.ts). */
export const customerChangedText = (message: string) => `Trailhead: ${message}`
