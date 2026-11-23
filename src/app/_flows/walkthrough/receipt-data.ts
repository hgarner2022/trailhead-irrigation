import type { ReceiptOutType } from "@/api/v1/portal/schemas"
import { receiptEmail } from "@/emails/account-messages"
import { BUSINESS, SIGN_OFF, dollars, receiptNumber } from "@/emails/format"
import { reportFor } from "@/emails/fixtures"
import { emailLayout, paragraph } from "@/emails/layout"

// The receipt a customer gets for one payment, in every way it can be paid, built for the walkthroughs (Hannah, Nov 19 2026: "so we can see what it
// looks like to the user"): the text, the email from the real receipt renderer (src/emails/account-messages.ts), and the receipt page's data
// (the existing account ReceiptScreen). A refund has no renderer yet, so its email is the same layout with the refund's words. Pure.

export type Way = "card" | "check" | "cash" | "venmo" | "refund"
export const WAYS: { way: Way; label: string; ref?: string }[] = [
  { way: "card", label: "Card" },
  { way: "check", label: "Check", ref: "2210" },
  { way: "cash", label: "Cash" },
  { way: "venmo", label: "Venmo", ref: "@andrea-d" },
  { way: "refund", label: "Refunded" },
]

const ORIGIN = "https://www.trailheadirrigation.com"
const BASE = { origin: ORIGIN, firstName: "Andrea", accountUrl: `${ORIGIN}/account`, signInUrl: `${ORIGIN}/account/sign-in` }
const SERVICE = "repair"
const STREET = "480 Briggs St, Erie"
const PAID_ON = "2026-11-18"
export const PAYMENT_ID = "pay_p1"
export const CARD = "Visa ending 4242"
const CARD_RECEIPT = "https://pay.stripe.com/receipts/example"

const clean = (ref?: string) => (ref ?? "").replace(/^#/, "").trim()
/** "check #2210", "Venmo @andrea-d", "cash", "Visa ending 4242": how the money came, as the email says it. */
export const paidBy = (way: Way, ref?: string) => (way === "card" || way === "refund" ? CARD : way === "check" ? (clean(ref) ? `check #${clean(ref)}` : "check") : way === "venmo" ? (ref ? `Venmo ${ref}` : "Venmo") : "cash")

/** The receipt page's data: what the account's ReceiptScreen draws. A card reads "Card, Visa ending 4242" with its card receipt link. */
export function receiptOf(way: Exclude<Way, "refund">, ref?: string): ReceiptOutType {
  return {
    id: PAYMENT_ID,
    business: { name: BUSINESS.name, phone: BUSINESS.phone },
    customerName: "Andrea Dalton",
    address: STREET,
    jobName: "Sprinkler repair",
    lines: [{ name: "Repair", quantity: 1, unitPrice: 145 }],
    amount: 145,
    method: way === "card" ? "card_now" : way,
    reference: way === "card" ? CARD : way === "check" ? clean(ref) || null : way === "venmo" ? ref ?? null : null,
    paidOn: PAID_ON,
    receiptUrl: way === "card" ? CARD_RECEIPT : null,
    // "What we did": the repair's checklist (four of five done) and the two photos Ryan shared, the same on the page and in the email
    report: reportFor("repair", 4, 2, ""),
  }
}

/** The receipt text: the fact first, the service and the street. */
export const receiptText = (way: Way) => (way === "refund" ? `Trailhead: $145 refunded to your ${CARD}. It can take 5 to 10 days to show on your statement.` : `Trailhead: receipt for $145, your ${SERVICE} at 480 Briggs St.`)

/** The receipt email as HTML, from the real renderer (a refund from the same frame). */
export function receiptEmailOf(way: Way, ref?: string): { subject: string; html: string } {
  if (way === "refund") {
    const lead = `We refunded $145 to your ${CARD} for your ${SERVICE} at ${STREET}.`
    return {
      subject: `Refund: $145 to your card for your ${SERVICE}`,
      html: emailLayout({ origin: ORIGIN, preheader: "Refunded $145 to your card.", title: "Refunded", greet: { firstName: "Andrea" }, lead, body: paragraph("It can take 5 to 10 days to show on your statement. You do not need to do anything."), why: "You are getting this because Ryan refunded a payment.", signOff: SIGN_OFF }),
    }
  }
  const e = receiptEmail({ ...BASE, amount: 145, serviceName: SERVICE, address: STREET, paidOn: PAID_ON, total: 145, number: receiptNumber(PAYMENT_ID), card: way === "card" ? CARD : null, paidBy: way === "card" ? null : paidBy(way, ref), nextLine: "", receiptUrl: way === "card" ? CARD_RECEIPT : null, report: reportFor("repair", 4, 2) })
  return { subject: e.subject, html: e.html }
}

export const refundLine = `${dollars(145)} refunded to your card`
