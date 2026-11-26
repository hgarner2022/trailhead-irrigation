import { describe, expect, it } from "vitest"
import { fillTemplate, defaultBody } from "@/emails/editable"
import { moveMessage } from "./schedule-message"
import { windowLines } from "./schedule-window"

const visit = { id: "v1", service: "Spring turn-on", day: "2026-11-26", start: 9 * 60, title: "Briggs St", town: "Erie" as const }

describe("the Notify text is the product's date-moved text", () => {
  it("says the saved words through fillTemplate, then the signed link line, and no opt-out (the dialog adds it on a first text)", () => {
    const text = moveMessage(visit, { customer: "Andrea Dalton", personName: "Ryan Garner" })
    const middle = fillTemplate(defaultBody("date-moved", "sms"), { service: "spring turn-on", day: "Thu, Nov 26", time: "9:00 am", who: "Ryan", address: "Briggs St" })
    expect(text.startsWith(`Trailhead: ${middle} Doesn't work? Pick another day: https://`)).toBe(true)
    expect(text).toContain("your spring turn-on moved to Thu, Nov 26 at 9:00 am.")
    expect(text).not.toContain("Reply STOP")
  })
  it("a day with no time says the day alone", () => {
    expect(moveMessage({ ...visit, start: null }, { customer: "Andrea Dalton" })).toContain("moved to Thu, Nov 26.")
  })
  it("a move that kept the day and gave a new time says so as the product does", () => {
    expect(moveMessage({ ...visit, start: 9 * 60 + 30 }, { customer: "Andrea Dalton", was: { day: "2026-11-26", start: 9 * 60 } })).toContain("your spring turn-on is still Thu, Nov 26, now at 9:30 am.")
  })
})

describe("the customer's 24-hour window", () => {
  it("is said for a day inside it, in the visit panel's own words, and for neither when both are outside", () => {
    expect(windowLines("2026-11-18", { old: "2026-11-19", next: "2026-11-21" })).toEqual(["Thu, Nov 19: Closed, texts only"])
    expect(windowLines("2026-11-18", { old: "2026-11-24", next: "2026-11-25" })).toEqual([])
    expect(windowLines("2026-11-18", { next: "2026-11-18" })).toEqual(["Wed, Nov 18: Closed, texts only"])
    expect(windowLines("2026-11-18", { old: "2026-11-19", next: "2026-11-19" })).toHaveLength(1)
  })
})
