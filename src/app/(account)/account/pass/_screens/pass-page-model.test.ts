import { describe, it, expect } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { cardLine, expiry, seasonCaption, visitRows, visitStatus } from "./pass-page-model"

// passes[0] is Andrea in Erie: turn-on done April 20, inspection in July, blowout reserved for the week of October 4.
const pass = snapshot.passes[0] as Pass
const scheduled: Pass = { ...pass, visits: pass.visits.map((v) => (v.kind === "inspection" ? { ...v, scheduledAt: "2027-07-13T15:00:00Z" } : v)) }
const allDone: Pass = {
  ...pass,
  visits: pass.visits.map((v, i) => ({ ...v, completedAt: ["2027-04-20T17:10:00Z", "2027-07-13T16:05:00Z", "2027-10-05T16:40:00Z"][i] })),
}

describe("visit rows", () => {
  it("names each visit and reads its state from the dates", () => {
    expect(pass.visits.map(visitStatus)).toEqual(["completed", "unscheduled", "unscheduled"])
    expect(visitRows(pass)).toEqual([
      { kind: "turn-on", name: "Spring turn-on", when: "April 20", status: "completed" },
      { kind: "inspection", name: "Mid-season inspection", when: "July", status: "unscheduled" },
      { kind: "blowout", name: "Fall blowout", when: "Week of October 4", status: "unscheduled" },
    ])
  })

  it("shows the date once a visit is booked", () => {
    expect(visitRows(scheduled)[1]).toEqual({ kind: "inspection", name: "Mid-season inspection", when: "July 13", status: "scheduled" })
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

  it("names the reserved week when the blowout is next", () => {
    const blowoutNext: Pass = { ...pass, visits: pass.visits.map((v, i) => (i < 2 ? { ...v, completedAt: "2027-07-13T16:05:00Z" } : v)) }
    expect(seasonCaption(blowoutNext)).toBe("Your blowout is reserved for the week of October 4. Ryan sets the day in September.")
  })

  it("closes the season when every visit is done", () => {
    expect(seasonCaption(allDone)).toBe("All three visits are done. We'll email you in January about 2028.")
  })
})
