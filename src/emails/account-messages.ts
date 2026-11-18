import { ACCOUNT_NAME, BUSINESS, SEE_JOB, SIGN_OFF, dollars, longDay } from "./format"
import { doneWords, jobTable, linesOf, paidWords } from "./job-table"
import { button, emailLayout, heading, paragraph, plainText, smallPrint } from "./layout"
import type { CancelledData, CardExpiringData, CardFailedData, ReceiptData, RenderedEmail, RenewalData } from "./types"

// The money and account emails, worded as docs/plans/2026-11-18-messages-design.md section 4 writes them: the fact first, the
// service and the address, one button, "The Trailhead crew" above the footer. Only the purchase confirmation and the renewal
// may say "Season Pass" and its number; everything else speaks of the service ("spring turn-on", "repair").

const wrap = (d: { origin: string }, preheader: string, title: string, body: string, reason: string) => emailLayout({ origin: d.origin, preheader, body: heading(title) + body, reason, signOff: SIGN_OFF })
const whereRow = (address?: string | null): [string, string][] => (address ? [["Where", address]] : [])
const at = (address?: string | null) => (address ? ` at ${address}` : "")
const account = `your ${ACCOUNT_NAME}`

/** The method in words: "Visa ending 4242" for a card, "Venmo", "Check" or "Cash" for what the office recorded. */
const how = (d: ReceiptData) => d.paidBy ?? d.card

/** The receipt for a visit paid, or an invoice paid on the pay page: where and when, the number, then the job's lines with their totals and what was paid. */
export function receiptEmail(d: ReceiptData): RenderedEmail {
  const subject = `Receipt: ${dollars(d.amount)} for your ${d.serviceName}${at(d.address)}`
  const intro = `Thank you, ${d.firstName}. Your ${d.serviceName}${at(d.address)} is paid.`
  const lines = linesOf(d)
  const subtotal = d.subtotal ?? lines.reduce((sum, l) => sum + l.amount, 0)
  const table = jobTable({
    facts: [...whereRow(d.address), ...(d.day ? ([["Done", doneWords(d.day, d.who)]] as [string, string][]) : []), ...(d.number ? ([["Receipt", d.number]] as [string, string][]) : []), ...(d.invoiceNumber ? ([["Invoice", d.invoiceNumber]] as [string, string][]) : [])],
    lines, subtotal, tax: d.tax, total: d.total ?? subtotal + (d.tax ?? 0),
    after: [["Paid", paidWords(d.amount, how(d))], ...(d.paidOn ? ([["Paid on", longDay(d.paidOn)]] as [string, string][]) : [])],
  })
  const body = paragraph(intro) + table.html + (d.nextLine ? paragraph(d.nextLine) : "") + button(d.signInUrl, SEE_JOB) + (d.receiptUrl ? button(d.receiptUrl, "View the receipt", "quiet") : "")
  const text = plainText([intro, "", ...table.text, ...(d.nextLine ? ["", d.nextLine] : []), "", `${SEE_JOB}: ${d.accountUrl}`, ...(d.receiptUrl ? [`Your receipt: ${d.receiptUrl}`] : [])], SIGN_OFF)
  return { subject, text, html: wrap(d, intro, "Paid, thank you", body, d.invoiceNumber ? `You are getting this because you paid invoice ${d.invoiceNumber}.` : "You are getting this because a visit of yours was completed.") }
}

export function cardFailedEmail(d: CardFailedData): RenderedEmail {
  const subject = d.visitName ? `The card for your ${d.visitName} didn't go through` : `Update the card in your ${ACCOUNT_NAME}`
  const intro = d.visitName
    ? `Hi ${d.firstName}, your ${d.visitName}${at(d.address)} is done, but your ${d.card ?? "card"} didn't go through${d.amount !== null ? ` for ${dollars(d.amount)}` : ""}.`
    : `Hi ${d.firstName}, here is the link to update the card in ${account}.`
  const how = d.updateUrl ? (d.visitName ? "Add a new card and we'll try it right away." : "It takes a minute to add a new card.") : "Reply to this email and we'll help you update your card."
  const small = `The link is good for 24 hours. Your ${ACCOUNT_NAME} can make a new one.`
  const body = paragraph(intro) + paragraph(how) + (d.updateUrl ? button(d.updateUrl, "Update your card") : button(d.signInUrl, `Open ${account}`)) + (d.updateUrl ? smallPrint(small) : "")
  return { subject, text: plainText([intro, how, ...(d.updateUrl ? ["", `Update your card: ${d.updateUrl}`, small] : ["", `Your ${ACCOUNT_NAME}: ${d.accountUrl}`])], SIGN_OFF), html: wrap(d, intro, d.visitName ? "Your card needs a quick update" : "Update your card", body, `You are getting this about the card in ${account}.`) }
}

export function cardExpiringEmail(d: CardExpiringData): RenderedEmail {
  const card = d.card ?? "card"
  const subject = `Your ${card} ${d.cardState}`
  const intro = `Hi ${d.firstName}, the card we have for your visits ${d.cardState}${d.left > 0 ? `, and ${dollars(d.left)} of visits are still to come` : ""}. A new card now keeps them on schedule.`
  const how = d.updateUrl ? "" : "Reply to this email and we'll help you add a new one."
  const body = paragraph(intro) + (how ? paragraph(how) : "") + (d.updateUrl ? button(d.updateUrl, "Add a new card") : button(d.signInUrl, `Open ${account}`)) + (d.updateUrl ? smallPrint("The link is good for 24 hours.") : "")
  return { subject, text: plainText([intro, ...(how ? [how] : []), ...(d.updateUrl ? ["", `Add a new card: ${d.updateUrl}`] : ["", `Your ${ACCOUNT_NAME}: ${d.accountUrl}`])], SIGN_OFF), html: wrap(d, intro, d.cardState.includes("expires") ? "Your card expires soon" : "Your card needs replacing", body, `You are getting this about the card in ${account}.`) }
}

export function cancelledEmail(d: CancelledData): RenderedEmail {
  const pass = d.season ? `${d.season} Season Pass` : "Season Pass"
  const subject = `Your ${pass} is canceled`
  const intro = `Hi ${d.firstName}, your ${pass} is canceled and your remaining visits are off the schedule. We won't charge you again.`
  const how = `If you want a visit later, book online or call ${BUSINESS.phone}.`
  const book = `${d.origin}/book`
  const body = paragraph(intro) + paragraph(how) + button(book, "Book a visit")
  return { subject, text: plainText([intro, how, "", `Book a visit: ${book}`], SIGN_OFF), html: wrap(d, intro, "Your Season Pass is canceled", body, `You are getting this because your ${pass} was canceled.`) }
}

export function renewalEmail(d: RenewalData): RenderedEmail {
  const subject = `Reserve your ${d.season} turn-on and blowout`
  const intro = `Hi ${d.firstName}, you can reserve your ${d.town} spring turn-on and fall blowout for ${d.season} now and pick your days in the same step.`
  const how = "You pay after each visit, on the card we have on file."
  const body = paragraph(intro) + paragraph(how) + button(d.buyUrl, `Reserve ${d.season}`)
  return { subject, text: plainText([intro, how, "", `Reserve ${d.season}: ${d.buyUrl}`, "", `To stop these emails, reply to this email and say so, or change it in ${account}: ${d.accountUrl}`], SIGN_OFF), html: wrap(d, intro, `Season Pass ${d.season} is open`, body, "You are getting this because you chose to hear about next season. Reply to stop these emails.") }
}
