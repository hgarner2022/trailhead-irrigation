import { SIGN_OFF, RYAN_DOES, longDay, noteLine, whoIsComing, windowText } from "./format"
import { bodyOf, capitalFirst, defaultBody, fillTemplate, withoutGreeting, type EditableMessage, type Overrides } from "./editable"
import { emailLayout, greetingName, greetingText, plainText } from "./layout"
import { visitBody, visitLines } from "./visit-block"
import type { RenderedEmail, VisitData } from "./types"

// The four timing emails (the fallback for a customer with no mobile). The first sentence of each is the office's to edit
// (Settings › Messages); the subject, headline, greeting, rows, button and sign-off are fixed.

interface Opts {
  templates?: Overrides
}

const WHY = "You are getting this because Trailhead is coming to your property."

/** The editable first sentence, filled from the visit. A saved sentence that opens with its own greeting loses it: the greeting is its own line. */
const intro = (key: EditableMessage["key"], d: VisitData, o?: Opts) => {
  const v = d.visit
  let body = withoutGreeting(bodyOf(o?.templates, key, "email")) || defaultBody(key, "email")
  const name = greetingName(d.firstName)
  // With no usable name a saved "{firstName}, your ..." or "Thanks, {firstName}." loses the placeholder and its comma, never reads "there, your ..."
  if (!name) body = body.replace(/,?\s*\{firstName\}\s*([,.])?/g, (_m, p: string | undefined) => (p === "." ? "." : "")).trim() || defaultBody(key, "email")
  return capitalFirst(fillTemplate(body, { firstName: name ?? "", service: v.name, address: v.address, day: longDay(v.day), window: v.startTime ? windowText(v.startTime) : null, who: v.who }))
}

function build(d: VisitData, subject: string, title: string, sentence: string, preheader: string): RenderedEmail {
  return {
    subject,
    text: plainText([title, "", ...greetingText(d.firstName), ...visitLines(d, d.visit, sentence)], SIGN_OFF, WHY),
    html: emailLayout({ origin: d.origin, preheader, title, greet: { firstName: d.firstName }, lead: sentence, body: visitBody(d, d.visit), why: WHY, signOff: SIGN_OFF }),
  }
}

export const dateSetEmail = (d: VisitData, o?: Opts): RenderedEmail =>
  build(d, `Your ${d.visit.name} is ${longDay(d.visit.day)}`, `Your ${d.visit.name} has a day`, intro("date-set", d, o), "Add it to your calendar below, or pick another day in your Trailhead account.")

/** What Ryan added to a move: his line, and for a property that must be home the ask to confirm the day. */
const movedSentence = (d: VisitData, o?: Opts) => [intro("date-moved", d, o), noteLine(d.visit.note), d.visit.asked ? "Someone needs to be home, so please confirm that day works, or pick another day in your Trailhead account." : ""].filter(Boolean).join(" ")

export const dateMovedEmail = (d: VisitData, o?: Opts): RenderedEmail =>
  build(d, `Your ${d.visit.name} moved to ${longDay(d.visit.day)}`, `Your ${d.visit.name} moved`, movedSentence(d, o), "Add the new day to your calendar below, or pick another day in your Trailhead account.")

const ryanDoes = (name: string) => (name.includes("inspection") ? RYAN_DOES.inspection : name.includes("blowout") ? RYAN_DOES.blowout : RYAN_DOES["turn-on"])

export const dateConfirmEmail = (d: VisitData, o?: Opts): RenderedEmail =>
  build(d, `Your ${d.visit.name} is ${longDay(d.visit.day)}`, `Your ${d.visit.name} is in two weeks`, `${intro("date-confirm", d, o)} ${ryanDoes(d.visit.name)}`, "We remind you again the day before. Pick another day in your Trailhead account if you need to.")

export const dayBeforeEmail = (d: VisitData, o?: Opts): RenderedEmail =>
  build(d, `Tomorrow: your ${d.visit.name}`, `We're coming tomorrow`, intro("day-before", d, o), d.visit.startTime ? `${whoIsComing(d.visit)} will be there between ${windowText(d.visit.startTime).replace(" to ", " and ")}.` : "We text you if anything changes.")
