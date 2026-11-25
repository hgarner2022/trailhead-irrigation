import { describe, expect, it } from "vitest"
import { bookingEntries, visitMinutes } from "@/lib/booking/pass-entry"
import { passPlanFor } from "@/lib/booking/pass-visits"
import { CATALOGUE, bookableOf } from "@/lib/booking/services"
import { priceFor, priceWords, reviewRows, stepTotal, stepsFor, type FormStep } from "./booking-form-model"
import { bookedPassOf, passReviewRows, visitCostWords } from "./booking-pass-model"

const pass = CATALOGUE.find((s) => s.key === "season-pass")!
const noop = () => {}

describe("the steps of a Season Pass bought on a date", () => {
  const steps = (today: string) => stepsFor(pass, false, passPlanFor(today))
  const tail: FormStep[] = ["contact", "card", "confirm", "done"]
  it("asks a day for a visit that is open now or within a month and a preference for every other visit, this season's or next", () => {
    expect(steps("2027-04-14")).toEqual<FormStep[]>(["address", "service", "details", "day", "preference", ...tail])
  })
  it("asks only preferences in January and from the day the last window closes, and a day and next spring's preference from September", () => {
    const prefOnly: FormStep[] = ["address", "service", "details", "preference", ...tail]
    expect(steps("2027-01-12")).toEqual(prefOnly)
    expect(steps("2027-11-20")).toEqual(prefOnly)
    expect(steps("2027-07-14")).toEqual(prefOnly)
    expect(steps("2027-09-14")).toEqual<FormStep[]>(["address", "service", "details", "day", "preference", ...tail])
    expect(steps("2027-10-12")).toEqual<FormStep[]>(["address", "service", "details", "day", "preference", ...tail])
  })
  it("counts seven steps to confirm for a pass with only preferences, and eight with a day", () => {
    expect(stepTotal(steps("2027-01-12"))).toBe(7)
    expect(stepTotal(steps("2027-04-14"))).toBe(8)
  })
  it("has seven steps for a single visit and never gives it the pass steps", () => {
    expect(stepsFor(pass)).toEqual(["address", "service", "details", "day", "contact", "card", "confirm", "done"])
    expect(stepTotal(stepsFor(pass))).toBe(7)
  })
})

describe("what each visit of the pass costs", () => {
  it("is each visit's own price at the zone count, and the pass has no total", () => {
    expect(visitCostWords("turn-on", 8)).toBe("$145")
    expect(visitCostWords("turn-on", 10)).toBe("$165")
    expect(visitCostWords("blowout", 8)).toBe("$115")
    expect(visitCostWords("blowout", 6)).toBe("$95")
    expect(priceWords(pass, 8, passPlanFor("2027-04-14"))).toBe("")
    expect(priceFor(pass, 8, passPlanFor("2027-04-14"))).toBe(145 + 95 + 20)
  })
})

describe("the pass in the service list for a date", () => {
  const entry = (today: string) => bookingEntries(bookableOf(CATALOGUE), today).find((e) => e.kind === "pass")!
  it("lists only the visits ahead with their prices, and no opening day anywhere", () => {
    const april = entry("2027-04-14")
    expect(april.name).toBe("Season Pass 2027")
    expect(april.passVisits?.map((v) => [v.name, v.price])).toEqual([
      ["Spring turn-on", "From $145"],
      ["Fall blowout", "From $95"],
    ])
    expect(april.length).toBe("Spring turn-on and fall blowout")
    // each kind's next visit, so July holds the blowout and next spring's turn-on; the card has no total
    expect(entry("2027-07-14").passVisits?.map((v) => [v.name, v.mode])).toEqual([
      ["Fall blowout", "preference"],
      ["Spring turn-on 2028", "preference"],
    ])
    expect(entry("2027-07-14").price).toBe("")
    expect(entry("2027-11-20").name).toBe("Season Pass 2028")
    expect(JSON.stringify(bookingEntries(bookableOf(CATALOGUE), "2027-04-14"))).not.toMatch(/Opens|opens/)
  })
  it("reads each visit's own length from the catalogue", () => {
    expect(visitMinutes("turn-on")).toBe(60)
    expect(visitMinutes("blowout")).toBe(30)
  })
  it("keeps the single cards on the list all year: no card is closed", () => {
    const list = bookingEntries(bookableOf(CATALOGUE), "2027-01-14")
    expect(list.find((e) => e.key === "spring-turn-on")).toBeDefined()
    expect(list.find((e) => e.key === "fall-blowout")).toBeDefined()
  })
})

describe("what the review step and the booked card say", () => {
  const plan = passPlanFor("2027-04-14")
  const picks = { "turn-on": { day: "2027-05-04", start: "10:30" } }
  it("gives each visit its day or its preference by name, and what it costs, with no total", () => {
    const rows = passReviewRows(plan, picks, { "turn-on": "earlier", blowout: "later" }, noop, 8)
    expect(rows.find((r) => r.label === "Spring turn-on")?.value).toEqual(["Tuesday, May 4 at 10:30 am", "$145"])
    expect(rows.find((r) => r.label === "Fall blowout")?.value).toEqual(["Preference: Late season, late October", "$115"])
    expect(rows.some((r) => /Renews|Total/.test(r.label))).toBe(false)
  })
  it("names the season when the pass starts next year, and a visit that belongs to next season by its year", () => {
    expect(passReviewRows(passPlanFor("2027-11-20"), {}, {}, noop)[0]).toEqual({ label: "Season", value: "2028" })
    const july = passReviewRows(passPlanFor("2027-07-14"), {}, { "turn-on": "later" }, noop)
    expect(july.map((r) => r.label)).toEqual(["Fall blowout", "Spring turn-on 2028"])
    expect(july[1]!.value).toContain("Preference: Late season, late May")
    expect(july[0]!.value).toContain("Preference: Our recommended, mid October")
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
      { name: "Spring turn-on", when: "Tue, May 4 at 10:30 am" },
      { name: "Fall blowout", when: "Preference: Late season, late October", note: "We'll schedule it about two weeks before and tell you the day." },
    ])
    expect(booked.exact).toEqual([{ name: "Spring turn-on", day: "2027-05-04", start: "10:30" }])
  })
  it("adds the pass's rows to the booking's rows and leaves out a price row, because each visit carries its own", () => {
    const fields = { zones: 8, access: "yes", accessNote: "", firstName: "A", lastName: "D", email: "a@b.co", phone: "9705550123", place: null, address: "", town: "Erie" } as never
    const rows = reviewRows({ service: pass, fields, town: "Erie", pick: undefined, plan: passPlanFor("2027-07-14"), picks: {}, prefs: {}, when: "", callback: false, channel: "text", photos: 0, quote: false, go: noop })
    expect(rows.some((r) => r.label === "Price")).toBe(false)
    expect(rows.some((r) => r.label === "Day")).toBe(false)
    expect(rows.map((r) => r.label)).toContain("Fall blowout")
  })
})
