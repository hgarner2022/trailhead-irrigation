import { describe, it, expect } from "vitest"
import { FIXTURE_HOME, FIXTURE_PLACES } from "@/lib/places/fixture"
import { PICK_ADDRESS, STEPS, addressProblem, canContinue, contactProblem, doneSentence, initialState, reducer, toConsent, toPass, type CheckoutState } from "./checkout-state"

const boulder = FIXTURE_PLACES.find((p) => p.town === "Boulder")!

const filled: CheckoutState = {
  step: 1,
  address: FIXTURE_HOME.label,
  place: FIXTURE_HOME,
  town: "Erie",
  access: "yes",
  accessNote: "Gate code 4471, controller in the garage.",
  today: "2026-11-12",
  zones: 8,
  inspection: false,
  turnOnPreference: "earlier",
  blowoutPreference: "recommended",
  firstName: "Andrea",
  email: "andrea@example.com",
  phone: "(970) 555-0123",
  termsAccepted: true,
  marketingEmail: false,
  marketingSms: false,
  cardSaved: false,
}

describe("step order", () => {
  it("has seven steps: address, zones, the July add-on, timing, contact, card and done", () => {
    expect(STEPS).toHaveLength(7)
    expect(STEPS.map((s) => s.key)).toEqual(["address", "zones", "inspection", "timing", "contact", "card", "done"])
    expect(STEPS[2]).toEqual({ key: "inspection", question: "Add a mid-season inspection?", action: "Continue" })
    expect(STEPS[3]).toEqual({ key: "timing", question: "When should we turn your system on?", action: "Continue" })
  })

  it("starts on the address step with the minimum zones, both recommendations and no consent", () => {
    const s = initialState()
    expect(s.step).toBe(1)
    expect(s.zones).toBe(6)
    expect(s.town).toBeNull()
    expect(s.turnOnPreference).toBe("recommended")
    expect(s.blowoutPreference).toBe("recommended")
    expect(s.termsAccepted).toBe(false)
    expect(s.marketingEmail).toBe(false)
    expect(s.marketingSms).toBe(false)
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
    s = reducer(s, { type: "next" })
    expect(s.step).toBe(7)
    expect(s.cardSaved).toBe(true)
    expect(reducer(s, { type: "next" }).step).toBe(7)
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
    const done = { ...filled, step: 7, cardSaved: true }
    expect(reducer(done, { type: "back" }).step).toBe(7)
    expect(reducer(done, { type: "goTo", step: 6 }).step).toBe(7)
  })

  it("jumps to a step inside the range", () => {
    expect(reducer(filled, { type: "goTo", step: 4 }).step).toBe(4)
    expect(reducer(filled, { type: "goTo", step: 9 }).step).toBe(7)
    expect(reducer(filled, { type: "goTo", step: 0 }).step).toBe(1)
  })

  it("sets one field", () => {
    const s = reducer(initialState(), { type: "set", field: "address", value: "9 Elm St" })
    expect(s.address).toBe("9 Elm St")
    expect(reducer(s, { type: "set", field: "town", value: "Longmont" }).town).toBe("Longmont")
    expect(reducer(s, { type: "set", field: "turnOnPreference", value: "later" }).turnOnPreference).toBe("later")
    expect(reducer(s, { type: "set", field: "termsAccepted", value: true }).termsAccepted).toBe(true)
    expect(reducer(s, { type: "set", field: "marketingEmail", value: true }).marketingEmail).toBe(true)
    expect(reducer(s, { type: "set", field: "marketingSms", value: true }).marketingSms).toBe(true)
  })

  it("picks a place, reading the town from it, and drops the pick when typing resumes", () => {
    const picked = reducer(initialState(), { type: "pickPlace", place: FIXTURE_HOME })
    expect(picked.address).toBe("123 Trailhead Way, Erie, CO 80516")
    expect(picked.place).toBe(FIXTURE_HOME)
    expect(picked.town).toBe("Erie")
    const typed = reducer(picked, { type: "typeAddress", text: "123 Trailhead Wa" })
    expect(typed.address).toBe("123 Trailhead Wa")
    expect(typed.place).toBeNull()
    expect(typed.town).toBeNull()
    expect(reducer(initialState(), { type: "pickPlace", place: boulder }).town).toBeNull()
  })
})

describe("addressProblem", () => {
  it("says nothing while typing, asks for a pick after Enter, and names the town outside the area", () => {
    expect(addressProblem({ place: null }, false)).toBeNull()
    expect(addressProblem({ place: null }, true)).toBe(PICK_ADDRESS)
    expect(addressProblem({ place: FIXTURE_HOME }, true)).toBeNull()
    expect(addressProblem({ place: boulder }, false)).toBe("We don't serve Boulder yet. We work in Erie, Longmont, Louisville, Lafayette, Firestone and Broomfield.")
  })
})

describe("contactProblem", () => {
  it("needs a shaped email and a ten-digit phone", () => {
    expect(contactProblem("email", "")).toBe("We need an email for the receipt.")
    expect(contactProblem("email", "andrea@")).toBe("That email doesn't look complete.")
    expect(contactProblem("email", "andrea@example.com")).toBeNull()
    expect(contactProblem("phone", "970 555 012")).toBe("We need a ten-digit phone number for the day-of text.")
    expect(contactProblem("phone", "(970) 555-0123")).toBeNull()
  })
})

describe("canContinue", () => {
  it("address: needs a picked address inside the six towns and the access answer", () => {
    expect(canContinue({ ...initialState(), address: "123 Trailhead Way, Erie, CO 80516", place: null, access: "yes" })).toBe(false)
    expect(canContinue({ ...initialState(), address: boulder.label, place: boulder, access: "yes" })).toBe(false)
    expect(canContinue({ ...initialState(), address: FIXTURE_HOME.label, place: FIXTURE_HOME })).toBe(false)
    expect(canContinue({ ...initialState(), address: FIXTURE_HOME.label, place: FIXTURE_HOME, access: "no" })).toBe(true)
    expect(canContinue({ ...initialState(), address: FIXTURE_HOME.label, place: FIXTURE_HOME, access: "yes" })).toBe(true)
  })

  it("sells only the visits still ahead when bought mid-season, and records who must be home", () => {
    const june = toPass({ ...filled, today: "2027-06-10", inspection: true }, 2027)
    expect(june.visits.map((v) => v.kind)).toEqual(["inspection", "blowout"])
    const august = toPass({ ...filled, today: "2027-08-10", inspection: true }, 2027)
    expect(august.visits.map((v) => v.kind)).toEqual(["blowout"])
    expect(toPass({ ...filled, today: "2026-11-20" }, 2027).visits.map((v) => v.kind)).toEqual(["turn-on", "blowout"])
    expect(doneSentence({ ...filled, today: "2027-08-10" })).toBe("Blowout preferred mid October. We'll email the details to andrea@example.com.")
    const home = toPass({ ...filled, access: "no", accessNote: "" }, 2027)
    expect(home.needsCustomerHome).toBe(true)
    expect(home.accessNote).toBeUndefined()
    const away = toPass(filled, 2027)
    expect(away.needsCustomerHome).toBeUndefined()
    expect(away.accessNote).toBe("Gate code 4471, controller in the garage.")
  })

  it("zones: needs a count between 6 and 16", () => {
    expect(canContinue({ ...filled, step: 2, zones: 5 })).toBe(false)
    expect(canContinue({ ...filled, step: 2, zones: 17 })).toBe(false)
    expect(canContinue({ ...filled, step: 2, zones: 6 })).toBe(true)
    expect(canContinue({ ...filled, step: 2, zones: 16 })).toBe(true)
  })

  it("inspection and timing: always have an answer, the add-on off and the recommendation preselected", () => {
    expect(canContinue({ ...initialState(), step: 3 })).toBe(true)
    expect(canContinue({ ...filled, step: 3, inspection: true })).toBe(true)
    expect(canContinue({ ...initialState(), step: 4 })).toBe(true)
    expect(canContinue({ ...filled, step: 4, turnOnPreference: "later", blowoutPreference: "earlier" })).toBe(true)
  })

  it("contact: needs a name, an email with an @ and a ten-digit phone", () => {
    expect(canContinue({ ...filled, step: 5, firstName: " " })).toBe(false)
    expect(canContinue({ ...filled, step: 5, email: "andrea.example.com" })).toBe(false)
    expect(canContinue({ ...filled, step: 5, phone: "555-0123" })).toBe(false)
    expect(canContinue({ ...filled, step: 5, phone: "970 555 0123" })).toBe(true)
    expect(canContinue({ ...filled, step: 5 })).toBe(true)
    expect(canContinue({ ...filled, step: 5, termsAccepted: false })).toBe(false)
    expect(canContinue({ ...filled, step: 5, termsAccepted: false, marketingEmail: true, marketingSms: true })).toBe(false)
  })

  it("card: needs the terms accepted, whatever the marketing boxes say; done: never", () => {
    expect(canContinue({ ...filled, step: 6 })).toBe(true)
    expect(canContinue({ ...filled, step: 6, marketingEmail: true, marketingSms: true })).toBe(true)
    expect(canContinue({ ...filled, step: 6, termsAccepted: false })).toBe(true)
    expect(canContinue({ ...filled, step: 7 })).toBe(false)
  })
})

describe("words", () => {
  it("writes the Done sentence from the two preferences and the email, naming July only when the inspection was added", () => {
    expect(doneSentence(filled)).toBe("Turn-on preferred early May, blowout preferred mid October. We'll email the details to andrea@example.com.")
    expect(doneSentence({ ...filled, inspection: true, turnOnPreference: "recommended", blowoutPreference: "later" })).toBe(
      "Turn-on preferred mid May, inspection in July, blowout preferred late October. We'll email the details to andrea@example.com.",
    )
  })
})

describe("toConsent", () => {
  it("records the terms as accepted now, with each marketing channel only when its box was ticked", () => {
    expect(toConsent({ marketingEmail: false, marketingSms: false }, "2026-11-12T20:00:00Z")).toEqual({
      termsAcceptedAt: "2026-11-12T20:00:00Z",
      termsVersion: "2026-11",
      marketingOptIn: false,
      marketingChannels: [],
      source: "checkout",
      recordedAt: "2026-11-12T20:00:00Z",
    })
    expect(toConsent({ marketingEmail: true, marketingSms: true }, "2026-11-12T20:00:00Z")).toMatchObject({ marketingOptIn: true, marketingChannels: ["email", "sms"] })
    expect(toConsent({ marketingEmail: true, marketingSms: false }, "2026-11-12T20:00:00Z")).toMatchObject({ marketingOptIn: true, marketingChannels: ["email"] })
    expect(toConsent({ marketingEmail: false, marketingSms: true }, "2026-11-12T20:00:00Z")).toMatchObject({ marketingOptIn: true, marketingChannels: ["sms"] })
  })
})

describe("toPass", () => {
  it("builds an active pass for 6 zones at the published prices, with the preferences and the consent", () => {
    const pass = toPass({ ...filled, zones: 6, step: 7, cardSaved: true, marketingEmail: true, marketingSms: true }, 2027, "2026-11-12T20:00:00Z")
    expect(pass.id).toBe("p-new")
    expect(pass.number).toBe("TH-2027-NEW")
    expect(pass.status).toBe("active")
    expect(pass.firstName).toBe("Andrea")
    expect(pass.town).toBe("Erie")
    expect(pass.zones).toBe(6)
    expect(pass.turnOnPreference).toBe("earlier")
    expect(pass.blowoutPreference).toBe("recommended")
    expect(pass.visits.map((v) => v.kind)).toEqual(["turn-on", "blowout"])
    expect(pass.visits.map((v) => v.amount)).toEqual([145, 95])
    expect(pass.visits.map((v) => v.window)).toEqual(["May", "October"])
    const withJuly = toPass({ ...filled, zones: 6, inspection: true }, 2027)
    expect(withJuly.visits.map((v) => `${v.kind} ${v.window} ${v.amount}`)).toEqual(["turn-on May 145", "inspection July 145", "blowout October 95"])
    expect(pass.consent).toEqual(toConsent({ marketingEmail: true, marketingSms: true }, "2026-11-12T20:00:00Z"))
    expect(pass.cardLast4).toBe("4242")
    expect(pass.stripeUrl).toMatch(/^https:\/\//)
    expect(pass.jobberUrl).toMatch(/^https:\/\//)
    expect("blowoutWeek" in pass).toBe(false)
  })

  it("adds the extra zones to each visit for 8 and 12 zones", () => {
    const eight = toPass({ ...filled, zones: 8, inspection: true }, 2027)
    expect(eight.visits.map((v) => v.amount)).toEqual([145, 145, 115])
    const twelve = toPass({ ...filled, zones: 12 }, 2027)
    expect(twelve.visits.map((v) => v.amount)).toEqual([185, 155])
  })

  it("stamps the consent with the time it is given, and leaves the card off until it is saved", () => {
    const before = Date.now()
    const pass = toPass(filled, 2027)
    expect(Date.parse(pass.consent?.termsAcceptedAt ?? "")).toBeGreaterThanOrEqual(before)
    expect(pass.consent?.marketingOptIn).toBe(false)
    expect(pass.cardLast4).toBeUndefined()
  })
})

describe("the server round trip", () => {
  const pass = { id: "p1" } as never
  it("begun records the pass and the session and opens the card step; going back keeps them", () => {
    const at = { ...filled, step: 5 }
    const begun = reducer(at, { type: "begun", passId: "p1", sessionId: "cs_1", clientSecret: "sec" })
    expect(begun).toMatchObject({ step: 6, passId: "p1", sessionId: "cs_1", clientSecret: "sec" })
    expect(reducer(begun, { type: "back" })).toMatchObject({ step: 5, passId: "p1" })
  })
  it("failed holds the step and shows a message that the next answer clears", () => {
    const failed = reducer({ ...filled, step: 5 }, { type: "failed", message: "Try again" })
    expect(failed).toMatchObject({ step: 5, failure: "Try again" })
    expect(reducer(failed, { type: "set", field: "email", value: "x@y.com" }).failure).toBeUndefined()
  })
  it("finished stores the real pass, marks the card saved and ends on Done with no way back", () => {
    const done = reducer({ ...filled, step: 6, passId: "p1" }, { type: "finished", pass })
    expect(done).toMatchObject({ step: 7, cardSaved: true, pass })
    expect(reducer(done, { type: "back" })).toBe(done)
  })
})
