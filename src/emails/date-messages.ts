import { SIGN_OFF, RYAN_DOES, longDay, windowText } from "./format"
import { bodyOf, fillTemplate, type EditableMessage, type Overrides } from "./editable"
import { emailLayout, heading, plainText } from "./layout"
import { visitBody, visitLines } from "./visit-block"
import type { RenderedEmail, VisitData } from "./types"

// The four timing emails (the fallback for a customer with no mobile). The first sentence of each is the office's to edit
// (Settings › Messages); the subject, headline, rows, buttons and sign-off are fixed.

interface Opts {
  templates?: Overrides
}

/** The editable first sentence, filled from the visit. */
const intro = (key: EditableMessage["key"], d: VisitData, o?: Opts) => {
  const v = d.visit
  return fillTemplate(bodyOf(o?.templates, key, "email"), { firstName: d.firstName, service: v.name, address: v.address, day: longDay(v.day), window: v.startTime ? windowText(v.startTime) : null, who: v.who })
}

function build(d: VisitData, subject: string, title: string, sentence: string, preheader: string): RenderedEmail {
  return {
    subject,
    text: plainText([title, "", ...visitLines(d, d.visit, sentence)], SIGN_OFF),
    html: emailLayout({ origin: d.origin, preheader, body: heading(title) + visitBody(d, d.visit, sentence), reason: "You are getting this because Trailhead is coming to your property.", signOff: SIGN_OFF }),
  }
}

export const dateSetEmail = (d: VisitData, o?: Opts): RenderedEmail =>
  build(d, `Your ${d.visit.name} is ${longDay(d.visit.day)}`, `Your ${d.visit.name} has a day`, intro("date-set", d, o), `Your ${d.visit.name} is ${longDay(d.visit.day)}.`)

export const dateMovedEmail = (d: VisitData, o?: Opts): RenderedEmail =>
  build(d, `Your ${d.visit.name} moved to ${longDay(d.visit.day)}`, `Your ${d.visit.name} moved`, intro("date-moved", d, o), `Your ${d.visit.name} moved to ${longDay(d.visit.day)}.`)

const ryanDoes = (name: string) => (name.includes("inspection") ? RYAN_DOES.inspection : name.includes("blowout") ? RYAN_DOES.blowout : RYAN_DOES["turn-on"])

export const dateConfirmEmail = (d: VisitData, o?: Opts): RenderedEmail =>
  build(d, `Your ${d.visit.name} is ${longDay(d.visit.day)}`, `Your ${d.visit.name} is in two weeks`, `${intro("date-confirm", d, o)} ${ryanDoes(d.visit.name)}`, `Your ${d.visit.name} is ${longDay(d.visit.day)}.`)

export const dayBeforeEmail = (d: VisitData, o?: Opts): RenderedEmail =>
  build(d, `Tomorrow: your ${d.visit.name}`, `We're coming tomorrow`, intro("day-before", d, o), `Tomorrow, ${longDay(d.visit.day)}: your ${d.visit.name}.`)
