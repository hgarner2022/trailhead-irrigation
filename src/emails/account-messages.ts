import { ACCOUNT_NAME, BUSINESS, SEE_JOB, SIGN_OFF, dollars, longDay } from "./format"
import { doneWords, jobTable, linesOf, paidWords } from "./job-table"
import { button, emailLayout, greetingText, links, paragraph, plainText, smallPrint } from "./layout"
import type { CancelledData, CardExpiringData, CardFailedData, ReceiptData, RenderedEmail, RenewalData, VisitCancelledData } from "./types"

// The money and account emails, worded as docs/plans/2026-11-18-messages-design.md section 4 writes them: the fact first, the
// service and the address, one button, "The Trailhead crew" above the footer. The greeting ("Hi Andrea,") is its own line under
// the heading, added by the frame, so no sentence below begins with it. Only the purchase confirmation and the renewal may say
// "Season Pass" and its number; everything else speaks of the service ("spring turn-on", "repair").

/** The one place these emails assemble themselves: the frame with the heading, greeting, lead, the body, the why line and the sign-off. */
const wrap = (d: { origin: string; firstName: string }, o: { preheader: string; title: string; lead: string; body: string; why: string }) =>
  emailLayout({ origin: d.origin, preheader: o.preheader, title: o.title, greet: { firstName: d.firstName }, lead: o.lead, body: o.body, why: o.why, signOff: SIGN_OFF })
const whereRow = (address?: string | null): [string, string][] => (address ? [["Where", address]] : [])
const at = (address?: string | null) => (address ? ` at ${address}` : "")
const account = `your ${ACCOUNT_NAME}`

/** The method in words: "Visa ending 4242" for a card, "Venmo", "Check" or "Cash" for what the office recorded. */
const how = (d: ReceiptData) => d.paidBy ?? d.card

/** The receipt for a visit paid, or an invoice paid on the pay page: where and when, the number, then the job's lines with their totals and what was paid. */
export function receiptEmail(d: ReceiptData): RenderedEmail {
  const subject = `Receipt: ${dollars(d.amount)} for your ${d.serviceName}${at(d.address)}`
  const intro = `Thank you. Your ${d.serviceName}${at(d.address)} is paid.`
  const lines = linesOf(d)
  const subtotal = d.subtotal ?? lines.reduce((sum, l) => sum + l.amount, 0)
  const table = jobTable({
    facts: [...whereRow(d.address), ...(d.day ? ([["Done", doneWords(d.day, d.who)]] as [string, string][]) : []), ...(d.number ? ([["Receipt", d.number]] as [string, string][]) : []), ...(d.invoiceNumber ? ([["Invoice", d.invoiceNumber]] as [string, string][]) : [])],
    lines, subtotal, tax: d.tax, total: d.total ?? subtotal + (d.tax ?? 0),
    after: [["Paid", paidWords(d.amount, how(d))], ...(d.paidOn ? ([["Paid on", longDay(d.paidOn)]] as [string, string][]) : [])],
  })
  const why = d.invoiceNumber ? `You are getting this because you paid invoice ${d.invoiceNumber}.` : "You are getting this because a visit of yours was completed."
  const how_ = how(d)
  const preheader = `Paid ${dollars(d.amount)}${how_ ? `, ${how_}` : ""}${d.paidOn ? `, on ${longDay(d.paidOn)}` : ""}.`
  const body = table.html + (d.nextLine ? paragraph(d.nextLine) : "") + button(d.signInUrl, SEE_JOB) + links(d.receiptUrl ? [{ href: d.receiptUrl, label: "View the receipt" }] : [])
  const text = plainText([...greetingText(d.firstName), intro, "", ...table.text, ...(d.nextLine ? ["", d.nextLine] : []), "", `${SEE_JOB}: ${d.accountUrl}`, ...(d.receiptUrl ? [`Your receipt: ${d.receiptUrl}`] : [])], SIGN_OFF, why)
  return { subject, text, html: wrap(d, { preheader, title: "Paid, thank you", lead: intro, body, why }) }
}

export function cardFailedEmail(d: CardFailedData): RenderedEmail {
  const subject = d.visitName ? `The card for your ${d.visitName} didn't go through` : `Update the card in your ${ACCOUNT_NAME}`
  const intro = d.visitName
    ? `Your ${d.visitName}${at(d.address)} is done, but your ${d.card ?? "card"} didn't go through${d.amount !== null ? ` for ${dollars(d.amount)}` : ""}.`
    : `Here is the link to update the card in ${account}.`
  const how = d.updateUrl ? (d.visitName ? "Add a new card and we'll try it right away." : "It takes a minute to add a new card.") : "Reply to this email and we'll help you update your card."
  const small = `The link is good for 24 hours. Your ${ACCOUNT_NAME} can make a new one.`
  const why = `You are getting this about the card in ${account}.`
  const body = paragraph(how) + (d.updateUrl ? button(d.updateUrl, "Update your card") : button(d.signInUrl, `Open ${account}`)) + (d.updateUrl ? smallPrint(small) : "")
  const text = plainText([...greetingText(d.firstName), intro, how, ...(d.updateUrl ? ["", `Update your card: ${d.updateUrl}`, small] : ["", `Your ${ACCOUNT_NAME}: ${d.accountUrl}`])], SIGN_OFF, why)
  return { subject, text, html: wrap(d, { preheader: d.updateUrl ? "It takes a minute. The link is good for 24 hours." : "Reply to this email and we'll help you update it.", title: d.visitName ? "Your card needs a quick update" : "Update your card", lead: intro, body, why }) }
}

export function cardExpiringEmail(d: CardExpiringData): RenderedEmail {
  const card = d.card ?? "card"
  const subject = `Your ${card} ${d.cardState}`
  const intro = `The card we have for your visits ${d.cardState}${d.left > 0 ? `, and ${dollars(d.left)} of visits are still to come` : ""}. A new card now keeps them on schedule.`
  const how = d.updateUrl ? "" : "Reply to this email and we'll help you add a new one."
  const why = `You are getting this about the card in ${account}.`
  const body = (how ? paragraph(how) : "") + (d.updateUrl ? button(d.updateUrl, "Add a new card") : button(d.signInUrl, `Open ${account}`)) + (d.updateUrl ? smallPrint("The link is good for 24 hours.") : "")
  const text = plainText([...greetingText(d.firstName), intro, ...(how ? [how] : []), ...(d.updateUrl ? ["", `Add a new card: ${d.updateUrl}`] : ["", `Your ${ACCOUNT_NAME}: ${d.accountUrl}`])], SIGN_OFF, why)
  return { subject, text, html: wrap(d, { preheader: d.updateUrl ? "It takes a minute. The link is good for 24 hours." : "Reply to this email and we'll help you add one.", title: d.cardState.includes("expires") ? "Your card expires soon" : "Your card needs replacing", lead: intro, body, why }) }
}

export function cancelledEmail(d: CancelledData): RenderedEmail {
  const pass = d.season ? `${d.season} Season Pass` : "Season Pass"
  const subject = `Your ${pass} is canceled`
  const intro = `Your ${pass} is canceled and your remaining visits are off the schedule. We won't charge you again.`
  const how = `If you want a visit later, book online or call ${BUSINESS.phone}.`
  const book = `${d.origin}/book`
  const why = `You are getting this because your ${pass} was canceled.`
  return { subject, text: plainText([...greetingText(d.firstName), intro, how, "", `Book a visit: ${book}`], SIGN_OFF, why), html: wrap(d, { preheader: "Nothing more will be charged. Book online whenever you want a visit.", title: "Your Season Pass is canceled", lead: intro, body: paragraph(how) + button(book, "Book a visit"), why }) }
}

export function renewalEmail(d: RenewalData): RenderedEmail {
  const subject = `Reserve your ${d.season} turn-on and blowout`
  const intro = `You can reserve your ${d.town} spring turn-on and fall blowout for ${d.season} now and pick your days in the same step.`
  const how = "You pay after each visit, on the card we have on file."
  const why = "You are getting this because you chose to hear about next season. Reply to stop these emails."
  const text = plainText([...greetingText(d.firstName), intro, how, "", `Reserve ${d.season}: ${d.buyUrl}`, "", `To stop these emails, reply to this email and say so, or change it in ${account}: ${d.accountUrl}`], SIGN_OFF, why)
  return { subject, text, html: wrap(d, { preheader: `Pick your ${d.season} days in the same step. You pay after each visit.`, title: `Season Pass ${d.season} is open`, lead: intro, body: paragraph(how) + button(d.buyUrl, `Reserve ${d.season}`), why }) }
}

/** What a customer reads after canceling a visit: the fact, what is and is not charged, and how to book it again. Transactional; the office does not edit it. */
export const visitCancelledMoney = (paid: number) => (paid > 0 ? `The ${dollars(paid)} you paid stays as it is, and Ryan will contact you about it.` : "Nothing was charged.")

export function visitCancelledEmail(d: VisitCancelledData): RenderedEmail {
  const when = d.day ? ` on ${longDay(d.day)}` : ""
  const subject = `Canceled: your ${d.serviceName}${at(d.address)}`
  const intro = `Your ${d.serviceName}${at(d.address)}${when} is canceled. ${visitCancelledMoney(d.paid)}`
  const how = `Changed your mind? Text or call Ryan at ${BUSINESS.phone} to add it back.`
  const link = d.visitUrl ?? d.signInUrl
  const why = "You are getting this because you canceled a visit in your Trailhead account."
  return { subject, text: plainText([...greetingText(d.firstName), intro, how, "", `See your visit: ${link}`], SIGN_OFF, why), html: wrap(d, { preheader: "Text or call Ryan whenever you want it back on the schedule.", title: `Your ${d.serviceName} is canceled`, lead: intro, body: paragraph(how) + button(link, "See your visit"), why }) }
}
