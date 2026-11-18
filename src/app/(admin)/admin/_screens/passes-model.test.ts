import { describe, expect, it } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { cardWords, chargeRows, consentLine, jobRows, passName, passesContext, seasonCharges, seasonFacts, seasonOf, seasonVisits, visitWhen } from "./passes-model"

const passes = snapshot.passes as Pass[]
const TODAY = "2026-11-12T19:56:30Z"

describe("passesContext", () => {
  it("counts the statuses that occur and names the season", () => {
    expect(passesContext(passes)).toBe("11 active, 1 pending, 1 canceled. 2027 season.")
  })

  it("names every status present, in order, and only those", () => {
    const lapsed: Pass = { ...passes[0], id: "x", status: "lapsed" }
    expect(passesContext([lapsed, ...passes])).toBe("11 active, 1 pending, 1 canceled, 1 expired. 2027 season.")
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
  it("reads the booked day and the charge, else Unscheduled and blank", () => {
    expect(chargeRows(passes[0])).toEqual([
      { kind: "turn-on", name: "Turn-on", when: "May 3", amount: 145, charged: "Paid May 3" },
      { kind: "inspection", name: "Inspection", when: "Unscheduled", amount: 145, charged: "" },
      { kind: "blowout", name: "Blowout", when: "Unscheduled", amount: 95, charged: "" },
    ])
  })

  it("reads a 7 pm Denver booking and charge as that Denver day", () => {
    // 01:00 UTC on July 9 is 7 pm on July 8 in Denver.
    const pass: Pass = { ...passes[2], visits: [{ ...passes[2].visits[1], scheduledAt: "2027-07-09T01:00:00Z", payments: [{ id: "pay-1", amount: 145, method: "card_on_file", status: "succeeded", paidOn: "2027-07-08" }] }] }
    expect(chargeRows(pass)[0]).toEqual({ kind: "inspection", name: "Inspection", when: "Jul 8", amount: 145, charged: "Paid Jul 8" })
  })

  it("keeps a booked but uncharged visit on its date", () => {
    const pass: Pass = { ...passes[2], visits: [{ ...passes[2].visits[0], scheduledAt: "2027-04-23T15:00:00Z" }] }
    expect(chargeRows(pass)[0]).toEqual({ kind: "turn-on", name: "Turn-on", when: "Apr 23", amount: 145, charged: "" })
  })
})

describe("one source: the day on the table, the panel's charges and its jobs", () => {
  // Neil's turn-on has a day and a window; the table said "Mid May" while the panel's charges said "Apr 26".
  const dated: Pass = { ...passes[2], visits: [{ ...passes[2].visits[0], scheduledOn: "2027-04-26", scheduledAt: "2027-04-26T14:00:00Z", startTime: "08:00" }, ...passes[2].visits.slice(1)] }

  it("reads the day, and the window once a start time is set, from the visit row", () => {
    expect(visitWhen(dated.visits[0])).toBe("Apr 26, 8 to 10 am")
    expect(visitWhen({ ...dated.visits[0], startTime: undefined })).toBe("Apr 26")
    expect(visitWhen(dated.visits[1])).toBe("Unscheduled")
    expect(visitWhen(undefined)).toBe("Unscheduled")
  })

  it("shows the same words in the charges, the jobs and the table cell", () => {
    expect(chargeRows(dated)[0].when).toBe(jobRows(dated, TODAY)[0].when)
    expect(jobRows(dated, TODAY)[0].when).toBe("Apr 26, 8 to 10 am")
  })

  it("never shows a timing preference: a pass asking for early May still reads Unscheduled", () => {
    expect(passes[2].turnOnPreference).toBe("earlier")
    expect(jobRows(passes[2], TODAY)[0].when).toBe("Unscheduled")
    expect(chargeRows(passes[2])[0].when).toBe("Unscheduled")
  })
})

describe("jobRows", () => {
  it("reads each visit's state from the one derivation", () => {
    expect(jobRows(passes[0], TODAY).map((r) => [r.name, r.job.state, r.job.notClosed])).toEqual([
      ["Turn-on", "charged", false],
      ["Inspection", "needs-a-day", false],
      ["Blowout", "needs-a-day", false],
    ])
  })

  it("flags a visit whose day has passed and was not marked done, and a done visit whose card failed", () => {
    const late: Pass = { ...passes[2], cardFailedAt: "2026-11-10T15:00:00Z", visits: [{ ...passes[2].visits[0], scheduledOn: "2026-11-05", scheduledAt: "2026-11-05T16:00:00Z" }, { ...passes[2].visits[1], completedAt: "2026-11-06T17:00:00Z" }, passes[2].visits[2]] }
    const [turnOn, inspection] = jobRows(late, TODAY)
    expect(turnOn.job).toMatchObject({ state: "scheduled", notClosed: true })
    expect(inspection.job).toMatchObject({ state: "charge-failed", notClosed: false })
  })

  it("names a pending pass's visits like any other, so the panel can say they are an unpaid attempt", () => {
    const pending = passes.find((p) => p.status === "pending")!
    expect(pending.status).toBe("pending")
    expect(jobRows(pending, TODAY)).toHaveLength(2)
  })
})

describe("passName", () => {
  it("is the full name where a last name is on record, else the first name", () => {
    expect(passName({ firstName: "Andrea", lastName: "Dalton" })).toBe("Andrea Dalton")
    expect(passName({ firstName: "Andrea" })).toBe("Andrea")
    expect(passName({ firstName: " Andrea ", lastName: " " })).toBe("Andrea")
  })
})

describe("cardWords", () => {
  it("names the card on file, says to collect at the visit on an active pass with none, and only No card yet on a pending one", () => {
    expect(cardWords({ status: "active", cardLast4: "4242", cardExpires: "2028-08" })).toBe("Card ending 4242, expires 08/28")
    expect(cardWords({ status: "active", cardLast4: "4242" })).toBe("Card ending 4242")
    expect(cardWords({ status: "active" })).toBe("No card yet, collect at the visit")
    expect(cardWords({ status: "pending" })).toBe("No card yet")
  })
})

describe("the season view's rows", () => {
  it("lists the facts beside the card, with the access note and the money only when asked for", () => {
    const pass = { ...passes[0]!, accessNote: "Dog loose", status: "active" as const }
    expect(seasonFacts(pass).map(([k]) => k)).toEqual(["Town", "Zones", "Access", "Status"])
    expect(seasonFacts(pass, "$145 unpaid").at(-1)).toEqual(["Money", "$145 unpaid"])
    expect(seasonFacts(pass, undefined, false).map(([k]) => k)).toEqual(["Town", "Zones", "Status"])
  })

  it("lists one row per visit with its day, then who has it, and its two pills", () => {
    const pass: Pass = { ...passes[0]!, visits: passes[0]!.visits.map((v, i) => ({ ...v, id: `v${i}`, ...(v.kind === "turn-on" ? { personName: "Ryan Garner" } : {}) })) }
    const rows = seasonVisits(pass, TODAY)
    expect(rows).toHaveLength(pass.visits.length)
    expect(rows[0]).toMatchObject({ name: "Turn-on", id: "v0" })
    expect(rows[0]!.detail).toContain("Ryan Garner")
    expect(rows.find((r) => r.job.state === "needs-a-day")?.detail).toBeUndefined()
  })

  it("writes the charges as dollars and the day paid", () => {
    const rows = seasonCharges(passes[0]!)
    expect(rows.map((r) => r.name)).toEqual(chargeRows(passes[0]!).map((r) => r.name))
    expect(rows[0]!.amount).toMatch(/^\$\d/)
  })
})
