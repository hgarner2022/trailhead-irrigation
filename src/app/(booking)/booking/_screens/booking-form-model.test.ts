import { describe, expect, it } from "vitest"
import { fixtureDayTimes } from "@/lib/booking/day-time"
import { QUOTE_SERVICES, SERVICES } from "@/lib/booking/services"
import type { PlaceSuggestion } from "@/lib/places"
import { FIXTURE_HOME, FIXTURE_PLACES } from "@/lib/places/fixture"
import { initialState } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import { NO_EXTRAS, areaState, callbackMode, canContinue, contactProblem, hasEntries, happensWords, phoneWords, priceFor, priceWords, problemList, problemsFor, reviewRows, stepsFor, stepTotal } from "./booking-form-model"

const svc = (key: string) => [...SERVICES, ...QUOTE_SERVICES].find((s) => s.key === key)!
const base = (over = {}) => ({ service: svc("repair"), fields: initialState(), picks: {}, offers: {}, when: "", ...over })
const person = { firstName: "Andrea", lastName: "Dalton", email: "andrea@example.com", phone: "(970) 555-0123", termsAccepted: true }

describe("the booking form's steps", () => {
  it("starts on the address, puts the day before contact, and gives a request the address first, contact last and no day", () => {
    expect(stepsFor(svc("repair"))).toEqual(["address", "service", "details", "day", "contact", "card", "confirm", "done"])
    expect(stepsFor(null, true)).toEqual(["address", "quote-service", "details", "contact", "done"])
    expect(stepTotal(stepsFor(svc("repair")))).toBe(7)
    expect(stepTotal(stepsFor(null, true))).toBe(4)
  })
  it("qualifies the area from the address: the city by name, then the zip, and asks for a city it cannot read", () => {
    const at = (place: PlaceSuggestion | null) => ({ ...initialState(), place })
    expect(areaState(null)).toBe("none")
    expect(areaState(FIXTURE_HOME)).toBe("ok")
    expect(areaState({ ...FIXTURE_HOME, town: "Unincorporated Weld", zip: "80516" })).toBe("ok")
    expect(areaState(FIXTURE_PLACES[9]!)).toBe("outside")
    expect(areaState({ ...FIXTURE_HOME, town: "", zip: "" })).toBe("needs-city")
    expect(canContinue("address", base({ fields: at(FIXTURE_HOME) }))).toBe(true)
    expect(canContinue("address", base({ fields: at(FIXTURE_PLACES[9]!) }))).toBe(false)
    expect(canContinue("address", base({ fields: at({ ...FIXTURE_HOME, town: "", zip: "" }) }))).toBe(false)
  })
  it("names what is missing on the address step: the pick, the street or the city, and nothing for a dead end", () => {
    const fields = initialState()
    expect(problemList("address", base({ fields }))[0]!.message).toBe("Pick your address from the list so we have it right.")
    expect(problemList("address", base({ fields, addressTyped: true }))[0]).toMatchObject({ message: "We need your street address, with the house number.", field: "[name=address]" })
    expect(problemList("address", base({ fields: { ...fields, address: "9 Cottonwood Ln" }, addressTyped: true }))[0]).toMatchObject({ message: "Add your city.", field: "[name=city]" })
    expect(problemList("address", base({ fields: { ...fields, place: { ...FIXTURE_HOME, town: "", zip: "" } } }))[0]!.field).toBe("[name=city]")
    expect(problemList("address", base({ fields: { ...fields, place: FIXTURE_PLACES[9]! } }))).toEqual([])
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
    expect(canContinue("contact", base({ fields, service: svc("lights") }))).toBe(true)
  })
  it("needs a serviceable address and, for a booking, the access answer", () => {
    const fields = { ...initialState(), place: FIXTURE_HOME, town: "Erie" as const }
    expect(canContinue("address", base({ fields }))).toBe(true)
    expect(canContinue("details", base({ fields }))).toBe(false)
    expect(canContinue("details", base({ fields: { ...fields, access: "yes" as const } }))).toBe(true)
    expect(canContinue("details", base({ fields, service: svc("lights") }))).toBe(true)
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
    expect(happensWords({ ...a, channel: "text", quote: true })).toBe("We'll use this to get back to you about your quote.")
    expect(happensWords({ ...a, channel: "text", callback: true })).toBe("We'll use (970) 555-0123 to get back to you about a day.")
  })
  it("lists only what the customer gave, each with a Change", () => {
    const fields = { ...initialState(), ...person, place: FIXTURE_HOME, town: "Erie" as const, access: "yes" as const, accessNote: "Gate code 4471" }
    const rows = reviewRows({ service: svc("repair"), fields, town: "Erie", pick: { day: "2027-04-20", start: "10:30" }, when: "", callback: false, channel: "text", photos: 0, quote: false, go: () => {} })
    expect(rows.map((r) => r.label)).toEqual(["Service", "Where", "When", "You", "We reach you", "Access", "Note for the crew", "Card", "Price"])
    expect(rows.find((r) => r.label === "When")?.value).toEqual(["Tuesday, April 20 at 10:30 am"])
    expect(rows.find((r) => r.label === "Price")?.onChange).toBeUndefined()
    expect(rows.find((r) => r.label === "Card")?.value).toBe("No card")
    expect(reviewRows({ service: svc("repair"), fields, town: "Erie", pick: { day: "2027-04-20", start: "10:30" }, when: "", callback: false, channel: "text", photos: 0, quote: false, card: "saved", go: () => {} }).find((r) => r.label === "Card")?.value).toBe("Visa ending 4242")
  })
  it("never invents a price: a service with none says it is set at the visit, and a request says nothing about money", () => {
    expect(priceFor(svc("install"), 8)).toBeNull()
    expect(priceWords(svc("install"), 8)).toBe("Price set at the visit.")
    expect(priceWords(svc("water-efficiency"), 8)).toBe("Price set at the visit.")
    expect(priceWords(svc("big-repair"), 8)).toBe("")
    expect(priceFor(svc("rachio-install"), 8)).toBe(350)
    expect(priceFor(svc("rachio-install"), 10)).toBe(420)
  })
  it("derives both lists from one catalogue and keeps what is off online out of each", () => {
    expect(SERVICES.map((s) => s.key)).toEqual(["season-pass", "spring-turn-on", "fall-blowout", "repair", "consult", "rachio-install", "water-efficiency", "install"])
    expect(QUOTE_SERVICES.map((s) => s.key)).toEqual(["big-repair", "lights"])
    expect([...SERVICES, ...QUOTE_SERVICES].some((s) => s.key === "aeration")).toBe(false)
  })
  it("lists the service-specific answers as rows and asks to confirm leaving only once something is entered", () => {
    const fields = { ...initialState(), ...person, place: FIXTURE_HOME, town: "Erie" as const, access: "yes" as const }
    const rows = reviewRows({ service: svc("water-efficiency"), fields, town: "Erie", pick: { day: "2027-04-20", start: "10:30" }, when: "", callback: false, channel: "text", photos: 0, quote: false, extras: { ...NO_EXTRAS, goals: ["Dry spots"] }, go: () => {} })
    expect(rows.find((r) => r.label === "To improve")?.value).toEqual(["Dry spots"])
    expect(hasEntries({ service: null, fields: initialState(), when: "", photos: 0 })).toBe(false)
    expect(hasEntries({ service: null, fields: { ...initialState(), address: "48" }, when: "", photos: 0 })).toBe(true)
  })
  it("lists each problem with the field it is about, in the order of the form", () => {
    const fields = { ...initialState(), firstName: "Andrea", lastName: "Dalton", email: "andrea@example.com" }
    expect(problemList("contact", base({ fields })).map((p) => p.field)).toEqual(["[name=phone]", "[data-slot=booking-terms] [role=checkbox]"])
    expect(problemList("details", base({ fields }))[0]!.field).toContain("access-choice")
  })
})
