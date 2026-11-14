import { BUSINESS, dollars } from "./format"
import { button, emailLayout, facts, heading, paragraph, plainText, smallPrint } from "./layout"
import type { CancelledData, CardExpiringData, CardFailedData, ReceiptData, RenderedEmail, RenewalData } from "./types"

const wrap = (d: { origin: string }, preheader: string, title: string, body: string, reason: string) => emailLayout({ origin: d.origin, preheader, body: heading(title) + body, reason })

export function receiptEmail(d: ReceiptData): RenderedEmail {
  const subject = `Receipt: ${dollars(d.amount)} for your ${d.visitName}`
  const how = d.paidBy ? ` by ${d.paidBy}` : d.card ? ` to your ${d.card}` : ""
  const verb = d.paidBy ? "We received" : "We charged"
  const intro = `Thank you, ${d.firstName}. ${verb} ${dollars(d.amount)}${how} for your ${d.visitName}${d.passNumber ? ` on Season Pass ${d.passNumber}` : ""}.`
  const rows: [string, string][] = [[d.paidBy ? "Paid" : "Charged", dollars(d.amount)], ["Visit", d.visitName]]
  if (d.passNumber) rows.push(["Pass", d.passNumber])
  if (d.paidBy) rows.push(["Paid by", d.paidBy])
  else if (d.card) rows.push(["Card", d.card])
  const body = paragraph(intro) + facts(rows) + (d.nextLine ? paragraph(d.nextLine) : "") + (d.receiptUrl ? button(d.receiptUrl, "View the receipt", "quiet") : "") + (d.passNumber ? button(d.signInUrl, "Open your pass page") : "")
  const text = plainText([intro, ...(d.nextLine ? ["", d.nextLine] : []), ...(d.receiptUrl ? ["", `Your receipt: ${d.receiptUrl}`] : []), ...(d.passNumber ? [`Your pass: ${d.passUrl}`] : [])])
  return { subject, text, html: wrap(d, intro, "Thank you", body, d.passNumber ? `You are getting this because a visit on Season Pass ${d.passNumber} was completed.` : "You are getting this because a visit of yours was completed.") }
}

export function cardFailedEmail(d: CardFailedData): RenderedEmail {
  const subject = d.visitName ? `We couldn't charge your card for the ${d.visitName}` : "Update the card on your Season Pass"
  const intro = d.visitName
    ? `Hi ${d.firstName}, your ${d.visitName} on Season Pass ${d.passNumber} is done, but your card didn't go through${d.amount !== null ? ` for ${dollars(d.amount)}` : ""}.`
    : `Hi ${d.firstName}, here is the link to update the card on Season Pass ${d.passNumber}.`
  const how = d.updateUrl ? "It takes a minute to add a new card, and we try it once right after you save it." : "Reply to this email and we'll help you update your card."
  const body = paragraph(intro) + paragraph(how) + (d.updateUrl ? button(d.updateUrl, "Update your card") : button(d.signInUrl, "Open your pass page")) + smallPrint("The link is good for 24 hours. Your pass page can make a new one any time.")
  return { subject, text: plainText([intro, how, ...(d.updateUrl ? ["", `Update your card: ${d.updateUrl}`, "The link is good for 24 hours."] : [])]), html: wrap(d, intro, d.visitName ? "Your card needs a quick update" : "Update your card", body, `You are getting this about Season Pass ${d.passNumber}.`) }
}

export function cardExpiringEmail(d: CardExpiringData): RenderedEmail {
  const subject = "Add a card to your Season Pass"
  const intro = `Hi ${d.firstName}, the card on Season Pass ${d.passNumber} ${d.cardState}${d.left > 0 ? `, and ${dollars(d.left)} of visits are still to come` : ""}.`
  const how = d.updateUrl ? "Add a new card now and your visits stay on schedule." : "Reply to this email and we'll help you add a new one."
  const body = paragraph(intro) + paragraph(how) + (d.updateUrl ? button(d.updateUrl, "Add a new card") : button(d.signInUrl, "Open your pass page")) + smallPrint("The link is good for 24 hours.")
  return { subject, text: plainText([intro, how, ...(d.updateUrl ? ["", `Add a new card: ${d.updateUrl}`] : [])]), html: wrap(d, intro, "Your card expires soon", body, `You are getting this about Season Pass ${d.passNumber}.`) }
}

export function cancelledEmail(d: CancelledData): RenderedEmail {
  const subject = `Season Pass ${d.passNumber} is cancelled`
  const intro = `Hi ${d.firstName}, Season Pass ${d.passNumber} is cancelled and your remaining visits are off the schedule. We won't charge you again.`
  const how = `If you want a visit later, book online or call ${BUSINESS.phone}.`
  const body = paragraph(intro) + paragraph(how) + button(d.signInUrl, "Open your pass page")
  return { subject, text: plainText([intro, how, "", `Your pass: ${d.passUrl}`]), html: wrap(d, intro, "Your pass is cancelled", body, `You are getting this because Season Pass ${d.passNumber} was cancelled.`) }
}

export function renewalEmail(d: RenewalData): RenderedEmail {
  const subject = `Season Pass ${d.season} is open`
  const intro = `Hi ${d.firstName}, you can reserve Season Pass ${d.season} for ${d.town} now: the spring turn-on and the fall blowout, with your days picked in the same step.`
  const how = "You pay after each visit, on the card we have on file."
  const body = paragraph(intro) + paragraph(how) + button(d.buyUrl, `Reserve ${d.season}`)
  return { subject, text: plainText([intro, how, "", `Reserve ${d.season}: ${d.buyUrl}`, "", `To stop these emails, reply to this email and say so, or change it on your pass page: ${d.passUrl}`]), html: wrap(d, intro, `Season Pass ${d.season} is open`, body, "You are getting this because you chose to hear about next season. Reply to stop these emails.") }
}

