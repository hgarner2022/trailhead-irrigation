import { describe, expect, it } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { chargeRows, consentLine, passesContext, seasonOf } from "./passes-model"

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

describe("consentLine", () => {
  it("reads the terms version and day, then the marketing channels in plain words", () => {
    expect(consentLine(passes[0].consent)).toBe("Terms 2026-11 accepted Nov 2. Marketing: email and text.")
    expect(consentLine(passes[1].consent)).toBe("Terms 2026-11 accepted Nov 3. Marketing: email.")
    expect(consentLine(passes[2].consent)).toBe("Terms 2026-11 accepted Nov 4. Marketing: no.")
  })

  it("reads a marketing-only record and a missing one", () => {
    expect(consentLine({ marketingOptIn: true, marketingChannels: ["sms"], source: "form", recordedAt: "2026-11-12T20:00:00Z" })).toBe("Marketing: text.")
    expect(consentLine({ marketingOptIn: false, marketingChannels: [], source: "admin", recordedAt: "2026-11-12T20:00:00Z" })).toBe("Marketing: no.")
    expect(consentLine(undefined)).toBe("No consent recorded.")
  })

  it("reads a late-evening acceptance as its Denver day", () => {
    // 03:00Z on November 13 is 8 pm on November 12 in Denver.
    expect(consentLine({ ...passes[0].consent!, termsAcceptedAt: "2026-11-13T03:00:00Z" })).toBe("Terms 2026-11 accepted Nov 12. Marketing: email and text.")
  })
})

describe("chargeRows", () => {
  it("reads the booked date and the charge, else the window and Not yet", () => {
    expect(chargeRows(passes[0])).toEqual([
      { kind: "turn-on", name: "Turn-on", when: "May 3", amount: 145, charged: "Charged May 3" },
      { kind: "inspection", name: "Inspection", when: "July", amount: 145, charged: "Not yet" },
      { kind: "blowout", name: "Blowout", when: "October", amount: 95, charged: "Not yet" },
    ])
  })

  it("reads a 7 pm Denver booking and charge as that Denver day", () => {
    // 01:00 UTC on July 9 is 7 pm on July 8 in Denver.
    const pass: Pass = { ...passes[2], visits: [{ ...passes[2].visits[1], scheduledAt: "2027-07-09T01:00:00Z", chargedAt: "2027-07-09T01:30:00Z" }] }
    expect(chargeRows(pass)[0]).toEqual({ kind: "inspection", name: "Inspection", when: "Jul 8", amount: 145, charged: "Charged Jul 8" })
  })

  it("keeps a booked but uncharged visit on its date", () => {
    const pass: Pass = { ...passes[2], visits: [{ ...passes[2].visits[0], scheduledAt: "2027-04-23T15:00:00Z" }] }
    expect(chargeRows(pass)[0]).toEqual({ kind: "turn-on", name: "Turn-on", when: "Apr 23", amount: 145, charged: "Not yet" })
  })
})
