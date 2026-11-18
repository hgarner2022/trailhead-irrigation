import { googleCalendarUrl } from "./calendar"
import { button, facts, paragraph } from "./layout"
import { ACCOUNT_NAME, whenText, whoIsComing, type VisitFacts } from "./format"
import type { Base } from "./types"

/** The day, the window, who is coming and where, then both calendar buttons and the button to the customer's account. */
export function visitBody(d: Base, visit: VisitFacts, intro: string): string {
  return [
    paragraph(intro),
    facts([["Day", whenText(visit.day, visit.startTime)], ["Who is coming", whoIsComing(visit)], ["Where", visit.location]]),
    `<p style="margin:0 0 8px">${button(googleCalendarUrl(visit), "Add to Google Calendar", "quiet")}${button(visit.icsUrl, "Add to Apple or Outlook calendar", "quiet")}</p>`,
    paragraph(`Need a different day? Change it, or anything else, in your ${ACCOUNT_NAME}.`),
    button(d.signInUrl, `Open your ${ACCOUNT_NAME}`),
  ].join("")
}

/** The same in plain text. */
export function visitLines(d: Base, visit: VisitFacts, intro: string): string[] {
  return [
    intro, "",
    `Day: ${whenText(visit.day, visit.startTime)}`,
    `Who is coming: ${whoIsComing(visit)}`,
    `Where: ${visit.location}`, "",
    `Add to Google Calendar: ${googleCalendarUrl(visit)}`,
    `Add to Apple or Outlook calendar: ${visit.icsUrl}`, "",
    `Change your day or anything else in your ${ACCOUNT_NAME}: ${d.accountUrl}`,
  ]
}
