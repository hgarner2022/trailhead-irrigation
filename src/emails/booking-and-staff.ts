import { SIGN_OFF, longDay, whenText, whoIsComing } from "./format"
import { button, emailLayout, facts, greetingText, plainText } from "./layout"
import { visitBody, visitLines } from "./visit-block"
import type { AdminAlertData, BookingConfirmationData, NotClosedCrewData, RenderedEmail } from "./types"

const BOOKING_WHY = "You are getting this because you booked a visit with Trailhead."

export function bookingConfirmationEmail(d: BookingConfirmationData): RenderedEmail {
  const v = d.visit
  const subject = `Your ${d.serviceName} is booked for ${longDay(v.day)}`
  const intro = `${whoIsComing(v)} will be there ${whenText(v.day, v.startTime)}. We text you the day before.`
  return {
    subject,
    text: plainText([`Your ${v.name} is booked.`, "", ...greetingText(d.firstName), ...visitLines(d, v, intro)], SIGN_OFF, BOOKING_WHY),
    html: emailLayout({ origin: d.origin, preheader: "We text you the day before. Add it to your calendar below.", title: `Your ${v.name} is booked`, greet: { firstName: d.firstName }, lead: intro, body: visitBody(d, v), why: BOOKING_WHY, signOff: SIGN_OFF }),
  }
}

const CREW_WHY = "A note for the Trailhead crew."
const OFFICE_WHY = "A note for the Trailhead office."

/** The crew's morning note about visits nobody marked done; goes to the office, not a customer. */
export function notClosedCrewEmail(d: NotClosedCrewData): RenderedEmail {
  const n = d.visits.length
  const subject = n === 1 ? "1 visit still needs to be marked done" : `${n} visits still need to be marked done`
  const lines = d.visits.map((v) => `${v.customer}, ${v.town}: ${v.name} on ${longDay(v.day)}`)
  const intro = n === 1 ? "One visit had its day and was not marked done. Nothing charges until it is." : `${n} visits had their day and were not marked done. Nothing charges until they are.`
  const html = emailLayout({
    origin: d.origin,
    preheader: n === 1 ? "Open Home to mark it done." : "Open Home to mark them done.",
    title: "Not marked done",
    lead: intro,
    body: facts(d.visits.map((v) => [v.name, `${v.customer}, ${v.town}, ${longDay(v.day)}`])) + button(`${d.origin}/admin`, "Open Home"),
    why: CREW_WHY,
  })
  return { subject, text: plainText([intro, "", ...lines, "", `Home: ${d.origin}/admin`], undefined, CREW_WHY), html }
}

export function adminAlertEmail(d: AdminAlertData): RenderedEmail {
  const html = emailLayout({ origin: d.origin, preheader: "Open it in the admin to see the rest.", title: d.title, lead: d.detail, body: button(`${d.origin}${d.path}`, "Open it in the admin"), why: OFFICE_WHY })
  return { subject: d.title, text: plainText([d.detail, "", `${d.origin}${d.path}`], undefined, OFFICE_WHY), html }
}
