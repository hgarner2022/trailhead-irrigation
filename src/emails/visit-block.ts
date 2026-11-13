import { googleCalendarUrl } from "./calendar"
import { button, facts, paragraph } from "./layout"
import { crewOf, whenText, type VisitFacts } from "./format"
import type { Base } from "./types"

/** The day, the window, who is coming and where, then both calendar buttons and the pass page button. */
export function visitBody(d: Base, visit: VisitFacts, intro: string): string {
  return [
    paragraph(intro),
    facts([["Day", whenText(visit.day, visit.startTime)], ["Who is coming", `${crewOf(visit)}${visit.crew ? "" : " and the crew"}`], ["Where", visit.location]]),
    `<p style="margin:0 0 8px">${button(googleCalendarUrl(visit), "Add to Google Calendar", "quiet")}${button(visit.icsUrl, "Add to Apple or Outlook calendar", "quiet")}</p>`,
    paragraph("Need a different day? Change it, or anything else on your pass, on your pass page."),
    button(d.signInUrl, "Open your pass page"),
  ].join("")
}

/** The same in plain text. */
export function visitLines(d: Base, visit: VisitFacts, intro: string): string[] {
  return [
    intro, "",
    `Day: ${whenText(visit.day, visit.startTime)}`,
    `Who is coming: ${crewOf(visit)}${visit.crew ? "" : " and the crew"}`,
    `Where: ${visit.location}`, "",
    `Add to Google Calendar: ${googleCalendarUrl(visit)}`,
    `Add to Apple or Outlook calendar: ${visit.icsUrl}`, "",
    `Change your day or anything else on your pass: ${d.passUrl}`,
  ]
}
