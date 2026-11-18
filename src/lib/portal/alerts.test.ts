import { describe, expect, it } from "vitest"
import { customerChangeMessage } from "./alerts"

const base = { customerName: "Andrea Smith", service: "Spring turn-on", town: "Erie" }

describe("customerChangeMessage (Ryan's words on Home)", () => {
  it("a cancel names the day that is free", () => {
    expect(customerChangeMessage({ ...base, change: "cancelled", from: "2027-04-28" })).toBe("Andrea Smith canceled Spring turn-on, Wed, Apr 28, Erie. The day is free.")
  })
  it("a cancel of a visit with no day frees none", () => {
    expect(customerChangeMessage({ ...base, change: "cancelled", from: null })).toBe("Andrea Smith canceled Spring turn-on, Erie.")
  })
  it("a cancel on a job that holds a payment says so, so Ryan sorts the money", () => {
    expect(customerChangeMessage({ ...base, change: "cancelled", from: "2027-04-28", hasPayment: true })).toBe("Andrea Smith canceled Spring turn-on, Wed, Apr 28, Erie. The day is free. The job has a payment.")
  })
  it("a move names both days, the town and who has it now by first name", () => {
    expect(customerChangeMessage({ ...base, change: "moved", from: "2027-04-28", to: "2027-04-30", who: "Ryan Garner" })).toBe("Andrea Smith moved Spring turn-on from Wed, Apr 28 to Fri, Apr 30, Erie, Ryan.")
    expect(customerChangeMessage({ ...base, change: "moved", from: null, to: "2027-04-30" })).toBe("Andrea Smith moved Spring turn-on to Fri, Apr 30, Erie.")
  })
})
