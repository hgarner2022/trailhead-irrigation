import { describe, expect, it } from "vitest"
import { currentSeason } from "./season"

describe("currentSeason", () => {
  it("is the calendar year through October and the next year from November", () => {
    expect(currentSeason("2026-01-01")).toBe(2026)
    expect(currentSeason("2026-10-31")).toBe(2026)
    expect(currentSeason("2026-11-01")).toBe(2027)
    expect(currentSeason("2026-12-31")).toBe(2027)
  })
})
