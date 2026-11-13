import { describe, it, expect } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { bookedWhen, cardLine, earlierSeasons, expiry, passHeadline, pickDayOptions, seasonCaption, seasonSummary, visitRows, visitStatus } from "./pass-page-model"

// passes[0] is Andrea in Erie: turn-on done May 3, inspection in July, blowout preferred for mid October.
// passes[2] has no visit yet, with the turn-on preferred earlier.
const pass = snapshot.passes[0] as Pass
const fresh = snapshot.passes[2] as Pass
const scheduled: Pass = { ...pass, visits: pass.visits.map((v) => (v.kind === "inspection" ? { ...v, scheduledAt: "2027-07-13T15:00:00Z" } : v)) }
const allDone: Pass = {
  ...pass,
  visits: pass.visits.map((v, i) => ({ ...v, completedAt: ["2027-05-03T17:10:00Z", "2027-07-13T16:05:00Z", "2027-10-05T16:40:00Z"][i] })),
}

describe("visit rows", () => {
  it("names each visit and reads its state from the dates", () => {
    expect(pass.visits.map(visitStatus)).toEqual(["completed", "unscheduled", "unscheduled"])
    expect(visitRows(pass)).toEqual([
      { kind: "turn-on", name: "Spring turn-on", when: "May 3", status: "completed", label: "Done" },
      { kind: "inspection", name: "Mid-season inspection", when: "July", status: "unscheduled", label: "July" },
      { kind: "blowout", name: "Fall blowout", when: "Mid October", status: "unscheduled", label: "Preferred" },
    ])
  })

  it("shows the turn-on preference until it has a day", () => {
    expect(visitRows(fresh)[0]).toEqual({ kind: "turn-on", name: "Spring turn-on", when: "Early May", status: "unscheduled", label: "Preferred" })
    expect(visitRows({ ...fresh, blowoutPreference: "later" })[2]).toEqual({ kind: "blowout", name: "Fall blowout", when: "Late October", status: "unscheduled", label: "Preferred" })
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
    expect(visitRows({ ...pass, visits: pass.visits.map((v) => ({ ...v, completedAt: undefined, scheduledAt: undefined })) })[0].label).toBe("Preferred")
    expect(visitRows(allDone).map((r) => r.label)).toEqual(["Done", "Done", "Done"])
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
    expect(cardLine({ ...pass, cardLast4: undefined })).toBe("No card on file yet.")
  })
})

describe("season caption", () => {
  it("points at the next visit", () => {
    expect(seasonCaption(pass)).toBe("Next up: mid-season inspection in July.")
    expect(seasonCaption(scheduled)).toBe("Next up: mid-season inspection on July 13.")
  })

  it("names the preference when the turn-on or the blowout is next", () => {
    expect(seasonCaption(fresh)).toBe("Next up: spring turn-on. You asked for early May.")
    const blowoutNext: Pass = { ...pass, visits: pass.visits.map((v, i) => (i < 2 ? { ...v, completedAt: "2027-07-13T16:05:00Z" } : v)) }
    expect(seasonCaption(blowoutNext)).toBe("You asked for mid October for your blowout. Ryan sets the day in September.")
    expect(seasonCaption({ ...blowoutNext, blowoutPreference: "earlier" })).toBe("You asked for early October for your blowout. Ryan sets the day in September.")
  })

  it("closes the season when every visit is done", () => {
    expect(seasonCaption(allDone)).toBe("Every visit is done. We'll email you in January about 2028.")
  })
})

describe("earlier seasons", () => {
  it("summarises a season by visits done and dollars paid, and lists earlier seasons newest first without the current one", () => {
    const current = snapshot.passes[0] as Pass
    const done2026: Pass = { ...current, id: "a", season: 2026, visits: current.visits.map((v) => ({ ...v, completedAt: "2026-05-03T17:00:00Z", chargedAt: "2026-05-03T17:02:00Z" })) }
    const one2025: Pass = { ...current, id: "b", season: 2025, visits: current.visits.map((v, i) => (i === 0 ? { ...v, completedAt: "2025-05-03T17:00:00Z", chargedAt: "2025-05-03T17:02:00Z" } : { ...v, completedAt: undefined, chargedAt: undefined })) }
    expect(seasonSummary(done2026)).toBe(`3 of 3 visits done, $${done2026.visits.reduce((sum, v) => sum + v.amount, 0)} paid`)
    expect(seasonSummary(one2025)).toBe(`1 of 3 visits done, $${current.visits[0].amount} paid`)
    expect(earlierSeasons([one2025, current, done2026], current).map((p) => p.season)).toEqual([2026, 2025])
    expect(earlierSeasons([current], current)).toEqual([])
  })
})

describe("passHeadline", () => {
  const fresh = snapshot.passes[2] as Pass
  it("reads the state top to bottom: card failed, cancelled, pick a day, next visit, reserved, done", () => {
    expect(passHeadline({ ...pass, cardFailedAt: "2027-05-03T17:12:00Z" }, "2027-05-04")).toMatchObject({ action: "update-card", title: "Your card didn't go through." })
    expect(passHeadline({ ...pass, status: "cancelled", cardFailedAt: "2027-05-03T17:12:00Z" }, "2027-05-04").action).toBe("book")
    expect(passHeadline(fresh, "2027-04-20", ["turn-on", "blowout"])).toMatchObject({ action: "pick-day", kind: "turn-on", title: "Pick your spring turn-on day." })
    expect(passHeadline(fresh, "2026-11-12")).toMatchObject({ action: null, title: "Your 2027 season is reserved." })
    expect(passHeadline(pass, "2027-05-04")).toMatchObject({ action: null, title: "Spring turn-on done May 3. Next up: mid-season inspection, in July." })
    const booked: Pass = { ...fresh, visits: fresh.visits.map((v, i) => (i === 0 ? { ...v, scheduledAt: "2027-05-05T15:00:00Z" } : v)) }
    expect(passHeadline(booked, "2027-04-20")).toMatchObject({ action: "change-day", kind: "turn-on", title: "Next up: spring turn-on, May 5." })
    const done: Pass = { ...pass, visits: pass.visits.map((v) => ({ ...v, completedAt: v.completedAt ?? "2027-10-05T16:40:00Z" })) }
    expect(passHeadline(done, "2027-10-20")).toMatchObject({ action: null, title: "Your 2027 season is done." })
    expect(passHeadline(done, "2027-11-02")).toMatchObject({ action: "reserve-next" })
  })

  it("offers three Tuesdays or Thursdays inside the preferred part of the window", () => {
    const days = pickDayOptions({ ...fresh, turnOnPreference: "recommended" }, "turn-on")
    expect(days).toHaveLength(3)
    expect(days.every((d) => d.startsWith("2027-05-"))).toBe(true)
    expect(days.every((d) => [2, 4].includes(new Date(`${d}T12:00:00Z`).getUTCDay()))).toBe(true)
    expect(pickDayOptions({ ...fresh, blowoutPreference: "later" }, "blowout")[0] >= "2027-10-18").toBe(true)
  })
})

describe("bookedWhen", () => {
  it("reads weekday, date and truck for a booked visit, and nothing before a day or after the visit", () => {
    const v = { kind: "turn-on", window: "May", amount: 145, scheduledAt: "2027-05-04T14:00:00Z", truckName: "Truck 1" } as const
    expect(bookedWhen(v)).toBe("Tuesday, May 4, Truck 1")
    expect(bookedWhen({ ...v, truckName: undefined })).toBe("Tuesday, May 4")
    expect(bookedWhen({ kind: "turn-on", window: "May", amount: 145 })).toBeNull()
    expect(bookedWhen({ ...v, completedAt: "2027-05-04T17:00:00Z" })).toBeNull()
  })
})
