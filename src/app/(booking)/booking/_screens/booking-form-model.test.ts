import { describe, expect, it } from "vitest"
import { fixtureDayTimes } from "@/lib/booking/day-time"
import { QUOTE_SERVICES, SERVICES } from "@/lib/booking/services"
import { FIXTURE_HOME } from "@/lib/places/fixture"
import { initialState } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import { callbackMode, canContinue, contactProblem, happensWords, phoneWords, priceFor, priceWords, problemsFor, reviewRows, stepsFor, stepTotal } from "./booking-form-model"

const svc = (key: string) => [...SERVICES, ...QUOTE_SERVICES].find((s) => s.key === key)!
const base = (over = {}) => ({ zip: "80516", service: svc("repair"), fields: initialState(), picks: {}, offers: {}, when: "", ...over })
const person = { firstName: "Andrea", lastName: "Dalton", email: "andrea@example.com", phone: "(970) 555-0123", termsAccepted: true }

describe("the booking form's steps", () => {
  it("puts the day before contact, and gives a request the same first screens, contact last and no day", () => {
    expect(stepsFor(svc("repair"))).toEqual(["zip", "service", "address", "details", "day", "contact", "confirm", "done"])
    expect(stepsFor(null, true)).toEqual(["zip", "quote-service", "address", "details", "contact", "done"])
    expect(stepTotal(stepsFor(svc("repair")))).toBe(7)
  })
  it("passes the zip step only for a zip we serve", () => {
    expect(canContinue("zip", base({ zip: "80302" }))).toBe(false)
    expect(canContinue("zip", base({ zip: "8051" }))).toBe(false)
    expect(canContinue("zip", base())).toBe(true)
  })
  it("keeps the service step off for a closed service", () => {
    expect(canContinue("service", base({ service: svc("spring-turn-on") }))).toBe(false)
    expect(canContinue("service", base())).toBe(true)
  })
  it("writes contact problems as help and needs the terms on a booking but not a request", () => {
    expect(contactProblem("phone", "")).toBe("Add a phone number so we can text you the day.")
    expect(contactProblem("phone", "970555")).toBe("A phone number has ten digits. Check yours.")
    expect(contactProblem("phone", "(970) 555-0123")).toBeNull()
    const fields = { ...initialState(), ...person, termsAccepted: false }
    expect(canContinue("contact", base({ fields }))).toBe(false)
    expect(problemsFor("contact", base({ fields }))).toEqual(["Terms"])
    expect(canContinue("contact", base({ fields, service: svc("new-system") }))).toBe(true)
  })
  it("needs a serviceable address and, for a booking, the access answer", () => {
    const fields = { ...initialState(), place: FIXTURE_HOME, town: "Erie" as const }
    expect(canContinue("address", base({ fields }))).toBe(true)
    expect(canContinue("details", base({ fields }))).toBe(false)
    expect(canContinue("details", base({ fields: { ...fields, access: "yes" as const } }))).toBe(true)
    expect(canContinue("details", base({ fields, service: svc("new-system") }))).toBe(true)
  })
  it("holds Continue on the day step until a time is tapped, unless no day is open or the customer said when", () => {
    const offers = { visit: fixtureDayTimes(120) }
    const a = base({ offers, picks: { visit: { day: "2027-04-20", start: null } } })
    expect(canContinue("day", a)).toBe(false)
    expect(canContinue("day", { ...a, picks: { visit: { day: "2027-04-20", start: "10:30" } } })).toBe(true)
    expect(callbackMode({ ...a, offers: { visit: [] } })).toBe(true)
    expect(canContinue("day", { ...a, when: "Any weekday morning in May" })).toBe(true)
    expect(callbackMode({ ...a, when: "Any weekday morning in May" })).toBe(true)
    expect(callbackMode({ ...a, picks: { visit: { day: "2027-04-20", start: "10:30" } }, when: "ignored" })).toBe(false)
  })
})

describe("the price and the confirm words", () => {
  it("prices a turn-on from the zones and says when it is charged", () => {
    expect(priceFor(svc("spring-turn-on"), 8)).toBe(145)
    expect(priceFor(svc("spring-turn-on"), 10)).toBe(165)
    expect(priceWords(svc("spring-turn-on"), 10)).toBe("About $165, charged after the visit.")
    expect(priceWords(svc("repair"), 6)).toBe("About $145, charged after the visit.")
  })
  it("says exactly what happens, by how the customer asked to be reached", () => {
    const a = { phone: "9705550123", email: "andrea@example.com", quote: false, callback: false }
    expect(phoneWords("9705550123")).toBe("(970) 555-0123")
    expect(happensWords({ ...a, channel: "text" })).toBe("We'll text you a confirmation to (970) 555-0123 and email a receipt when it's done.")
    expect(happensWords({ ...a, channel: "email" })).toBe("We'll email a confirmation to andrea@example.com and email a receipt when it's done.")
    expect(happensWords({ ...a, channel: "both" })).toContain("text a confirmation to (970) 555-0123 and email one to andrea@example.com")
    expect(happensWords({ ...a, channel: "text", quote: true })).toContain("calls you at (970) 555-0123 by tomorrow")
  })
  it("lists only what the customer gave, each with a Change", () => {
    const fields = { ...initialState(), ...person, place: FIXTURE_HOME, town: "Erie" as const, access: "yes" as const, accessNote: "Gate code 4471" }
    const rows = reviewRows({ service: svc("repair"), fields, town: "Erie", zip: "80516", pick: { day: "2027-04-20", start: "10:30" }, when: "", callback: false, channel: "text", photos: 0, quote: false, go: () => {} })
    expect(rows.map((r) => r.label)).toEqual(["Service", "Where", "When", "You", "We reach you", "Access", "Note for the crew", "Price"])
    expect(rows.find((r) => r.label === "When")?.value).toEqual(["Tuesday, April 20 at 10:30 am"])
    expect(rows.find((r) => r.label === "Price")?.onChange).toBeUndefined()
  })
})
