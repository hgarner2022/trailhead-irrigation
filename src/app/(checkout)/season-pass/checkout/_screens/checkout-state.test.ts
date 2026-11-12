import { describe, it, expect } from "vitest"
import type { BlowoutWeek } from "@/lib/admin/types"
import { STEPS, canContinue, initialState, reducer, toPass, type CheckoutState } from "./checkout-state"

const weeks: BlowoutWeek[] = [
  { season: 2027, weekStart: "2027-10-04", capacity: 20, taken: 2, towns: ["Erie"] },
  { season: 2027, weekStart: "2027-10-11", capacity: 20, taken: 20, towns: ["Erie"] },
  { season: 2027, weekStart: "2027-10-18", capacity: 20, taken: 3, towns: [] },
]

const filled: CheckoutState = {
  step: 1,
  address: "123 Trailhead Way",
  town: "Erie",
  zones: 8,
  weekStart: "2027-10-18",
  firstName: "Andrea",
  email: "andrea@example.com",
  phone: "(970) 555-0123",
  cardSaved: false,
}

describe("step order", () => {
  it("has six steps, address first and done last", () => {
    expect(STEPS).toHaveLength(6)
    expect(STEPS[0].key).toBe("address")
    expect(STEPS[5].key).toBe("done")
  })

  it("starts on the address step with the minimum zones", () => {
    const s = initialState()
    expect(s.step).toBe(1)
    expect(s.zones).toBe(6)
    expect(s.town).toBeNull()
    expect(s.weekStart).toBeNull()
  })

  it("takes the initial zones and prefilled fields", () => {
    const s = initialState({ zones: 10, step: 3, firstName: "Reese" })
    expect(s.zones).toBe(10)
    expect(s.step).toBe(3)
    expect(s.firstName).toBe("Reese")
  })

  it("moves forward one step at a time when the step is valid", () => {
    let s = reducer({ ...filled, step: 1 }, { type: "next", weeks })
    expect(s.step).toBe(2)
    s = reducer(s, { type: "next", weeks })
    expect(s.step).toBe(3)
    s = reducer(s, { type: "next", weeks })
    expect(s.step).toBe(4)
    s = reducer(s, { type: "next", weeks })
    expect(s.step).toBe(5)
    s = reducer(s, { type: "next", weeks })
    expect(s.step).toBe(6)
    expect(s.cardSaved).toBe(true)
    expect(reducer(s, { type: "next", weeks }).step).toBe(6)
  })

  it("stays put when the step is not valid", () => {
    const s = reducer(initialState(), { type: "next", weeks })
    expect(s.step).toBe(1)
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
  })
})

describe("canContinue", () => {
  it("address: needs a street address and a town", () => {
    expect(canContinue({ ...initialState(), address: "  ", town: "Erie" }, weeks)).toBe(false)
    expect(canContinue({ ...initialState(), address: "9 Elm St", town: null }, weeks)).toBe(false)
    expect(canContinue({ ...initialState(), address: "9 Elm St", town: "Erie" }, weeks)).toBe(true)
  })

  it("zones: needs a count between 6 and 16", () => {
    expect(canContinue({ ...filled, step: 2, zones: 5 }, weeks)).toBe(false)
    expect(canContinue({ ...filled, step: 2, zones: 17 }, weeks)).toBe(false)
    expect(canContinue({ ...filled, step: 2, zones: 6 }, weeks)).toBe(true)
    expect(canContinue({ ...filled, step: 2, zones: 16 }, weeks)).toBe(true)
  })

  it("week: needs a chosen week that still has a spot", () => {
    expect(canContinue({ ...filled, step: 3, weekStart: null }, weeks)).toBe(false)
    expect(canContinue({ ...filled, step: 3, weekStart: "2027-10-11" }, weeks)).toBe(false)
    expect(canContinue({ ...filled, step: 3, weekStart: "2027-10-25" }, weeks)).toBe(false)
    expect(canContinue({ ...filled, step: 3, weekStart: "2027-10-04" }, weeks)).toBe(true)
  })

  it("contact: needs a name, an email with an @ and a ten-digit phone", () => {
    expect(canContinue({ ...filled, step: 4, firstName: " " }, weeks)).toBe(false)
    expect(canContinue({ ...filled, step: 4, email: "andrea.example.com" }, weeks)).toBe(false)
    expect(canContinue({ ...filled, step: 4, phone: "555-0123" }, weeks)).toBe(false)
    expect(canContinue({ ...filled, step: 4, phone: "970 555 0123" }, weeks)).toBe(true)
    expect(canContinue({ ...filled, step: 4 }, weeks)).toBe(true)
  })

  it("card: continues while the chosen week still has a spot; done: never", () => {
    expect(canContinue({ ...filled, step: 5 }, weeks)).toBe(true)
    expect(canContinue({ ...filled, step: 5, weekStart: "2027-10-11" }, weeks)).toBe(false)
    expect(canContinue({ ...filled, step: 5, weekStart: null }, weeks)).toBe(false)
    expect(canContinue({ ...filled, step: 6 }, weeks)).toBe(false)
  })
})

describe("toPass", () => {
  it("builds an active pass for 6 zones at the published prices", () => {
    const pass = toPass({ ...filled, zones: 6, weekStart: "2027-10-04", step: 6, cardSaved: true }, 2027, weeks)
    expect(pass.id).toBe("p-new")
    expect(pass.number).toBe("TH-2027-NEW")
    expect(pass.status).toBe("active")
    expect(pass.firstName).toBe("Andrea")
    expect(pass.town).toBe("Erie")
    expect(pass.zones).toBe(6)
    expect(pass.blowoutWeek).toBe("2027-10-04")
    expect(pass.visits.map((v) => v.kind)).toEqual(["turn-on", "inspection", "blowout"])
    expect(pass.visits.map((v) => v.amount)).toEqual([145, 145, 95])
    expect(pass.visits.map((v) => v.window)).toEqual(["April to May", "July", "October, week of the 4th"])
    expect(pass.stripeUrl).toMatch(/^https:\/\//)
    expect(pass.jobberUrl).toMatch(/^https:\/\//)
  })

  it("adds the extra zones to each visit for 8 and 12 zones", () => {
    const eight = toPass({ ...filled, zones: 8, weekStart: "2027-10-18" }, 2027, weeks)
    expect(eight.visits.map((v) => v.amount)).toEqual([145, 145, 115])
    expect(eight.visits[2].window).toBe("October, week of the 18th")
    const twelve = toPass({ ...filled, zones: 12 }, 2027, weeks)
    expect(twelve.visits.map((v) => v.amount)).toEqual([185, 185, 155])
  })

  it("writes the ordinal for every October Monday", () => {
    for (const [day, word] of [["01", "1st"], ["02", "2nd"], ["03", "3rd"], ["11", "11th"], ["12", "12th"], ["13", "13th"], ["21", "21st"], ["22", "22nd"], ["23", "23rd"], ["31", "31st"]]) {
      const pass = toPass({ ...filled, weekStart: `2027-10-${day}` }, 2027, weeks)
      expect(pass.visits[2].window).toBe(`October, week of the ${word}`)
    }
  })
})
