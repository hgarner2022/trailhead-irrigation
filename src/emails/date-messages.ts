import { emailLayout, heading, plainText } from "./layout"
import { RYAN_DOES, longDay } from "./format"
import { visitBody, visitLines } from "./visit-block"
import type { RenderedEmail, VisitData } from "./types"

function build(d: VisitData, subject: string, title: string, intro: string, preheader: string): RenderedEmail {
  return {
    subject,
    text: plainText([`${title}`, "", ...visitLines(d, d.visit, intro)]),
    html: emailLayout({ origin: d.origin, preheader, body: heading(title) + visitBody(d, d.visit, intro), reason: "You are getting this because of your Trailhead Season Pass." }),
  }
}

export const dateSetEmail = (d: VisitData): RenderedEmail =>
  build(d, `Your ${d.visit.name} is ${longDay(d.visit.day)}`, `Your ${d.visit.name} has a day`, `Hi ${d.firstName}, your ${d.visit.name} is set for ${longDay(d.visit.day)}.`, `Your ${d.visit.name} is ${longDay(d.visit.day)}.`)

export const dateMovedEmail = (d: VisitData): RenderedEmail =>
  build(d, `Your ${d.visit.name} moved to ${longDay(d.visit.day)}`, `Your ${d.visit.name} moved`, `Hi ${d.firstName}, your ${d.visit.name} moved to ${longDay(d.visit.day)}.`, `Your ${d.visit.name} moved to ${longDay(d.visit.day)}.`)

const ryanDoes = (name: string) => (name.includes("inspection") ? RYAN_DOES.inspection : name.includes("blowout") ? RYAN_DOES.blowout : RYAN_DOES["turn-on"])

export const dateConfirmEmail = (d: VisitData): RenderedEmail =>
  build(d, `Your ${d.visit.name} is ${longDay(d.visit.day)}`, `Your ${d.visit.name} is in two weeks`, `Hi ${d.firstName}, we're confirming your ${d.visit.name}: ${longDay(d.visit.day)}. ${ryanDoes(d.visit.name)}`, `Your ${d.visit.name} is ${longDay(d.visit.day)}.`)

export const dayBeforeEmail = (d: VisitData): RenderedEmail =>
  build(d, `Tomorrow: your ${d.visit.name}`, `We're coming tomorrow`, `Hi ${d.firstName}, a reminder that we're coming tomorrow, ${longDay(d.visit.day)}, for your ${d.visit.name}.`, `Tomorrow, ${longDay(d.visit.day)}: your ${d.visit.name}.`)
