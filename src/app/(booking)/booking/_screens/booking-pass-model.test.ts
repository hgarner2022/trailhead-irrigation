import { describe, expect, it } from "vitest"
import { bookingEntries, visitMinutes } from "@/lib/booking/pass-entry"
import { passPlanFor } from "@/lib/booking/pass-visits"
import { CATALOGUE } from "@/lib/booking/services"
import { priceFor, priceWords, reviewRows, stepTotal, stepsFor, type FormStep } from "./booking-form-model"
import { bookedPassOf, passReviewRows, visitCostWords } from "./booking-pass-model"

const pass = CATALOGUE.find((s) => s.key === "season-pass")!
const noop = () => {}

describe("the steps of a Season Pass bought on a date", () => {
  const steps = (today: string) => stepsFor(pass, false, passPlanFor(today))
  const tail: FormStep[] = ["pass", "contact", "card", "confirm", "done"]
  it("asks a day for a visit that is open now and a preference for every other visit, this season's or next", () => {
    expect(steps("2027-04-14")).toEqual<FormStep[]>(["address", "service", "details", "day", "preference", ...tail])
  })
  it("asks only preferences in January and from November, and a day and next spring's preference in October", () => {
    const prefOnly: FormStep[] = ["address", "service", "details", "preference", ...tail]
    expect(steps("2027-01-12")).toEqual(prefOnly)
    expect(steps("2027-11-09")).toEqual(prefOnly)
    expect(steps("2027-07-14")).toEqual(prefOnly)
    expect(steps("2027-10-12")).toEqual<FormStep[]>(["address", "service", "details", "day", "preference", ...tail])
  })
  it("counts seven steps to confirm for a pass with only preferences, and eight with a day", () => {
    expect(stepTotal(steps("2027-01-12"))).toBe(8)
    expect(stepTotal(steps("2027-04-14"))).toBe(9)
  })
  it("keeps the old steps with no plan, and a single visit never gets the pass steps", () => {
    expect(stepsFor(pass)).toEqual(["address", "service", "details", "day", "contact", "card", "confirm", "done"])
  })
})

describe("what each visit of the pass costs", () => {
  it("is each visit's own price at the zone count, charged after the visit, and the pass has no total", () => {
    expect(visitCostWords("turn-on", 8)).toBe("About $145, charged after the visit.")
    expect(visitCostWords("turn-on", 10)).toBe("About $165, charged after the visit.")
    expect(visitCostWords("blowout", 8)).toBe("About $115, charged after the visit.")
    expect(visitCostWords("blowout", 6)).toBe("About $95, charged after the visit.")
    expect(priceWords(pass, 8, passPlanFor("2027-04-14"))).toBe("")
    expect(priceFor(pass, 8, passPlanFor("2027-04-14"))).toBe(145 + 95 + 20)
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
    // each kind's next visit, so July holds the blowout and next spring's turn-on; the card has no total
    expect(entry("2027-07-14").passVisits?.map((v) => [v.name, v.opens])).toEqual([
      ["Fall blowout", "Oct 1"],
      ["Spring turn-on", "Apr 25, 2028"],
    ])
    expect(entry("2027-07-14").price).toBe("")
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
  it("gives each visit its day or its preference, what it costs and that it is charged after the visit, with no total", () => {
    const rows = passReviewRows(plan, picks, { "turn-on": "earlier", blowout: "earlier" }, noop, 8)
    expect(rows.find((r) => r.label === "Spring turn-on")?.value).toEqual(["Thursday, April 29 at 10:30 am", "Next season: Early May", "About $145, charged after the visit."])
    expect(rows.find((r) => r.label === "Fall blowout")?.value).toEqual(["Preference: Early October", "We'll schedule it about two weeks before and tell you the day.", "About $115, charged after the visit."])
    expect(rows.some((r) => /Renews|Total/.test(r.label))).toBe(false)
  })
  it("names the season when the pass starts next year, and a visit that belongs to next season by its year", () => {
    expect(passReviewRows(passPlanFor("2027-11-09"), {}, {}, noop)[0]).toEqual({ label: "Season", value: "2028" })
    const july = passReviewRows(passPlanFor("2027-07-14"), {}, { "turn-on": "later" }, noop)
    expect(july.map((r) => r.label)).toEqual(["Fall blowout", "Spring turn-on 2028"])
    expect(july[1]!.value).toContain("Preference: Late May")
  })
  it("sends the Change link to the step that asked", () => {
    const seen: string[] = []
    const rows = passReviewRows(plan, picks, {}, (s) => seen.push(s))
    rows.forEach((r) => r.onChange?.())
    expect(seen).toEqual(["day", "preference"])
  })
  it("puts every visit on the card, and only the visits with a day in the reminders", () => {
    const booked = bookedPassOf("Season Pass 2027", plan, picks, { blowout: "later" })
    expect(booked.lines).toEqual([
      { name: "Spring turn-on", when: "Thu, Apr 29 at 10:30 am" },
      { name: "Fall blowout", when: "Preference: Late October", note: "We'll schedule it about two weeks before and tell you the day." },
    ])
    expect(booked.exact).toEqual([{ name: "Spring turn-on", day: "2027-04-29", start: "10:30" }])
  })
  it("adds the pass's rows to the booking's rows and leaves out a price row, because each visit carries its own", () => {
    const fields = { zones: 8, access: "yes", accessNote: "", firstName: "A", lastName: "D", email: "a@b.co", phone: "9705550123", place: null, address: "", town: "Erie" } as never
    const rows = reviewRows({ service: pass, fields, town: "Erie", pick: undefined, plan: passPlanFor("2027-07-14"), picks: {}, prefs: {}, when: "", callback: false, channel: "text", photos: 0, quote: false, go: noop })
    expect(rows.some((r) => r.label === "Price")).toBe(false)
    expect(rows.some((r) => r.label === "When")).toBe(false)
    expect(rows.map((r) => r.label)).toContain("Fall blowout")
  })
})
