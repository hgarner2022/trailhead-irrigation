import { BUSINESS, dollars } from "./format"
import { button, emailLayout, facts, heading, paragraph, plainText, smallPrint } from "./layout"
import type { CancelledData, CardExpiringData, CardFailedData, ReceiptData, RenderedEmail, RenewalData } from "./types"

const wrap = (d: { origin: string }, preheader: string, title: string, body: string, reason: string) => emailLayout({ origin: d.origin, preheader, body: heading(title) + body, reason })

export function receiptEmail(d: ReceiptData): RenderedEmail {
  const subject = `Receipt: ${dollars(d.amount)} for your ${d.visitName}`
  const intro = `Thank you, ${d.firstName}. We charged ${dollars(d.amount)}${d.card ? ` to your ${d.card}` : ""} for your ${d.visitName} on Season Pass ${d.passNumber}.`
  const rows: [string, string][] = [["Charged", dollars(d.amount)], ["Visit", d.visitName], ["Pass", d.passNumber]]
  if (d.card) rows.push(["Card", d.card])
  const body = paragraph(intro) + facts(rows) + paragraph(d.nextLine) + (d.receiptUrl ? button(d.receiptUrl, "View the receipt", "quiet") : "") + button(d.signInUrl, "Open your pass page")
  return { subject, text: plainText([intro, "", d.nextLine, ...(d.receiptUrl ? ["", `Your receipt: ${d.receiptUrl}`] : []), `Your pass: ${d.passUrl}`]), html: wrap(d, intro, "Thank you", body, `You are getting this because a visit on Season Pass ${d.passNumber} was completed.`) }
}

export function cardFailedEmail(d: CardFailedData): RenderedEmail {
  const subject = d.visitName ? `We could not charge your card for the ${d.visitName}` : "Update the card on your Season Pass"
  const intro = d.visitName
    ? `Hi ${d.firstName}, your ${d.visitName} on Season Pass ${d.passNumber} is done, but your card was declined${d.amount !== null ? ` for ${dollars(d.amount)}` : ""}.`
    : `Hi ${d.firstName}, here is the link to update the card on Season Pass ${d.passNumber}.`
  const how = d.updateUrl ? "It takes a minute to add a new card, and we try it once right after you save it." : "Reply to this email and we will help you update your card."
  const body = paragraph(intro) + paragraph(how) + (d.updateUrl ? button(d.updateUrl, "Update your card") : button(d.signInUrl, "Open your pass page")) + smallPrint("The link is good for 24 hours. Your pass page can make a new one any time.")
  return { subject, text: plainText([intro, how, ...(d.updateUrl ? ["", `Update your card: ${d.updateUrl}`, "The link is good for 24 hours."] : [])]), html: wrap(d, intro, d.visitName ? "Your card needs a quick update" : "Update your card", body, `You are getting this about Season Pass ${d.passNumber}.`) }
}

export function cardExpiringEmail(d: CardExpiringData): RenderedEmail {
  const subject = "Add a card to your Season Pass"
  const intro = `Hi ${d.firstName}, the card on Season Pass ${d.passNumber} ${d.cardState}${d.left > 0 ? `, and ${dollars(d.left)} of visits are still to come` : ""}.`
  const how = d.updateUrl ? "Add a new card now and your visits stay on schedule." : "Reply to this email and we will help you add a new one."
  const body = paragraph(intro) + paragraph(how) + (d.updateUrl ? button(d.updateUrl, "Add a new card") : button(d.signInUrl, "Open your pass page")) + smallPrint("The link is good for 24 hours.")
  return { subject, text: plainText([intro, how, ...(d.updateUrl ? ["", `Add a new card: ${d.updateUrl}`] : [])]), html: wrap(d, intro, "Your card is ending", body, `You are getting this about Season Pass ${d.passNumber}.`) }
}

export function cancelledEmail(d: CancelledData): RenderedEmail {
  const subject = `Season Pass ${d.passNumber} is cancelled`
  const intro = `Hi ${d.firstName}, Season Pass ${d.passNumber} is cancelled and the visits that had not happened are off the schedule. Nothing further will be charged.`
  const how = `If you would like a visit later, your pass page and ${BUSINESS.phone} are both open.`
  const body = paragraph(intro) + paragraph(how) + button(d.signInUrl, "Open your pass page")
  return { subject, text: plainText([intro, how, "", `Your pass: ${d.passUrl}`]), html: wrap(d, intro, "Your pass is cancelled", body, `You are getting this because Season Pass ${d.passNumber} was cancelled.`) }
}

export function renewalEmail(d: RenewalData): RenderedEmail {
  const subject = `Season Pass ${d.season} is open`
  const intro = `Hi ${d.firstName}, Season Pass ${d.season} is open for ${d.town}: the spring turn-on and the fall blowout on a schedule we keep for you.`
  const how = "Nothing is charged until each visit is done."
  const body = paragraph(intro) + paragraph(how) + button(d.buyUrl, `Get the ${d.season} pass`)
  return { subject, text: plainText([intro, how, "", `Get the pass: ${d.buyUrl}`, "", `To stop these emails, reply to this email and say so, or change it on your pass page: ${d.passUrl}`]), html: wrap(d, intro, `Season Pass ${d.season} is open`, body, "You are getting this because you chose to hear about next season. Reply to stop these emails.") }
}

