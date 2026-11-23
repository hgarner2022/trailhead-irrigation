// "Preference request", a PROTOTYPE (Hannah, Nov 22 2026: "I would like them to opt in anytime we need their preferences. We schedule them before that timeframe, like blowouts two weeks ahead of time or
// turn-ons. They get reminders."). Nothing sends it and no live renderer is touched. It goes to a customer when a visit we schedule for them needs a timing (before that visit's window), by text or
// email by their contact preference, and its link opens THAT visit's page (the signed one-visit link every visit text carries), where the same choice as the account's quiet banner is waiting.
//
// Facts only. The service and the street (the data), the three choices with their months (`preference-words.ts`, from the data model's earlier, recommended and later), and the one sentence Hannah
// allowed about scheduling ("We'll schedule it about two weeks before and tell you the day."). No deadline, no response time, no promise beyond it. The reminders that follow are the messages that
// already exist (two weeks out, day before); this message promises none of them.
import { SIGN_OFF } from "../format"
import { greetingLine } from "../layout"
import type { RenderedEmail } from "../types"
import { TIMING_CHOICES, TIMING_LABEL, TIMING_NAME, TIMING_NEXT, timingMonth, type TimingKind } from "@/lib/portal/preference-words"
import { button, compose, paragraph, summary } from "./frame"

export interface PreferenceRequestData {
  origin: string
  firstName: string
  accountUrl: string
  /** the visit that needs a timing */
  kind: TimingKind
  address: string
  /** the signed link to that visit's page, where the choice is */
  chooseUrl: string
}

export const preferenceRequestSubject = (d: Pick<PreferenceRequestData, "kind">) => `Tell us when you'd like your ${TIMING_NAME[d.kind]}`
export const preferenceRequestLead = (d: Pick<PreferenceRequestData, "kind" | "address">) => `Tell us when you'd like your ${TIMING_NAME[d.kind]} at ${d.address}.`

/** The text: the fact and the one sentence about scheduling, then the link. "Reply STOP to opt out." is added by the caller only on a number's first text (`isFirstText`). */
export const preferenceRequestText = (d: PreferenceRequestData, o: { optOut: boolean }) =>
  `Trailhead: tell us when you'd like your ${TIMING_NAME[d.kind]} at ${d.address}. ${TIMING_NEXT} Choose when: ${d.chooseUrl}${o.optOut ? " Reply STOP to opt out." : ""}`

export function preferenceRequestEmail(d: PreferenceRequestData): RenderedEmail {
  const out = compose({
    origin: d.origin,
    preheader: "Early season, our recommended or late season.",
    title: `Choose when for your ${TIMING_NAME[d.kind]}`,
    greeting: greetingLine(d.firstName),
    lead: preferenceRequestLead(d),
    parts: [summary({ facts: TIMING_CHOICES.map((p): [string, string] => [TIMING_LABEL[p], timingMonth(d.kind, p)]) }), paragraph(TIMING_NEXT), button(d.chooseUrl, "Choose when")],
    why: `You are getting this because we are scheduling your ${TIMING_NAME[d.kind]}.`,
    signOff: SIGN_OFF,
    accountUrl: d.accountUrl,
  })
  return { subject: preferenceRequestSubject(d), ...out }
}

