import { googleCalendarUrl } from "./calendar"
import { EMAIL_COLORS, button, esc, facts, links, paragraph, paragraphHtml } from "./layout"
import { ACCOUNT_NAME, BUSINESS, TEXT_RYAN_LINE, whenText, whoIsComing, type VisitFacts } from "./format"
import { lastChangeDay } from "@/sms/texts"
import type { Base } from "./types"

/** The label of the button that opens this visit's own page, signed so it opens already signed in. */
export const CHANGE_VISIT = "Change this visit"

/**
 * What follows the lead of a visit email: the day, who is coming and where, a note, the one button, then both calendar links as text. The button is "Change this visit"
 * to that visit's signed page (the account link when an older row has none). `late` is the day-before email: the online cut-off has passed, so the button is "Text Ryan".
 */
export function visitBody(d: Base, visit: VisitFacts, o: { late?: boolean } = {}): string {
  const phone = `<a href="${esc(BUSINESS.phoneTel)}" style="color:${EMAIL_COLORS.primary};font-weight:700">${esc(BUSINESS.phone)}</a>`
  const ask = o.late
    ? paragraphHtml(`Need to change it? Text Ryan at ${phone}.`)
    : visit.visitUrl
      ? paragraph(`Need a different day? Last day to change online: ${lastChangeDay(visit.day)}.`)
      : paragraph(`Need a different day? Change it, or anything else, in your ${ACCOUNT_NAME}.`)
  const action = o.late ? button(BUSINESS.phoneTel.replace("tel:", "sms:"), "Text Ryan") : visit.visitUrl ? button(visit.visitUrl, CHANGE_VISIT) : button(d.signInUrl, `Open your ${ACCOUNT_NAME}`)
  return [
    facts([["Day", whenText(visit.day, visit.startTime)], ["Who is coming", whoIsComing(visit)], ["Where", visit.location]]),
    ask,
    action,
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
    o.late
      ? `${TEXT_RYAN_LINE} See your visit: ${visit.visitUrl ?? d.accountUrl}`
      : visit.visitUrl
        ? `${CHANGE_VISIT} (last day to change online: ${lastChangeDay(visit.day)}): ${visit.visitUrl}`
        : `Change your day or anything else in your ${ACCOUNT_NAME}: ${d.accountUrl}`,
  ]
}
