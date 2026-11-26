import { describe, expect, it } from "vitest"
import { fixtureCalendarDays } from "@/lib/booking/day-time"
import { CATALOGUE, QUOTE_SERVICES, SERVICES, bookableOf, bookingCatalogue, quotableOf } from "@/lib/booking/services"
import { typedPlace, type PlaceSuggestion } from "@/lib/places"
import { FIXTURE_HOME, FIXTURE_PLACES } from "@/lib/places/fixture"
import { initialState } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import { NO_EXTRAS, areaState, callbackMode, canContinue, contactProblem, hasEntries, happensWords, phoneWords, priceFor, priceWords, problemList, problemsFor, reviewRows, stepsFor, stepTotal } from "./booking-form-model"

const svc = (key: string) => [...SERVICES, ...QUOTE_SERVICES, ...bookableOf(bookingCatalogue({ install: "bookable" }))].find((s) => s.key === key)!
const base = (over = {}) => ({ service: svc("repair"), fields: initialState(), picks: {}, offers: {}, when: "", ...over })
const person = { firstName: "Andrea", lastName: "Dalton", email: "andrea@example.com", phone: "(970) 555-0123", termsAccepted: true }

describe("the booking form's steps", () => {
  it("starts on the address, puts the day before contact, gives the details their own step after the service, and gives a request the address first, contact last and no day", () => {
    expect(stepsFor(svc("repair"))).toEqual(["address", "service", "details", "day", "contact", "card", "confirm", "done"])
    expect(stepsFor(null, true)).toEqual(["address", "quote-service", "details", "contact", "done"])
    expect(stepTotal(stepsFor(svc("repair")))).toBe(7)
    expect(stepTotal(stepsFor(null, true))).toBe(4)
  })
  it("qualifies the area from the address: the ZIP decides, and a city it cannot read is asked for", () => {
    const at = (place: PlaceSuggestion | null) => ({ ...initialState(), place })
    expect(areaState(null)).toBe("none")
    expect(areaState(FIXTURE_HOME)).toBe("ok")
    expect(areaState({ ...FIXTURE_HOME, town: "Unincorporated Weld", zip: "80516" })).toBe("ok")
    expect(areaState(FIXTURE_PLACES[9]!)).toBe("outside")
    // the city says Erie but the ZIP is not ours: the ZIP decides
    expect(areaState({ ...FIXTURE_HOME, zip: "80302" })).toBe("outside")
    expect(areaState({ ...FIXTURE_HOME, town: "", zip: "" })).toBe("needs-city")
    expect(areaState(typedPlace("9 Elm St", "Longmont", "80516"))).toBe("mismatch")
    expect(canContinue("address", base({ fields: at(FIXTURE_HOME) }))).toBe(true)
    expect(canContinue("address", base({ fields: at(FIXTURE_PLACES[9]!) }))).toBe(false)
    expect(canContinue("address", base({ fields: at(typedPlace("9 Elm St", "Longmont", "80516")) }))).toBe(false)
    expect(canContinue("address", base({ fields: at({ ...FIXTURE_HOME, town: "", zip: "" }) }))).toBe(false)
  })
  it("names what is missing on the address step: the pick, each typed field, the mismatch, and the dead end in the out-of-area words", () => {
    const fields = initialState()
    expect(problemList("address", base({ fields }))[0]!.message).toBe("Pick your address from the list.")
    expect(problemList("address", base({ fields, addressTyped: true, typed: { line1: "", city: "", zip: "" } })).map((p) => p.message)).toEqual(["We need your street address, with the house number.", "Add your city.", "Add your ZIP code."])
    expect(problemList("address", base({ fields, addressTyped: true, typed: { line1: "9 Cottonwood Ln", city: "Lafayette", zip: "800" } })).map((p) => [p.message, p.field])).toEqual([["A ZIP code is five digits.", "[name=zip]"]])
    expect(problemList("address", base({ fields: { ...fields, place: typedPlace("9 Elm St", "Longmont", "80516") } }))[0]).toMatchObject({ message: "ZIP 80516 is in Erie.", field: "[name=city]" })
    expect(problemList("address", base({ fields: { ...fields, place: { ...FIXTURE_HOME, town: "", zip: "" } } }))[0]!.field).toBe("[name=city]")
    expect(problemList("address", base({ fields: { ...fields, place: FIXTURE_PLACES[9]! } }))[0]!.message).toMatch(/^We don't serve Boulder yet\./)
  })
  it("needs a picked service on the service step and, for a booking, the access answer on Details, and names each when Continue is pressed", () => {
    const fields = { ...initialState(), place: FIXTURE_HOME, town: "Erie" as const }
    expect(canContinue("service", base({ service: null, fields }))).toBe(false)
    expect(canContinue("service", base({ fields }))).toBe(true)
    expect(problemList("service", base({ service: null, fields }))[0]).toMatchObject({ message: "Pick a service." })
    expect(problemList("quote-service", base({ service: null, fields }))[0]).toMatchObject({ message: "Pick a service." })
    expect(canContinue("details", base({ fields }))).toBe(false)
    expect(canContinue("details", base({ fields: { ...fields, access: "yes" as const } }))).toBe(true)
    expect(problemList("details", base({ fields }))[0]).toMatchObject({ message: "Tell us whether we can get to the system without you." })
    expect(canContinue("details", base({ service: svc("lights"), fields }))).toBe(true)
    expect(canContinue("quote-service", base({ service: svc("lights"), fields }))).toBe(true)
  })
  it("writes contact problems as help; the terms are agreed by pressing Continue, so there is nothing to tick and nothing blocks on them", () => {
    expect(contactProblem("phone", "")).toBe("Add your phone number.")
    expect(contactProblem("phone", "970555")).toBe("A phone number has ten digits. Check yours.")
    expect(contactProblem("phone", "(970) 555-0123")).toBeNull()
    const fields = { ...initialState(), ...person, termsAccepted: false }
    expect(canContinue("contact", base({ fields }))).toBe(true)
    expect(problemsFor("contact", base({ fields }))).toEqual([])
    expect(problemsFor("contact", base({ fields: { ...fields, phone: "" } }))).toEqual(["Phone"])
    expect(canContinue("contact", base({ fields, service: svc("lights") }))).toBe(true)
  })
  it("does not pass the day step until a time is tapped, names it, and only a calendar with no open day ends in a call", () => {
    const offers = { visit: fixtureCalendarDays(120, "2027-04-15") }
    const a = base({ offers, picks: { visit: { day: "2027-04-20", start: null } } })
    expect(canContinue("day", a)).toBe(false)
    expect(problemList("day", a)[0]).toMatchObject({ message: "Pick a time." })
    expect(canContinue("day", { ...a, picks: { visit: { day: "2027-04-20", start: "10:30" } } })).toBe(true)
    expect(callbackMode({ ...a, offers: { visit: [] } })).toBe(true)
    expect(callbackMode({ ...a, offers: { visit: [{ day: "2027-04-20", times: [] }] } })).toBe(true)
    expect(callbackMode(a)).toBe(false)
  })
})

describe("one catalogue, built on the backend rows", () => {
  it("gives every entry the backend service keys behind it, and Settings' Online value turns a service off or to a quote", () => {
    expect(CATALOGUE.find((s) => s.key === "spring-turn-on")!.serviceKeys).toEqual(["turn-on-8", "turn-on-12", "turn-on-16"])
    const off = bookingCatalogue({ repair: "off" })
    expect(bookableOf(off).some((s) => s.key === "repair")).toBe(false)
    expect([...bookableOf(off), ...quotableOf(off)].some((s) => s.key === "repair")).toBe(false)
    const quoted = bookingCatalogue({ repair: "quote" })
    expect(bookableOf(quoted).some((s) => s.key === "repair")).toBe(false)
    expect(quotableOf(quoted).find((s) => s.key === "repair")).toMatchObject({ kind: "quote", price: "" })
  })
  it("derives both lists and keeps what is off online, the free consultation among it, out of each", () => {
    expect(SERVICES.map((s) => s.key)).toEqual(["season-pass", "spring-turn-on", "fall-blowout", "inspection", "repair", "rachio-install", "water-efficiency"])
    expect(QUOTE_SERVICES.map((s) => s.key)).toEqual(["install", "big-repair", "lights"])
    expect([...SERVICES, ...QUOTE_SERVICES].some((s) => s.key === "aeration" || s.key === "consult")).toBe(false)
  })
  it("reads prices from the backend: water efficiency and drip is $145, the repair visit $145", () => {
    expect(svc("water-efficiency").price).toBe("$145")
    expect(svc("repair").price).toBe("$145")
    // the installation is quote-only in the backend, so it is on the request path; flipped to Book a day it is a design visit with no price
    expect(QUOTE_SERVICES.find((s) => s.key === "install")?.price).toBe("")
    expect(bookableOf(bookingCatalogue({ install: "bookable" })).find((s) => s.key === "install")?.price).toBe("Price set at the visit")
  })
})

describe("the price and the review words", () => {
  it("prices a turn-on from the zones by the catalogue's per-zone rule, with no new band above 12", () => {
    expect(priceFor(svc("spring-turn-on"), 6)).toBe(145)
    expect(priceFor(svc("spring-turn-on"), 8)).toBe(145)
    expect(priceFor(svc("spring-turn-on"), 10)).toBe(165)
    expect(priceFor(svc("spring-turn-on"), 12)).toBe(185)
    expect(priceFor(svc("spring-turn-on"), 20)).toBe(265)
    expect(priceFor(svc("fall-blowout"), 6)).toBe(95)
    expect(priceFor(svc("fall-blowout"), 14)).toBe(175)
    expect(priceWords(svc("spring-turn-on"), 10)).toBe("$165")
    expect(priceWords(svc("repair"), 6)).toBe("$145")
  })
  it("sizes the start times to the zone count where the catalogue's length depends on it", () => {
    expect(svc("spring-turn-on").minutesFor?.(8)).toBe(60)
    expect(svc("spring-turn-on").minutesFor?.(12)).toBe(90)
    expect(svc("spring-turn-on").minutesFor?.(20)).toBe(120)
  })
  it("never invents a price: a service with none says it is set at the visit, and a request says nothing about money", () => {
    const install = bookableOf(bookingCatalogue({ install: "bookable" })).find((s) => s.key === "install")!
    expect(priceFor(install, 8)).toBeNull()
    expect(priceWords(install, 8)).toBe("Price set at the visit")
    expect(priceWords(svc("big-repair"), 8)).toBe("")
    expect(priceFor(svc("rachio-install"), 8)).toBe(350)
    expect(priceFor(svc("rachio-install"), 10)).toBe(420)
  })
  it("says exactly what happens, by how the customer asked to be reached, and says it once", () => {
    const a = { phone: "9705550123", email: "andrea@example.com", quote: false, callback: false }
    expect(phoneWords("9705550123")).toBe("(970) 555-0123")
    expect(happensWords({ ...a, channel: "text" })).toBe("We'll text a confirmation to (970) 555-0123.")
    expect(happensWords({ ...a, channel: "email" })).toBe("We'll email a confirmation to andrea@example.com.")
    expect(happensWords({ ...a, channel: "both" })).toBe("We'll text and email a confirmation.")
    expect(happensWords({ ...a, channel: "text", quote: true })).toBe("We'll use this to get back to you about your quote.")
    expect(happensWords({ ...a, channel: "text", callback: true })).toBe("We'll use (970) 555-0123 to get back to you about a day.")
    expect(happensWords({ ...a, channel: "text", pass: true })).toBe("We schedule your visits every season, so you never have to remember. We'll text a confirmation to (970) 555-0123.")
  })
  it("lists only what the customer gave, each with a Change", () => {
    const fields = { ...initialState(), ...person, place: FIXTURE_HOME, town: "Erie" as const, access: "yes" as const, accessNote: "Gate code 4471" }
    const rows = reviewRows({ service: svc("repair"), fields, town: "Erie", pick: { day: "2027-04-20", start: "10:30" }, when: "", callback: false, channel: "text", photos: 0, quote: false, go: () => {} })
    expect(rows.map((r) => r.label)).toEqual(["Service", "Address", "Day", "Contact", "Access", "Note", "Card", "Price"])
    expect(rows.find((r) => r.label === "Day")?.value).toEqual(["Tuesday, April 20 at 10:30 am"])
    expect(rows.find((r) => r.label === "Contact")?.value).toEqual(["Andrea Dalton", "(970) 555-0123", "andrea@example.com", "By text"])
    expect(rows.find((r) => r.label === "Price")?.onChange).toBeUndefined()
    expect(rows.find((r) => r.label === "Card")?.value).toBe("No card")
    expect(reviewRows({ service: svc("repair"), fields, town: "Erie", pick: { day: "2027-04-20", start: "10:30" }, when: "", callback: false, channel: "text", photos: 0, quote: false, card: "saved", go: () => {} }).find((r) => r.label === "Card")?.value).toBe("Visa ending 4242")
  })
  it("marks the address On file or New and names the card on file, with nothing personal in either", () => {
    const fields = { ...initialState(), ...person, place: FIXTURE_HOME, town: "Erie" as const, access: "yes" as const }
    const base = { service: svc("repair"), fields, town: "Erie", pick: { day: "2027-04-20", start: "10:30" }, when: "", callback: false, channel: "text" as const, photos: 0, quote: false, go: () => {} }
    expect(reviewRows(base).find((r) => r.label === "Address")?.value).toEqual(["123 Trailhead Way", "Erie, CO 80516", "New"])
    const on = reviewRows({ ...base, onFile: true, card: "file", cardOnFile: "Visa ending 4242" })
    expect(on.find((r) => r.label === "Address")?.value).toEqual(["123 Trailhead Way", "Erie, CO 80516", "On file"])
    expect(on.find((r) => r.label === "Card")?.value).toBe("Visa ending 4242")
    // a card on file that is no longer offered reads as no card
    expect(reviewRows({ ...base, onFile: true, card: "file", cardOnFile: null }).find((r) => r.label === "Card")?.value).toBe("No card")
  })
  it("sends a Change on a service answer back to the service step, where those answers now live", () => {
    const seen: string[] = []
    const fields = { ...initialState(), ...person, place: FIXTURE_HOME, town: "Erie" as const, access: "yes" as const, accessNote: "Gate" }
    reviewRows({ service: svc("repair"), fields, town: "Erie", pick: undefined, when: "", callback: false, channel: "text", photos: 2, quote: false, go: (s) => seen.push(s) }).forEach((r) => r.onChange?.())
    expect(seen).toEqual(["service", "address", "contact", "details", "details", "details", "card"])
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
    expect(problemList("contact", base({ fields })).map((p) => p.field)).toEqual(["[name=phone]"])
  })
})
