import { describe, it, expect } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { aprilPass, januaryPass } from "../../_screens/pass-purchase-fixtures"
import { bookedWhen, cardAction, cardLine, earlierSeasons, expiry, passHeadline, seasonCaption, seasonSummary, visitLineInfo, visitRows, visitStatus } from "./pass-page-model"

// passes[0] is Andrea in Erie: turn-on done May 3, inspection in July, blowout preferred for mid October.
// passes[2] has no visit yet, with the turn-on preferred earlier.
const pass = snapshot.passes[0] as Pass
const fresh = snapshot.passes[2] as Pass
/** A charged visit carries one succeeded card payment, the way a real charge leaves it. */
const paid = (v: { amount: number }, paidOn: string) => ({ payments: [{ id: `pay-${paidOn}`, amount: v.amount, method: "card_on_file", status: "succeeded", paidOn }] })
const scheduled: Pass = { ...pass, visits: pass.visits.map((v) => (v.kind === "inspection" ? { ...v, scheduledAt: "2027-07-13T15:00:00Z" } : v)) }
const allDone: Pass = {
  ...pass,
  visits: pass.visits.map((v, i) => ({ ...v, completedAt: ["2027-05-03T17:10:00Z", "2027-07-13T16:05:00Z", "2027-10-05T16:40:00Z"][i] })),
}

describe("visit rows", () => {
  it("names each visit and reads its state from the dates", () => {
    // The admin's job states, from the one derivation: a charged turn-on, then two jobs that need a day.
    expect(pass.visits.map(visitStatus)).toEqual(["charged", "needs-a-day", "needs-a-day"])
    expect(visitRows(pass)).toEqual([
      { kind: "turn-on", name: "Spring turn-on", when: "May 3", status: "charged", label: "Done" },
      { kind: "inspection", name: "Mid-season inspection", when: "July", status: "needs-a-day", label: "July" },
      { kind: "blowout", name: "Fall blowout", when: "Preference: Our recommended, mid October", status: "needs-a-day", label: "Preferred" },
    ])
  })

  it("shows the turn-on preference until it has a day", () => {
    expect(visitRows(fresh)[0]).toEqual({ kind: "turn-on", name: "Spring turn-on", when: "Preference: Early season, early May", status: "needs-a-day", label: "Preferred" })
    expect(visitRows({ ...fresh, blowoutPreference: "later" })[2]).toEqual({ kind: "blowout", name: "Fall blowout", when: "Preference: Late season, late October", status: "needs-a-day", label: "Preferred" })
  })

  it("shows the date once a visit is booked", () => {
    expect(visitRows(scheduled)[1]).toEqual({ kind: "inspection", name: "Mid-season inspection", when: "July 13", status: "scheduled", label: "Booked" })
  })

  it("speaks to the customer: never the admin words", () => {
    const words = [...visitRows(pass), ...visitRows(scheduled), ...visitRows(allDone)].map((r) => r.label)
    expect(words).not.toContain("Not scheduled")
    expect(words).not.toContain("Scheduled")
    expect(words).not.toContain("Completed")
    expect(words).not.toContain("Reserved")
    expect(visitRows({ ...pass, visits: pass.visits.map((v) => ({ ...v, completedAt: undefined, scheduledAt: undefined, scheduledOn: undefined, payments: undefined })) })[0].label).toBe("Preferred")
    expect(visitRows(allDone).map((r) => r.label)).toEqual(["Done", "Done", "Done"])
  })
})

describe("visit line info", () => {
  it("gives the visit's price and, when its line has one, what it includes", () => {
    expect(visitLineInfo({ ...pass.visits[0]!, amount: 145 })).toEqual({ price: "$145" })
    expect(visitLineInfo({ ...pass.visits[0]!, amount: 1450, description: "Controller programming and a walk of every zone." })).toEqual({ price: "$1,450", description: "Controller programming and a walk of every zone." })
  })
})

describe("card line", () => {
  it("writes the expiry as MM/YY", () => {
    expect(expiry("2028-08")).toBe("08/28")
    expect(expiry("2027-11")).toBe("11/27")
  })

  it("reads the brand, last four and expiry from the pass", () => {
    expect(cardLine(pass)).toBe("Visa ending 4242, expires 08/28")
    expect(cardLine({ ...pass, cardExpires: undefined })).toBe("Visa ending 4242")
    expect(cardLine({ ...pass, cardLast4: undefined })).toBe("No card on file yet. Pay at each visit by check, Venmo or cash, or add a card and we charge it after each visit.")
    expect(cardAction(pass)).toBe("Update card")
    expect(cardAction({ cardLast4: undefined })).toBe("Add a card")
  })
})

describe("season caption", () => {
  it("points at the next visit", () => {
    expect(seasonCaption(pass)).toBe("Next up: mid-season inspection in July.")
    expect(seasonCaption(scheduled)).toBe("Next up: mid-season inspection on July 13.")
  })

  it("names the preference when the turn-on or the blowout is next", () => {
    expect(seasonCaption(fresh)).toBe("Preference: Early season, early May. We'll schedule it about two weeks before and tell you the day.")
    const blowoutNext: Pass = { ...pass, visits: pass.visits.map((v, i) => (i < 2 ? { ...v, completedAt: "2027-07-13T16:05:00Z" } : v)) }
    expect(seasonCaption(blowoutNext)).toBe("Preference: Our recommended, mid October. We'll schedule it about two weeks before and tell you the day.")
    expect(seasonCaption({ ...blowoutNext, blowoutPreference: "earlier" })).toBe("Preference: Early season, early October. We'll schedule it about two weeks before and tell you the day.")
  })

  it("closes the season when every visit is done", () => {
    expect(seasonCaption(allDone)).toBe("Every visit is done. We'll email you in January about 2028.")
  })
})

describe("earlier seasons", () => {
  it("summarises a season by visits done and dollars paid, and lists earlier seasons newest first without the current one", () => {
    const current = snapshot.passes[0] as Pass
    const done2026: Pass = { ...current, id: "a", season: 2026, visits: current.visits.map((v) => ({ ...v, completedAt: "2026-05-03T17:00:00Z", ...paid(v, "2026-05-03") })) }
    const one2025: Pass = { ...current, id: "b", season: 2025, visits: current.visits.map((v, i) => (i === 0 ? { ...v, completedAt: "2025-05-03T17:00:00Z", ...paid(v, "2025-05-03") } : { ...v, completedAt: undefined, payments: undefined })) }
    expect(seasonSummary(done2026)).toBe(`3 of 3 visits done, $${done2026.visits.reduce((sum, v) => sum + v.amount, 0)} paid`)
    expect(seasonSummary(one2025)).toBe(`1 of 3 visits done, $${current.visits[0].amount} paid`)
    expect(earlierSeasons([one2025, current, done2026], current).map((p) => p.season)).toEqual([2026, 2025])
    expect(earlierSeasons([current], current)).toEqual([])
  })

  it("reads the dollars paid from the payment rows, a refund counting against and a visit with no row counting nothing", () => {
    const current = snapshot.passes[0] as Pass
    const row = (n: number, amount: number, extra: Record<string, unknown> = {}) => ({ id: `pay-${n}`, amount, method: "card_on_file", status: "succeeded", ...extra })
    const done = (visit: (typeof current.visits)[number], payments: ReturnType<typeof row>[]) => ({ ...visit, completedAt: "2026-05-03T17:00:00Z", payments })
    const season: Pass = { ...current, season: 2026, visits: [done(current.visits[0]!, [row(1, 145)]), done(current.visits[1]!, [row(2, 145), row(3, -45, { refundsPaymentId: "pay-2" })]), done(current.visits[2]!, [])] }
    expect(seasonSummary(season)).toBe("3 of 3 visits done, $245 paid")
    // a rows array that says nothing paid is not money
    expect(seasonSummary({ ...season, visits: season.visits.map((v) => ({ ...v, payments: [] })) })).toBe("3 of 3 visits done")
  })
})

describe("passHeadline", () => {
  const fresh = snapshot.passes[2] as Pass
  it("reads the state top to bottom: card failed, cancelled, next visit, reserved, done (a visit with no day is never a prompt to pick one)", () => {
    expect(passHeadline({ ...pass, cardFailedAt: "2027-05-03T17:12:00Z" }, "2027-05-04")).toMatchObject({ action: "update-card", title: "Your card didn't go through." })
    expect(passHeadline({ ...pass, status: "cancelled", cardFailedAt: "2027-05-03T17:12:00Z" }, "2027-05-04").action).toBe("book")
    expect(passHeadline(fresh, "2027-04-20").action).toBeNull()
    expect(passHeadline(fresh, "2027-04-20").title).not.toMatch(/pick/i)
    expect(passHeadline(fresh, "2026-11-12")).toMatchObject({ action: null, title: "Your 2027 season is reserved." })
    expect(passHeadline(pass, "2027-05-04")).toMatchObject({ action: null, title: "Spring turn-on done May 3. Next up: mid-season inspection, in July." })
    const booked: Pass = { ...fresh, visits: fresh.visits.map((v, i) => (i === 0 ? { ...v, scheduledAt: "2027-05-05T15:00:00Z" } : v)) }
    expect(passHeadline(booked, "2027-04-20")).toMatchObject({ action: "change-day", kind: "turn-on", title: "Next up: spring turn-on, May 5." })
    const done: Pass = { ...pass, visits: pass.visits.map((v) => ({ ...v, completedAt: v.completedAt ?? "2027-10-05T16:40:00Z" })) }
    expect(passHeadline(done, "2027-10-20")).toMatchObject({ action: null, title: "Your 2027 season is done." })
    expect(passHeadline(done, "2027-11-02")).toMatchObject({ action: "reserve-next" })
  })
})

describe("a pass bought in the spring or the winter", () => {
  it("reads the next visit's exact time and the other visit's preference with when it is scheduled", () => {
    const april = aprilPass
    expect(bookedWhen(april.visits[0]!, "10:30")).toBe("Wednesday, April 28 at 10:30 am")
    expect(visitRows(april)[1]).toMatchObject({ kind: "blowout", when: "Preference: Early season, early October", label: "Preferred" })
    expect(seasonCaption({ ...april, visits: [{ ...april.visits[0]!, completedAt: "2027-04-28T17:00:00Z" }, april.visits[1]!] })).toBe("Preference: Early season, early October. We'll schedule it about two weeks before and tell you the day.")
  })
  it("says the preference and when it is scheduled when no visit has a day", () => {
    expect(passHeadline(januaryPass, "2027-01-12")).toMatchObject({ title: "Your 2027 season is reserved.", line: "Preference: Early season, early May. We'll schedule it about two weeks before and tell you the day." })
  })
})

describe("bookedWhen", () => {
  it("reads weekday, date and the first name of who is coming for a booked visit, and nothing before a day or after the visit", () => {
    const v = { kind: "turn-on", window: "May", amount: 145, scheduledAt: "2027-05-04T14:00:00Z", personName: "Ryan Garner" } as const
    expect(bookedWhen(v)).toBe("Tuesday, May 4 with Ryan")
    expect(bookedWhen({ ...v, personName: undefined })).toBe("Tuesday, May 4")
    expect(bookedWhen({ ...v, personName: "Second truck" })).toBe("Tuesday, May 4")
    expect(bookedWhen({ ...v, personName: "Second" })).toBe("Tuesday, May 4")
    expect(bookedWhen({ kind: "turn-on", window: "May", amount: 145 })).toBeNull()
    expect(bookedWhen({ ...v, completedAt: "2027-05-04T17:00:00Z" })).toBeNull()
  })
})
