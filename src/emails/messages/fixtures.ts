// One story, told in every message: Andrea Dalton, 412 Briggs Street, Erie. A repair on Wednesday, April 28 at 10:30 am with Ryan, invoice INV-2026-0042 for it,
// a Season Pass for the year. The same people and numbers as the walkthroughs, so the messages read as one customer's weeks. Made up; nothing is sent.
import type { PlainData } from "../plain"
import { receiptNumber } from "../format"
import type {
  AdminAlertData, BookingConfirmationData, CancelledData, CardExpiringData, CardFailedData, InvoiceData, NotClosedCrewData, PurchaseConfirmationData, ReceiptData, RenewalData, SignInData,
  VisitCancelledData, VisitData,
} from "../types"
import type { CanceledByUsData, RefundData, TipsData } from "../design/messages"

export const ORIGIN = "https://www.trailheadirrigation.com"
export const STREET = "412 Briggs Street"
export const CARD = "Visa ending 4242"
export const CHECK_NUMBER = "2210"

const base = { origin: ORIGIN, firstName: "Andrea", accountUrl: `${ORIGIN}/account`, signInUrl: `${ORIGIN}/account/sign-in?email=andrea%40example.com` }

export const REPAIR_VISIT: VisitData["visit"] = {
  id: "v1", name: "repair", day: "2027-04-28", startTime: "10:30", who: "Ryan", address: STREET, location: `${STREET}, Erie`,
  icsUrl: `${ORIGIN}/api/visits/v1/calendar.ics?token=t`, visitUrl: `${ORIGIN}/account/visits/v1?t=abc`,
}
const BLOWOUT_VISIT: VisitData["visit"] = { ...REPAIR_VISIT, id: "v3", name: "fall blowout", day: "2027-10-05", startTime: "08:00", icsUrl: `${ORIGIN}/api/visits/v3/calendar.ics?token=u`, visitUrl: `${ORIGIN}/account/visits/v3?t=def` }

export const VISIT: VisitData = { ...base, visit: REPAIR_VISIT }
export const MOVED_ASKED: VisitData = { ...base, visit: { ...REPAIR_VISIT, asked: true } }

export const BOOKING: BookingConfirmationData = { ...base, serviceName: "repair", visit: REPAIR_VISIT }

const LINES = [{ name: "Repair", amount: 145, quantity: 1, unitPrice: 145 }]

export const INVOICE: InvoiceData = {
  ...base, invoiceNumber: "INV-2026-0042", visitName: "repair", address: STREET, who: "Ryan", day: "2027-04-28",
  lines: LINES, amount: 145, tax: 0, total: 145, dueOn: "2027-05-12", payUrl: `${ORIGIN}/pay/inv-42?token=abc`,
}

const RECEIPT: ReceiptData = {
  ...base, amount: 145, serviceName: "repair", address: STREET, paidOn: "2027-04-29", who: "Ryan", day: "2027-04-28", number: receiptNumber("1a2b3c4d-0000"),
  lines: LINES, subtotal: 145, tax: 0, total: 145, invoiceNumber: "INV-2026-0042", card: null, nextLine: "Your fall blowout is planned for early October.", receiptUrl: null,
}
export const RECEIPTS = {
  card: { ...RECEIPT, card: CARD, receiptUrl: "https://pay.stripe.com/receipts/example" } satisfies ReceiptData,
  check: { ...RECEIPT, paidBy: `check #${CHECK_NUMBER}` } satisfies ReceiptData,
  venmo: { ...RECEIPT, paidBy: "Venmo @andrea-d" } satisfies ReceiptData,
  cash: { ...RECEIPT, paidBy: "cash" } satisfies ReceiptData,
}

export const REFUND: RefundData = { ...base, amount: 145, serviceName: "repair", address: STREET, card: CARD, refundedOn: "2027-05-03", number: "R-9F8E7D6C" }

export const CARD_FAILED: CardFailedData = { ...base, amount: 145, visitName: "repair", card: CARD, address: STREET, updateUrl: "https://billing.stripe.com/s/1" }
export const CARD_LINK: CardFailedData = { ...base, amount: null, visitName: null, card: CARD, address: null, updateUrl: "https://billing.stripe.com/s/2" }
export const CARD_EXPIRING: CardExpiringData = { ...base, card: CARD, cardState: "expires in July 2027", left: 190, updateUrl: "https://billing.stripe.com/s/3" }

export const PURCHASE: PurchaseConfirmationData = {
  ...base, passNumber: "TH-2027-0004", season: 2027, town: "Erie", address: STREET, passImageUrl: `${ORIGIN}/images/pass-card-art-holo.webp`, cardLast4: "4242",
  lines: [{ name: "Spring turn-on", amount: 145 }, { name: "Fall blowout", amount: 95 }],
  visits: [
    { kind: "turn-on", name: "spring turn-on", amount: 145, visit: { ...REPAIR_VISIT, id: "v2", name: "spring turn-on", day: "2027-05-05", startTime: "08:00" }, fallback: "" },
    { kind: "blowout", name: "fall blowout", amount: 95, visit: BLOWOUT_VISIT, fallback: "" },
  ],
}
export const RENEWAL: RenewalData = { ...base, season: 2028, town: "Erie", buyUrl: `${ORIGIN}/season-pass` }
export const CANCELLED: CancelledData = { ...base, season: 2027 }
export const VISIT_CANCELLED: VisitCancelledData = { ...base, serviceName: "repair", address: STREET, day: "2027-04-28", paid: 0, visitUrl: `${ORIGIN}/account/visits/v1?t=abc` }
export const CANCELED_BY_US: CanceledByUsData = { ...base, serviceName: "repair", address: STREET, day: "2027-04-28", paid: 0, visitUrl: `${ORIGIN}/account/visits/v1?t=abc` }
export const TIPS: TipsData = { origin: ORIGIN, firstName: "Andrea", accountUrl: `${ORIGIN}/account`, unsubscribeUrl: `${ORIGIN}/account/unsubscribe` }
export const SIGN_IN: SignInData = { origin: ORIGIN, url: `${ORIGIN}/account/sign-in/verify?token=abc123`, host: "www.trailheadirrigation.com" }
export const PAUSED_TEXT: PlainData = { origin: ORIGIN, firstName: "Andrea", plainBody: "Trailhead: Ryan is on the way to 412 Briggs Street for your repair." }

export const NOT_CLOSED: NotClosedCrewData = { origin: ORIGIN, visits: [{ customer: "Andrea Dalton", name: "repair", day: "2027-04-28", town: "Erie" }, { customer: "Marcus Bell", name: "fall blowout", day: "2027-04-28", town: "Lafayette" }] }
export const ADMIN_ALERT: AdminAlertData = { origin: ORIGIN, title: "New Season Pass: Andrea, Erie, 8 zones", detail: "Andrea in Erie bought a 2027 Season Pass.", path: "/admin/jobs" }

/** The crew-assigned text's facts, for the prototype. */
export const CREW = { person: "Tech Two", customer: "Andrea Dalton", town: "Erie", visitUrl: `${ORIGIN}/admin/schedule?visit=v1` }
