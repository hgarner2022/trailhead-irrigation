import { describe, expect, it } from "vitest"
import { bookingEntries, visitMinutes } from "@/lib/booking/pass-entry"
import { passPlanFor } from "@/lib/booking/pass-visits"
import { CATALOGUE } from "@/lib/booking/services"
import { priceFor, priceWords, reviewRows, stepsFor, type FormStep } from "./booking-form-model"
import { bookedPassOf, passReviewRows } from "./booking-pass-model"

const pass = CATALOGUE.find((s) => s.key === "season-pass")!
const noop = () => {}

describe("the steps of a Season Pass bought on a date", () => {
  const steps = (today: string) => stepsFor(pass, false, passPlanFor(today))
  it("asks a day for a visit that is open now and a preference for one that is months away", () => {
    expect(steps("2027-04-14")).toEqual<FormStep[]>(["address", "service", "details", "day", "preference", "contact", "agreement", "confirm", "done"])
  })
  it("asks only preferences in January and from November, and only a day in October", () => {
    const prefOnly: FormStep[] = ["address", "service", "details", "preference", "contact", "agreement", "confirm", "done"]
    expect(steps("2027-01-12")).toEqual(prefOnly)
    expect(steps("2027-11-09")).toEqual(prefOnly)
    expect(steps("2027-10-12")).toEqual<FormStep[]>(["address", "service", "details", "day", "contact", "agreement", "confirm", "done"])
  })
  it("keeps the old steps with no plan, and a single visit never gets the pass steps", () => {
    expect(stepsFor(pass)).toEqual(["address", "service", "details", "day", "contact", "confirm", "done"])
  })
})

describe("the price of what is on the pass", () => {
  it("is the total only for the visits still ahead", () => {
    expect(priceFor(pass, 8, passPlanFor("2027-04-14"))).toBe(260)
    expect(priceFor(pass, 8, passPlanFor("2027-07-14"))).toBe(95 + 20)
    expect(priceFor(pass, 10, passPlanFor("2027-04-14"))).toBe(145 + 20 + 95 + 40)
    expect(priceWords(pass, 8, passPlanFor("2027-07-14"))).toBe("About $115 for the season, charged after each visit.")
  })
})

describe("the pass in the service list for a date", () => {
  const entry = (today: string) => bookingEntries(CATALOGUE.filter((s) => s.online === "bookable"), today).find((e) => e.kind === "pass")!
  it("lists only the visits ahead with their lengths, prices and opening days", () => {
    const april = entry("2027-04-14")
    expect(april.name).toBe("Season Pass 2027")
    expect(april.passVisits?.map((v) => [v.name, v.length, v.price, v.opens])).toEqual([
      ["Spring turn-on", "About 1 hour", "From $145", "Apr 25"],
      ["Fall blowout", "About 30 minutes", "From $95", "Oct 1"],
    ])
    expect(entry("2027-07-14").passVisits?.map((v) => v.name)).toEqual(["Fall blowout"])
    expect(entry("2027-07-14").price).toBe("From $95")
    expect(entry("2027-11-09").name).toBe("Season Pass 2028")
  })
  it("leaves out the opening day of a visit whose window is open", () => {
    expect(entry("2027-05-14").passVisits?.[0]).not.toHaveProperty("opens")
  })
  it("reads each visit's own length from the catalogue", () => {
    expect(visitMinutes("turn-on")).toBe(60)
    expect(visitMinutes("blowout")).toBe(30)
  })
  it("opens the single cards by the same windows", () => {
    const list = bookingEntries(CATALOGUE.filter((s) => s.online === "bookable"), "2027-05-14")
    expect(list.find((e) => e.key === "spring-turn-on")?.opens).toBeUndefined()
    expect(list.find((e) => e.key === "fall-blowout")?.opens).toBe("Oct 1")
  })
})

describe("what the confirm step and the booked card say", () => {
  const plan = passPlanFor("2027-04-14")
  const picks = { "turn-on": { day: "2027-04-29", start: "10:30" } }
  it("gives each visit its exact day and time or its preference and when it is scheduled", () => {
    const rows = passReviewRows(plan, picks, { blowout: "earlier" }, noop)
    expect(rows.find((r) => r.label === "Spring turn-on")?.value).toBe("Thursday, April 29 at 10:30 am")
    expect(rows.find((r) => r.label === "Fall blowout")?.value).toBe("Preference: Early October. We'll schedule it about two weeks before and tell you the day.")
    expect(rows.find((r) => r.label === "Renews")?.value).toBe("Auto-renews each season until you cancel.")
  })
  it("names the season when the pass starts next year", () => {
    const rows = passReviewRows(passPlanFor("2027-11-09"), {}, {}, noop)
    expect(rows[0]).toEqual({ label: "Season", value: "2028" })
  })
  it("sends the Change link to the step that asked", () => {
    const seen: string[] = []
    const rows = passReviewRows(plan, picks, {}, (s) => seen.push(s))
    rows.forEach((r) => r.onChange?.())
    expect(seen).toEqual(["day", "preference", "agreement"])
  })
  it("puts every visit on the card, and only the visits with a day in the reminders", () => {
    const booked = bookedPassOf("Season Pass 2027", plan, picks, { blowout: "later" })
    expect(booked.lines).toEqual([
      { name: "Spring turn-on", when: "Thu, Apr 29 at 10:30 am" },
      { name: "Fall blowout", when: "Preference: Late October", note: "We'll schedule it about two weeks before and tell you the day." },
    ])
    expect(booked.exact).toEqual([{ name: "Spring turn-on", day: "2027-04-29", start: "10:30" }])
  })
  it("adds the pass's rows to the booking's rows, with the price for what is on it", () => {
    const fields = { zones: 8, access: "yes", accessNote: "", firstName: "A", lastName: "D", email: "a@b.co", phone: "9705550123", place: null, address: "", town: "Erie" } as never
    const rows = reviewRows({ service: pass, fields, town: "Erie", pick: undefined, plan: passPlanFor("2027-07-14"), picks: {}, prefs: {}, when: "", callback: false, channel: "text", photos: 0, quote: false, go: noop })
    expect(rows.find((r) => r.label === "Price")?.value).toBe("About $115 for the season, charged after each visit.")
    expect(rows.some((r) => r.label === "When")).toBe(false)
    expect(rows.map((r) => r.label)).toContain("Fall blowout")
  })
})
