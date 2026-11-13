import { describe, it, expect } from "vitest"
import { STEPS, canContinue, doneSentence, initialState, reducer, toConsent, toPass, type CheckoutState } from "./checkout-state"

const filled: CheckoutState = {
  step: 1,
  address: "123 Trailhead Way",
  town: "Erie",
  zones: 8,
  turnOnPreference: "earlier",
  blowoutPreference: "recommended",
  firstName: "Andrea",
  email: "andrea@example.com",
  phone: "(970) 555-0123",
  termsAccepted: true,
  marketing: false,
  cardSaved: false,
}

describe("step order", () => {
  it("has six steps, address first, timing third and done last", () => {
    expect(STEPS).toHaveLength(6)
    expect(STEPS[0].key).toBe("address")
    expect(STEPS[2]).toEqual({ key: "timing", question: "When should we turn your system on?", action: "Continue" })
    expect(STEPS[5].key).toBe("done")
  })

  it("starts on the address step with the minimum zones, both recommendations and no consent", () => {
    const s = initialState()
    expect(s.step).toBe(1)
    expect(s.zones).toBe(6)
    expect(s.town).toBeNull()
    expect(s.turnOnPreference).toBe("recommended")
    expect(s.blowoutPreference).toBe("recommended")
    expect(s.termsAccepted).toBe(false)
    expect(s.marketing).toBe(false)
  })

  it("takes the initial zones and prefilled fields", () => {
    const s = initialState({ zones: 10, step: 3, firstName: "Reese", blowoutPreference: "later" })
    expect(s.zones).toBe(10)
    expect(s.step).toBe(3)
    expect(s.firstName).toBe("Reese")
    expect(s.blowoutPreference).toBe("later")
  })

  it("moves forward one step at a time when the step is valid", () => {
    let s = reducer({ ...filled, step: 1 }, { type: "next" })
    expect(s.step).toBe(2)
    s = reducer(s, { type: "next" })
    expect(s.step).toBe(3)
    s = reducer(s, { type: "next" })
    expect(s.step).toBe(4)
    s = reducer(s, { type: "next" })
    expect(s.step).toBe(5)
    s = reducer(s, { type: "next" })
    expect(s.step).toBe(6)
    expect(s.cardSaved).toBe(true)
    expect(reducer(s, { type: "next" }).step).toBe(6)
  })

  it("stays put when the step is not valid", () => {
    const s = reducer(initialState(), { type: "next" })
    expect(s.step).toBe(1)
    expect(reducer({ ...filled, step: 5, termsAccepted: false }, { type: "next" }).step).toBe(5)
  })

  it("goes back, never below the first step", () => {
    expect(reducer({ ...filled, step: 3 }, { type: "back" }).step).toBe(2)
    expect(reducer({ ...filled, step: 1 }, { type: "back" }).step).toBe(1)
  })

  it("never leaves Done: the season is reserved and the card step is not repeated", () => {
    const done = { ...filled, step: 6, cardSaved: true }
    expect(reducer(done, { type: "back" }).step).toBe(6)
    expect(reducer(done, { type: "goTo", step: 5 }).step).toBe(6)
  })

  it("jumps to a step inside the range", () => {
    expect(reducer(filled, { type: "goTo", step: 4 }).step).toBe(4)
    expect(reducer(filled, { type: "goTo", step: 9 }).step).toBe(6)
    expect(reducer(filled, { type: "goTo", step: 0 }).step).toBe(1)
  })

  it("sets one field", () => {
    const s = reducer(initialState(), { type: "set", field: "address", value: "9 Elm St" })
    expect(s.address).toBe("9 Elm St")
    expect(reducer(s, { type: "set", field: "town", value: "Longmont" }).town).toBe("Longmont")
    expect(reducer(s, { type: "set", field: "turnOnPreference", value: "later" }).turnOnPreference).toBe("later")
    expect(reducer(s, { type: "set", field: "termsAccepted", value: true }).termsAccepted).toBe(true)
    expect(reducer(s, { type: "set", field: "marketing", value: true }).marketing).toBe(true)
  })
})

describe("canContinue", () => {
  it("address: needs a street address and a town", () => {
    expect(canContinue({ ...initialState(), address: "  ", town: "Erie" })).toBe(false)
    expect(canContinue({ ...initialState(), address: "9 Elm St", town: null })).toBe(false)
    expect(canContinue({ ...initialState(), address: "9 Elm St", town: "Erie" })).toBe(true)
  })

  it("zones: needs a count between 6 and 16", () => {
    expect(canContinue({ ...filled, step: 2, zones: 5 })).toBe(false)
    expect(canContinue({ ...filled, step: 2, zones: 17 })).toBe(false)
    expect(canContinue({ ...filled, step: 2, zones: 6 })).toBe(true)
    expect(canContinue({ ...filled, step: 2, zones: 16 })).toBe(true)
  })

  it("timing: always has an answer, since the recommendation is preselected", () => {
    expect(canContinue({ ...initialState(), step: 3 })).toBe(true)
    expect(canContinue({ ...filled, step: 3, turnOnPreference: "later", blowoutPreference: "earlier" })).toBe(true)
  })

  it("contact: needs a name, an email with an @ and a ten-digit phone", () => {
    expect(canContinue({ ...filled, step: 4, firstName: " " })).toBe(false)
    expect(canContinue({ ...filled, step: 4, email: "andrea.example.com" })).toBe(false)
    expect(canContinue({ ...filled, step: 4, phone: "555-0123" })).toBe(false)
    expect(canContinue({ ...filled, step: 4, phone: "970 555 0123" })).toBe(true)
    expect(canContinue({ ...filled, step: 4 })).toBe(true)
  })

  it("card: needs the terms accepted, whatever the marketing box says; done: never", () => {
    expect(canContinue({ ...filled, step: 5 })).toBe(true)
    expect(canContinue({ ...filled, step: 5, marketing: true })).toBe(true)
    expect(canContinue({ ...filled, step: 5, termsAccepted: false })).toBe(false)
    expect(canContinue({ ...filled, step: 5, termsAccepted: false, marketing: true })).toBe(false)
    expect(canContinue({ ...filled, step: 6 })).toBe(false)
  })
})

describe("words", () => {
  it("writes the Done sentence from the two preferences and the email", () => {
    expect(doneSentence(filled)).toBe("Turn-on preferred early May, inspection in July, blowout preferred the second week of October. We'll email the details to andrea@example.com.")
    expect(doneSentence({ ...filled, turnOnPreference: "recommended", blowoutPreference: "later" })).toBe(
      "Turn-on preferred the first half of May, inspection in July, blowout preferred late October. We'll email the details to andrea@example.com.",
    )
  })
})

describe("toConsent", () => {
  it("records the terms as accepted now, with marketing by email and text only when ticked", () => {
    expect(toConsent({ marketing: false }, "2026-11-12T20:00:00Z")).toEqual({
      termsAcceptedAt: "2026-11-12T20:00:00Z",
      termsVersion: "2026-11",
      marketingOptIn: false,
      marketingChannels: [],
      source: "checkout",
      recordedAt: "2026-11-12T20:00:00Z",
    })
    expect(toConsent({ marketing: true }, "2026-11-12T20:00:00Z")).toMatchObject({ marketingOptIn: true, marketingChannels: ["email", "sms"] })
  })
})

describe("toPass", () => {
  it("builds an active pass for 6 zones at the published prices, with the preferences and the consent", () => {
    const pass = toPass({ ...filled, zones: 6, step: 6, cardSaved: true, marketing: true }, 2027, "2026-11-12T20:00:00Z")
    expect(pass.id).toBe("p-new")
    expect(pass.number).toBe("TH-2027-NEW")
    expect(pass.status).toBe("active")
    expect(pass.firstName).toBe("Andrea")
    expect(pass.town).toBe("Erie")
    expect(pass.zones).toBe(6)
    expect(pass.turnOnPreference).toBe("earlier")
    expect(pass.blowoutPreference).toBe("recommended")
    expect(pass.visits.map((v) => v.kind)).toEqual(["turn-on", "inspection", "blowout"])
    expect(pass.visits.map((v) => v.amount)).toEqual([145, 145, 95])
    expect(pass.visits.map((v) => v.window)).toEqual(["May", "July", "October"])
    expect(pass.consent).toEqual(toConsent({ marketing: true }, "2026-11-12T20:00:00Z"))
    expect(pass.cardLast4).toBe("4242")
    expect(pass.stripeUrl).toMatch(/^https:\/\//)
    expect(pass.jobberUrl).toMatch(/^https:\/\//)
    expect("blowoutWeek" in pass).toBe(false)
  })

  it("adds the extra zones to each visit for 8 and 12 zones", () => {
    const eight = toPass({ ...filled, zones: 8 }, 2027)
    expect(eight.visits.map((v) => v.amount)).toEqual([145, 145, 115])
    const twelve = toPass({ ...filled, zones: 12 }, 2027)
    expect(twelve.visits.map((v) => v.amount)).toEqual([185, 185, 155])
  })

  it("stamps the consent with the time it is given, and leaves the card off until it is saved", () => {
    const before = Date.now()
    const pass = toPass(filled, 2027)
    expect(Date.parse(pass.consent?.termsAcceptedAt ?? "")).toBeGreaterThanOrEqual(before)
    expect(pass.consent?.marketingOptIn).toBe(false)
    expect(pass.cardLast4).toBeUndefined()
  })
})
