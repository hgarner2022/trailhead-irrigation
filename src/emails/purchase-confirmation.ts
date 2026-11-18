import { googleCalendarUrl } from "./calendar"
import { ACCOUNT_NAME, ADD_CARD_LINE, BUSINESS, CONFIRM_LINE, RYAN_DOES, atVisitMoneyLine, moneyLine, whenText } from "./format"
import { jobTable } from "./job-table"
import { greetingName, blockTitle, button, emailLayout, facts, greetingText, links, paragraph, picture, plainText, ruled } from "./layout"
import type { PurchaseConfirmationData, RenderedEmail } from "./types"

const dateOf = (v: PurchaseConfirmationData["visits"][number]) => (v.visit ? whenText(v.visit.day, v.visit.startTime) : v.fallback)
/** The one email whose sign-off is the tagline: the start of the season. */
const PURCHASE_SIGN_OFF = "Less time in the yard. More time on the trail."
const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`

export function purchaseConfirmationEmail(d: PurchaseConfirmationData): RenderedEmail {
  const subject = `Your ${d.season} Season Pass is reserved`
  // Never "your days are set" while a visit has no day: those are Ryan's to set.
  const allDated = d.visits.every((v) => v.visit)
  const intro = `Your Season Pass for ${d.town} is reserved for ${d.season}. ${allDated ? "Here are your days." : "Ryan sets the days that are missing and we text them to you."}`
  // A pass sold by the office: no card and no link means the money comes at each visit; a link means the card is still to be added.
  const addCard = !d.cardLast4 && d.cardUpdateUrl ? d.cardUpdateUrl : null
  const money = !d.cardLast4 && !addCard ? atVisitMoneyLine(d.visits) : moneyLine(d.visits, d.cardLast4)
  const why = `You are getting this because you bought Season Pass ${d.passNumber}.`
  const image = picture(d.passImageUrl, `Season Pass ${d.season}${greetingName(d.firstName) ? ` for ${greetingName(d.firstName)}` : ""}, ${d.town}`, d.signInUrl)
  const blocks = d.visits
    .map((v) => ruled(blockTitle(capital(v.name)) + paragraph(dateOf(v)) + (v.note ? paragraph(v.note) : "") + (v.visit ? paragraph(RYAN_DOES[v.kind]) : "") + (v.visit ? links([{ href: googleCalendarUrl(v.visit), label: "Add to Google Calendar" }, { href: v.visit.icsUrl, label: "Add to Apple or Outlook calendar" }]) : "")))
    .join("")
  // What was sold, as the one money table: a line to a row and the season total under it; nothing when the pass has no lines.
  const lines = d.lines ?? []
  const sold = lines.length ? jobTable({ facts: [], lines, total: lines.reduce((sum, l) => sum + l.amount, 0), totalLabel: "Season total" }) : null
  const where = d.address ? facts([["Where", d.address]]) : ""
  // One button: the card to add when there is one to add, else the account.
  const cta = addCard ? button(addCard, "Add your card") + links([{ href: d.signInUrl, label: `Open your ${ACCOUNT_NAME}` }]) : button(d.signInUrl, `Open your ${ACCOUNT_NAME}`)
  const html = emailLayout({
    origin: d.origin,
    preheader: "We haven't charged you today. Your days and what you pay are below.",
    title: `Welcome to the ${d.season} season`,
    greet: { firstName: d.firstName },
    lead: intro,
    body: [image, blocks, where, sold?.html ?? "", paragraph(CONFIRM_LINE), paragraph(money), ...(addCard ? [paragraph(ADD_CARD_LINE)] : []), cta].join(""),
    why,
    signOff: PURCHASE_SIGN_OFF,
  })
  const text = plainText([
    `Welcome to the ${d.season} season.`, "", ...greetingText(d.firstName), intro, "",
    ...d.visits.flatMap((v) => [`${capital(v.name)}: ${dateOf(v)}`, ...(v.note ? [`  ${v.note}`] : []), ...(v.visit ? [`  ${RYAN_DOES[v.kind]}`] : []), ...(v.visit ? [`  Google Calendar: ${googleCalendarUrl(v.visit)}`, `  Apple or Outlook calendar: ${v.visit.icsUrl}`] : [])]),
    ...(d.address ? [`Where: ${d.address}`] : []),
    ...(sold ? ["", ...sold.text] : []),
    "", CONFIRM_LINE, money, ...(addCard ? [ADD_CARD_LINE, `Add your card: ${addCard}`] : []), "", `Your ${ACCOUNT_NAME}: ${d.signInUrl}`, `Questions: ${BUSINESS.phone}`,
  ], PURCHASE_SIGN_OFF, why)
  return { subject, text, html }
}
