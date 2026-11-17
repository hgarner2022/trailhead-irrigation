import { googleCalendarUrl } from "./calendar"
import { ADD_CARD_LINE, BUSINESS, CONFIRM_LINE, RYAN_DOES, atVisitMoneyLine, dollars, moneyLine, whenText } from "./format"
import { button, emailLayout, esc, heading, paragraph, plainText, EMAIL_COLORS } from "./layout"
import type { PurchaseConfirmationData, RenderedEmail } from "./types"

const dateOf = (v: PurchaseConfirmationData["visits"][number]) => (v.visit ? whenText(v.visit.day, v.visit.startTime) : v.fallback)
const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`

export function purchaseConfirmationEmail(d: PurchaseConfirmationData): RenderedEmail {
  const subject = "Your Season Pass is reserved"
  // Never "your days are set" while a visit has no day: those are Ryan's to set.
  const allDated = d.visits.every((v) => v.visit)
  const intro = `Your Season Pass for ${d.town} is reserved for ${d.season}. ${allDated ? "Here are your days." : "Ryan sets the days that are missing and we text them to you."}`
  // A pass sold by the office: no card and no link means the money comes at each visit; a link means the card is still to be added.
  const addCard = !d.cardLast4 && d.cardUpdateUrl ? d.cardUpdateUrl : null
  const money = !d.cardLast4 && !addCard ? atVisitMoneyLine(d.visits) : moneyLine(d.visits, d.cardLast4)
  const image = `<p style="margin:0 0 24px"><a href="${esc(d.signInUrl)}"><img src="${esc(d.passImageUrl)}" width="544" alt="Season Pass ${esc(String(d.season))} for ${esc(d.firstName)}, ${esc(d.town)}" style="display:block;width:100%;max-width:544px;height:auto;border:0;border-radius:8px"></a></p>`
  const rows = d.visits
    .map((v) => {
      const calendar = v.visit ? `<p style="margin:10px 0 0">${button(googleCalendarUrl(v.visit), "Add to Google Calendar", "quiet")}${button(v.visit.icsUrl, "Add to Apple or Outlook calendar", "quiet")}</p>` : ""
      return `<tr><td style="padding:14px 0;border-top:1px solid ${EMAIL_COLORS.border}"><p style="margin:0;font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:22px;line-height:26px;font-weight:600;color:${EMAIL_COLORS.primary}">${esc(capital(v.name))}</p><p style="margin:4px 0 0;font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:17px;line-height:25px;color:${EMAIL_COLORS.text}">${esc(dateOf(v))}</p>${v.note ? `<p style="margin:4px 0 0;font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:17px;line-height:25px;color:${EMAIL_COLORS.text}">${esc(v.note)}</p>` : ""}${v.visit ? `<p style="margin:4px 0 0;font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:15px;line-height:22px;color:${EMAIL_COLORS.text}">${esc(RYAN_DOES[v.kind])}</p>` : ""}${calendar}</td></tr>`
    })
    .join("")
  // What was sold, a line to a row and the total under it; nothing when the pass has no lines.
  const sold = (d.lines ?? []).map((l) => `${capital(l.name)} · ${dollars(l.amount)}`)
  const total = sold.length ? `Total · ${dollars((d.lines ?? []).reduce((sum, l) => sum + l.amount, 0))}` : ""
  const soldHtml = sold.length
    ? `<p style="margin:0 0 16px;font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:17px;line-height:25px;color:${EMAIL_COLORS.text}">${sold.map(esc).join("<br>")}<br><strong>${esc(total)}</strong></p>`
    : ""
  const html = emailLayout({
    origin: d.origin,
    preheader: `Your Season Pass for ${d.town} is reserved. We haven't charged you today.`,
    body: [image, heading(`Welcome, ${d.firstName}`), paragraph(intro), `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">${rows}</table>`, soldHtml, paragraph(CONFIRM_LINE), paragraph(money), ...(addCard ? [paragraph(ADD_CARD_LINE), button(addCard, "Add your card")] : []), button(d.signInUrl, "Open your pass page")].join(""),
    reason: `You are getting this because you bought Season Pass ${d.passNumber}.`,
  })
  const text = plainText([
    `Welcome, ${d.firstName}.`, "", intro, "",
    ...d.visits.flatMap((v) => [`${capital(v.name)}: ${dateOf(v)}`, ...(v.note ? [`  ${v.note}`] : []), ...(v.visit ? [`  ${RYAN_DOES[v.kind]}`] : []), ...(v.visit ? [`  Google Calendar: ${googleCalendarUrl(v.visit)}`, `  Apple or Outlook calendar: ${v.visit.icsUrl}`] : [])]),
    ...(sold.length ? ["", ...sold, total] : []),
    "", CONFIRM_LINE, money, ...(addCard ? [ADD_CARD_LINE, `Add your card: ${addCard}`] : []), "", `Your pass: ${d.signInUrl}`, `Questions: ${BUSINESS.phone}`,
  ])
  return { subject, text, html }
}
