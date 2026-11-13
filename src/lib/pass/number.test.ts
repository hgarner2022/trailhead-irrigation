import { describe, expect, it } from "vitest"
import { nextPassNumber } from "./number"

describe("nextPassNumber", () => {
  it("starts a season at 0001", () => {
    expect(nextPassNumber(2027, [])).toBe("TH-2027-0001")
  })
  it("counts per season", () => {
    expect(nextPassNumber(2027, ["TH-2026-0009", "TH-2027-0001", "TH-2027-0002"])).toBe("TH-2027-0003")
    expect(nextPassNumber(2028, ["TH-2027-0002"])).toBe("TH-2028-0001")
  })
  it("goes one past the highest even with gaps, and ignores junk", () => {
    expect(nextPassNumber(2027, ["TH-2027-0007", "TH-2027-0002", "TH-2027-abc", "nonsense"])).toBe("TH-2027-0008")
  })
  it("keeps going past four digits", () => {
    expect(nextPassNumber(2027, ["TH-2027-9999"])).toBe("TH-2027-10000")
  })
})
