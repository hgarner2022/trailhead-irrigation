import { describe, expect, it } from "vitest"
import { PREFERENCE_REQUEST } from "../messages/fixtures"
import { voiceProblems } from "../messages/voice"
import { preferenceRequestEmail, preferenceRequestText } from "./preference-request"

// The Preference request prototype: the facts only, Hannah's one sentence about scheduling, the three choices from the data model, and "Reply STOP to opt out." only on a number's first text.
const d = PREFERENCE_REQUEST

describe("the preference request text", () => {
  it("says what is asked and the one sentence Hannah allowed, then one link, and nothing else", () => {
    expect(preferenceRequestText(d, { optOut: false })).toBe("Trailhead: tell us when you'd like your fall blowout at 412 Briggs Street. We'll schedule it about two weeks before and tell you the day. Pick when: https://www.trailheadirrigation.com/account/visits/v3?t=def")
  })
  it("ends with the opt-out line only when it is the first text a number gets", () => {
    expect(preferenceRequestText(d, { optOut: true }).endsWith("Reply STOP to opt out.")).toBe(true)
    expect(preferenceRequestText(d, { optOut: false })).not.toContain("STOP")
  })
  it("follows the voice rules", () => {
    expect(voiceProblems({ channel: "text", words: preferenceRequestText(d, { optOut: true }) })).toEqual([])
  })
})

describe("the preference request email", () => {
  const email = preferenceRequestEmail(d)
  it("names the visit and the street, lists the three choices with their months, and has one button to the visit's page", () => {
    expect(email.subject).toBe("Tell us when you'd like your fall blowout")
    for (const w of ["Early season", "Early October", "Our recommended", "Mid October", "Late season", "Late October", "We'll schedule it about two weeks before and tell you the day."]) expect(email.text).toContain(w)
    expect(email.html.match(/class="cta"/g)).toHaveLength(1)
    expect(email.html).toContain(d.chooseUrl)
  })
  it("promises no time, no deadline and no reminder of its own, and follows the voice rules", () => {
    expect(email.text).not.toMatch(/remind|deadline|within|by (tomorrow|today)|free|guarantee/i)
    expect(voiceProblems({ channel: "email", words: `${email.subject}\n${email.text}` })).toEqual([])
  })
})
