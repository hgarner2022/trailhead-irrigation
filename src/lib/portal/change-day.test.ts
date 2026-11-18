import { describe, expect, it } from "vitest"
import { beforeCutoff, changeFor } from "./change-day"

const base = { status: "scheduled", scheduledOn: "2027-05-05", hasWindow: true, jobOpen: true }

describe("changeFor", () => {
  it("lets a booked day move until two days before it", () => {
    expect(changeFor(base, "2027-05-01")).toBe("yes")
    expect(changeFor(base, "2027-05-03")).toBe("yes")
    expect(changeFor(base, "2027-05-04")).toBe("call")
    expect(changeFor(base, "2027-05-05")).toBe("call")
  })
  it("lets a visit with no day yet take one", () => {
    expect(changeFor({ ...base, status: "unscheduled", scheduledOn: null }, "2027-05-04")).toBe("yes")
  })
  it("offers nothing for a done or canceled visit, a kind with no window or a job that is not open", () => {
    for (const status of ["completed", "cancelled", "skipped"]) expect(changeFor({ ...base, status }, "2027-04-01")).toBe("no")
    expect(changeFor({ ...base, hasWindow: false }, "2027-04-01")).toBe("no")
    expect(changeFor({ ...base, jobOpen: false }, "2027-04-01")).toBe("no")
  })
  it("counts whole days across a month end", () => {
    expect(beforeCutoff("2027-06-01", "2027-05-30")).toBe(true)
    expect(beforeCutoff("2027-06-01", "2027-05-31")).toBe(false)
  })
})
