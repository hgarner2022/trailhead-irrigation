import { describe, expect, it } from "vitest"
import { dayBeforeText, SMS_TEMPLATES } from "./texts"
import type { VisitFacts } from "@/emails/format"

const origin = "https://www.trailheadirrigation.com"
const base = { origin, firstName: "Andrea", passUrl: `${origin}/account/pass`, signInUrl: `${origin}/account/sign-in?email=andrea%40example.com` }
const visit: VisitFacts = { id: "v1", name: "spring turn-on", day: "2027-05-05", startTime: "08:00", crew: "Truck 1", who: "Ryan", location: "412 Ash St, Erie", icsUrl: `${origin}/api/visits/v1/calendar.ics?token=abc` }

describe("the day-before text", () => {
  it("names who is coming when the visit has a person", () => {
    const t = dayBeforeText({ ...base, visit })
    expect(t).toBe(`Trailhead: Ryan will be there tomorrow, Wed, May 5, 8 to 10 am, for your spring turn-on. Changes: ${origin}/account/pass Reply STOP to opt out.`)
    expect(t).not.toContain("Truck 1")
  })
  it("says we come when the visit has no person, with nothing left dangling", () => {
    const t = dayBeforeText({ ...base, visit: { ...visit, who: null, crew: null } })
    expect(t).toBe(`Trailhead: we come tomorrow, Wed, May 5, 8 to 10 am, for your spring turn-on. Changes: ${origin}/account/pass Reply STOP to opt out.`)
    expect(t).not.toMatch(/will be there|  |, ,/)
    expect(t.length).toBeLessThanOrEqual(160)
  })
  it("is the day-before template", () => {
    expect(SMS_TEMPLATES["day-before"]).toBe(dayBeforeText)
  })
})
