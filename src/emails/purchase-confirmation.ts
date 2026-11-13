import { googleCalendarUrl } from "./calendar"
import { BUSINESS, dollars, whenText } from "./format"
import { button, emailLayout, esc, heading, paragraph, plainText, EMAIL_COLORS } from "./layout"
import type { PurchaseConfirmationData, RenderedEmail } from "./types"

const CONFIRM = "We confirm it by text two weeks before. If it has to move, we tell you first and you can pick another day."

/** "Nothing today. $145 after the turn-on, $95 after the blowout, to the card ending 4242." */
function moneyLine(d: PurchaseConfirmationData): string {
  const after = d.visits.map((v) => `${dollars(v.amount)} after the ${v.name}`).join(", ")
  return `Nothing today. ${after}${d.cardLast4 ? `, to the card ending ${d.cardLast4}` : ""}.`
}

const dateOf = (v: PurchaseConfirmationData["visits"][number]) => (v.visit ? whenText(v.visit.day, v.visit.startTime) : v.fallback)
const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`

export function purchaseConfirmationEmail(d: PurchaseConfirmationData): RenderedEmail {
  const subject = `Your Trailhead Season Pass ${d.passNumber} is ready`
  const intro = `Season Pass ${d.passNumber} for ${d.town} is reserved for ${d.season}, and your days are set.`
  const money = moneyLine(d)
  const image = `<p style="margin:0 0 24px"><a href="${esc(d.signInUrl)}"><img src="${esc(d.passImageUrl)}" width="544" alt="Season Pass ${esc(String(d.season))} for ${esc(d.firstName)}, ${esc(d.town)}" style="display:block;width:100%;max-width:544px;height:auto;border:0;border-radius:8px"></a></p>`
  const rows = d.visits
    .map((v) => {
      const calendar = v.visit ? `<p style="margin:10px 0 0">${button(googleCalendarUrl(v.visit), "Add to Google Calendar", "quiet")}${button(v.visit.icsUrl, "Add to Apple or Outlook calendar", "quiet")}</p>` : ""
      return `<tr><td style="padding:14px 0;border-top:1px solid ${EMAIL_COLORS.border}"><p style="margin:0;font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:22px;line-height:26px;font-weight:600;color:${EMAIL_COLORS.primary}">${esc(capital(v.name))}</p><p style="margin:4px 0 0;font-family:'Source Sans 3',Helvetica,Arial,sans-serif;font-size:17px;line-height:25px;color:${EMAIL_COLORS.text}">${esc(dateOf(v))}</p>${calendar}</td></tr>`
    })
    .join("")
  const html = emailLayout({
    origin: d.origin,
    preheader: `Your Season Pass for ${d.town} is reserved. Nothing was charged today.`,
    body: [image, heading(`Welcome, ${d.firstName}`), paragraph(intro), `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">${rows}</table>`, paragraph(CONFIRM), paragraph(money), button(d.signInUrl, "Open your pass page")].join(""),
    reason: `You are getting this because you bought Season Pass ${d.passNumber}.`,
  })
  const text = plainText([
    `Welcome, ${d.firstName}.`, "", intro, "",
    ...d.visits.flatMap((v) => [`${capital(v.name)}: ${dateOf(v)}`, ...(v.visit ? [`  Google Calendar: ${googleCalendarUrl(v.visit)}`, `  Apple or Outlook calendar: ${v.visit.icsUrl}`] : [])]),
    "", CONFIRM, money, "", `Your pass: ${d.signInUrl}`, `Questions: ${BUSINESS.phone}`,
  ])
  return { subject, text, html }
}
