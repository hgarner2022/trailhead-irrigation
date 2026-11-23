import { describe, expect, it } from "vitest"
import { SERVICE_LIST, serviceCost } from "@/lib/services"
import { CATALOGUE, OFFICE_ONLY, SERVICES, QUOTE_SERVICES, bookableOf, bookingCatalogue, onlineOfRow, quotableOf } from "./services"

// One catalogue (Hannah, Nov 22 2026): the form reads the backend rows and Settings > Services' Online value (Book a day, We quote, Off), and nothing else decides what is offered.
describe("the booking catalogue is the backend catalogue", () => {
  it("has an entry for every backend service except the ones the office makes itself", () => {
    const named = new Set(CATALOGUE.flatMap((e) => e.serviceKeys))
    const missing = SERVICE_LIST.filter((s) => !named.has(s.key)).map((s) => s.key)
    expect(missing.sort()).toEqual([...OFFICE_ONLY].sort())
  })
  it("offers what the rows say Book a day, and quotes what they say We quote", () => {
    for (const e of CATALOGUE.filter((c) => c.kind !== "pass")) {
      const rows = SERVICE_LIST.filter((s) => e.serviceKeys.includes(s.key))
      expect(e.online).toBe(onlineOfRow({ bookable: rows.some((r) => r.bookable), quoteOnly: rows.some((r) => r.quoteOnly) }))
    }
    expect(SERVICES.map((e) => e.key)).toEqual(["season-pass", "spring-turn-on", "fall-blowout", "inspection", "repair", "rachio-install", "water-efficiency"])
    expect(QUOTE_SERVICES.map((e) => e.key)).toEqual(["install", "big-repair", "lights"])
  })
  it("has no free consultation, and the water efficiency visit is $145", () => {
    expect([...SERVICES, ...QUOTE_SERVICES].some((e) => /consult|free/i.test(`${e.name} ${e.price}`))).toBe(false)
    const water = SERVICES.find((e) => e.key === "water-efficiency")!
    expect(water.price).toBe("$145")
    expect(water.amount).toBe(145)
  })
  it("follows Settings: a service turned Off is in neither list, We quote moves it to the request list, Book a day puts it in the booking list", () => {
    const off = bookingCatalogue({ repair: "off" })
    expect(bookableOf(off).some((e) => e.key === "repair")).toBe(false)
    expect(quotableOf(off).some((e) => e.key === "repair")).toBe(false)
    expect(quotableOf(bookingCatalogue({ repair: "quote" })).some((e) => e.key === "repair")).toBe(true)
    expect(bookableOf(bookingCatalogue({ aeration: "bookable" })).some((e) => e.key === "aeration")).toBe(true)
  })
  it("prices the turn-on and the blowout by the catalogue's own per-zone rule, the same per-zone price beyond 12", () => {
    const turnOn = SERVICES.find((e) => e.key === "spring-turn-on")!
    const amount = turnOn.amount as (z: number) => number
    const rows = SERVICE_LIST.filter((s) => turnOn.serviceKeys.includes(s.key))
    for (const z of [6, 8, 12, 13, 16]) expect(amount(z)).toBe(serviceCost(rows.find((r) => z >= r.minZones! && z <= r.maxZones!)!, z))
    // above the largest band the last band's rule still applies: each zone past the included ones costs the same
    expect(amount(20) - amount(19)).toBe(amount(13) - amount(12))
  })
})
