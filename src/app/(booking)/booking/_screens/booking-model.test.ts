import { describe, expect, it } from "vitest"
import { QUOTE_SERVICES, SERVICES } from "@/lib/booking/services"
import { initialState } from "@/app/(checkout)/season-pass/checkout/_screens/checkout-state"
import { fixtureDayTimes } from "@/lib/booking/day-time"
import { canContinue, priceFor, stepsFor } from "./booking-model"

const svc = (key: string) => [...SERVICES, ...QUOTE_SERVICES].find((s) => s.key === key)!

describe("the booking steps", () => {
  it("gives a repair no zones step, a turn-on one, and a request its own short path with no day and no card", () => {
    expect(stepsFor(svc("repair"))).toEqual(["service", "address", "day", "contact", "card", "done"])
    expect(stepsFor(svc("spring-turn-on"))).toContain("zones")
    expect(stepsFor(null, true)).toEqual(["quote-service", "address", "details", "contact", "done"])
  })
  it("keeps Continue off on the day step until a time is tapped", () => {
    const offers = { visit: fixtureDayTimes(120) }
    const a = { service: svc("repair"), fields: initialState(), picks: { visit: { day: "2027-04-20", start: null } }, offers }
    expect(canContinue("day", a)).toBe(false)
    expect(canContinue("day", { ...a, picks: { visit: { day: "2027-04-20", start: "10:30" } } })).toBe(true)
    expect(canContinue("day", { ...a, offers: { visit: [] } })).toBe(true)
  })
  it("prices the turn-on by zones", () => {
    expect(priceFor(svc("spring-turn-on"), 8)).toBe(145)
    expect(priceFor(svc("spring-turn-on"), 10)).toBe(165)
    expect(priceFor(svc("repair"), 8)).toBe(145)
  })
})
