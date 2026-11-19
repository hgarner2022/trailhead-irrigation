import { describe, expect, it } from "vitest"
import type { SettingsChange } from "@/lib/admin/types"
import { changeWords, pendingLines } from "./change-words"

const change = (field: string, from: string, to: string): SettingsChange => ({ id: field, at: "2026-11-18T12:00:00Z", who: "Hannah", field, from, to })

describe("changeWords", () => {
  it("words the known window keys the way the Services tab names the service", () => {
    expect(changeWords(change("windows.blowout.opensOn", "2027-10-01", "2027-10-05"))).toMatchObject({ field: "Fall blowout first bookable day", from: "Oct 1", to: "Oct 5" })
    expect(changeWords(change("windows.blowout.closesOn", "2027-11-15", "2027-11-01"))).toMatchObject({ field: "Fall blowout last bookable day", from: "Nov 15", to: "Nov 1" })
    expect(changeWords(change("windows.turn-on.opensOn", "2027-05-01", "2027-04-26"))).toMatchObject({ field: "Spring turn-on first bookable day", from: "May 1", to: "Apr 26" })
    expect(changeWords(change("windows.inspection.leadWeeks", "4 weeks ahead", "3 weeks ahead"))).toMatchObject({ field: "Mid-season inspection lead time", from: "4 weeks ahead", to: "3 weeks ahead" })
  })
  it("gives an unknown raw key plain words and leaves a line already in words alone", () => {
    expect(changeWords(change("billing.dueDays", "14 days", "30 days"))).toMatchObject({ field: "Billing due days" })
    expect(changeWords(change("messages.day-before.sms.body", "a", "b"))).toMatchObject({ field: "Messages day-before sms body" })
    expect(changeWords(change("windows.mystery.opensOn", "2027-10-01", "2027-10-05"))).toMatchObject({ field: "Mystery first bookable day", from: "Oct 1" })
    for (const words of ["Ryan Garner most repairs per day", "API keys", "Fall blowout bookable from", "Tech Two name"]) {
      const c = change(words, "x", "y")
      expect(changeWords(c)).toBe(c)
    }
  })
})

describe("pendingLines", () => {
  it("lists one line per edited field, from what it was to what it is, and drops a field put back", () => {
    const lines = pendingLines([
      change("Ryan Garner most repairs per day", "4", "5"),
      change("Ryan Garner most repairs per day", "5", "6"),
      change("Tech Two name", "Tech Two", "Pat"),
      change("Tech Two name", "Pat", "Tech Two"),
    ])
    expect(lines).toEqual(["Ryan Garner most repairs per day from 4 to 6"])
  })
})
