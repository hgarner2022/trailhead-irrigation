import { googleCalendarUrl } from "./calendar"
import { EMAIL_COLORS, button, esc, facts, links, paragraph, paragraphHtml } from "./layout"
import { ACCOUNT_NAME, BUSINESS, TEXT_RYAN_LINE, whenText, whoIsComing, type VisitFacts } from "./format"
import type { Base } from "./types"

/** What follows the lead of a visit email: the day, who is coming and where, a note, the one button to the customer's account, then both calendar links as text. */
export function visitBody(d: Base, visit: VisitFacts, o: { late?: boolean } = {}): string {
  return [
    facts([["Day", whenText(visit.day, visit.startTime)], ["Who is coming", whoIsComing(visit)], ["Where", visit.location]]),
    o.late ? paragraphHtml(`Need to change it? Text Ryan at <a href="${esc(BUSINESS.phoneTel)}" style="color:${EMAIL_COLORS.primary};font-weight:700">${esc(BUSINESS.phone)}</a>.`) : paragraph(`Need a different day? Change it, or anything else, in your ${ACCOUNT_NAME}.`),
    button(d.signInUrl, `Open your ${ACCOUNT_NAME}`),
    links([{ href: googleCalendarUrl(visit), label: "Add to Google Calendar" }, { href: visit.icsUrl, label: "Add to Apple or Outlook calendar" }]),
  ].join("")
}

/** The same in plain text. */
export function visitLines(d: Base, visit: VisitFacts, intro: string, o: { late?: boolean } = {}): string[] {
  return [
    intro, "",
    `Day: ${whenText(visit.day, visit.startTime)}`,
    `Who is coming: ${whoIsComing(visit)}`,
    `Where: ${visit.location}`, "",
    `Add to Google Calendar: ${googleCalendarUrl(visit)}`,
    `Add to Apple or Outlook calendar: ${visit.icsUrl}`, "",
    o.late ? `${TEXT_RYAN_LINE} See your visit: ${d.accountUrl}` : `Change your day or anything else in your ${ACCOUNT_NAME}: ${d.accountUrl}`,
  ]
}
