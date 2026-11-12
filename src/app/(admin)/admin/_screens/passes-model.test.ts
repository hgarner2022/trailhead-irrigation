import { describe, expect, it } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { chargeRows, passesContext, seasonOf, weekLabel, weekOptions } from "./passes-model"

const passes = snapshot.passes as Pass[]

describe("passesContext", () => {
  it("counts the statuses that occur and names the season", () => {
    expect(passesContext(passes)).toBe("11 active, 1 cancelled. 2027 season.")
  })

  it("names every status present, in order, and only those", () => {
    const lapsed: Pass = { ...passes[0], id: "x", status: "lapsed" }
    expect(passesContext([lapsed, ...passes])).toBe("11 active, 1 cancelled, 1 lapsed. 2027 season.")
    expect(passesContext([passes[0]])).toBe("1 active. 2027 season.")
  })

  it("reads No passes yet with none", () => {
    expect(passesContext([])).toBe("No passes yet.")
    expect(seasonOf([])).toBeUndefined()
  })

  it("reads the latest season on hand", () => {
    expect(seasonOf(passes)).toBe(2027)
    expect(seasonOf([{ ...passes[0], season: 2026 }, passes[1]])).toBe(2027)
  })
})

describe("weeks", () => {
  it("labels a week by its Monday", () => {
    expect(weekLabel("2027-10-04")).toBe("Week of Oct 4")
    expect(weekLabel("2027-10-25")).toBe("Week of Oct 25")
  })

  it("lists the weeks the passes use once each, soonest first, labelled short", () => {
    expect(weekOptions(passes)).toEqual([
      { value: "2027-10-04", label: "Oct 4" },
      { value: "2027-10-11", label: "Oct 11" },
      { value: "2027-10-18", label: "Oct 18" },
      { value: "2027-10-25", label: "Oct 25" },
    ])
    expect(weekOptions([])).toEqual([])
  })
})

describe("chargeRows", () => {
  it("reads the booked date and the charge, else the window and Not yet", () => {
    expect(chargeRows(passes[0])).toEqual([
      { kind: "turn-on", name: "Turn-on", when: "Apr 20", amount: 145, charged: "Charged Apr 20" },
      { kind: "inspection", name: "Inspection", when: "July", amount: 145, charged: "Not yet" },
      { kind: "blowout", name: "Blowout", when: "October, week of the 4th", amount: 95, charged: "Not yet" },
    ])
  })

  it("keeps a booked but uncharged visit on its date", () => {
    const pass: Pass = { ...passes[2], visits: [{ ...passes[2].visits[0], scheduledAt: "2027-04-23T15:00:00Z" }] }
    expect(chargeRows(pass)[0]).toEqual({ kind: "turn-on", name: "Turn-on", when: "Apr 23", amount: 145, charged: "Not yet" })
  })
})
