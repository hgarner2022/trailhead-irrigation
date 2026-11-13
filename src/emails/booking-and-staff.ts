import { crewOf, longDay, whenText } from "./format"
import { button, emailLayout, facts, heading, paragraph, plainText } from "./layout"
import { visitBody, visitLines } from "./visit-block"
import type { AdminAlertData, BookingConfirmationData, NotClosedCrewData, RenderedEmail } from "./types"

export function bookingConfirmationEmail(d: BookingConfirmationData): RenderedEmail {
  const v = d.visit
  const subject = `Your ${d.serviceName} is booked for ${longDay(v.day)}`
  const intro = `Hi ${d.firstName}, ${crewOf(v)}${v.crew ? "" : " and the crew"} will be there ${whenText(v.day, v.startTime)}. We text the day before.`
  return {
    subject,
    text: plainText(["Your visit is booked.", "", ...visitLines(d, v, intro)]),
    html: emailLayout({ origin: d.origin, preheader: `Your ${d.serviceName}: ${longDay(v.day)}.`, body: heading("Your visit is booked") + visitBody(d, v, intro), reason: "You are getting this because you booked a visit with Trailhead." }),
  }
}

/** The crew's morning note about visits nobody marked done; goes to the office, not a customer. */
export function notClosedCrewEmail(d: NotClosedCrewData): RenderedEmail {
  const n = d.visits.length
  const subject = n === 1 ? "1 visit still needs to be marked done" : `${n} visits still need to be marked done`
  const lines = d.visits.map((v) => `${v.customer}, ${v.town}: ${v.name} on ${longDay(v.day)}`)
  const intro = n === 1 ? "One visit had its day and was not marked done. Nothing charges until it is." : `${n} visits had their day and were not marked done. Nothing charges until they are.`
  const html = emailLayout({ origin: d.origin, preheader: intro, body: heading("Not marked done") + paragraph(intro) + facts(d.visits.map((v) => [`${v.customer}, ${v.town}`, `${v.name}, ${longDay(v.day)}`])) + button(`${d.origin}/admin`, "Open Home"), reason: "A note for the Trailhead crew." })
  return { subject, text: plainText([intro, "", ...lines, "", `Home: ${d.origin}/admin`]), html }
}

export function adminAlertEmail(d: AdminAlertData): RenderedEmail {
  const html = emailLayout({ origin: d.origin, preheader: d.detail, body: heading(d.title) + paragraph(d.detail) + button(`${d.origin}${d.path}`, "Open it in the admin"), reason: "A note for the Trailhead office." })
  return { subject: d.title, text: plainText([d.detail, "", `${d.origin}${d.path}`]), html }
}
