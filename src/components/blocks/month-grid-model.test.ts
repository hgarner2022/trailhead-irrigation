import { describe, expect, it } from "vitest"
import { keyTarget, monthTitle, monthWeeks, shiftMonth, stopsWords, townsLine } from "./month-grid-model"

describe("monthWeeks", () => {
  it("starts on Monday and pads with nulls: November 2026 begins on a Sunday", () => {
    const w = monthWeeks("2026-11")
    expect(w[0]).toEqual([null, null, null, null, null, null, "2026-11-01"])
    expect(w[1][0]).toBe("2026-11-02")
    expect(w.at(-1)?.[0]).toBe("2026-11-30")
    expect(w).toHaveLength(6)
    expect(w.every((r) => r.length === 7)).toBe(true)
  })
})
describe("keys", () => {
  it("moves by day and week", () => {
    expect(keyTarget("ArrowRight", "2026-11-25")).toBe("2026-11-26")
    expect(keyTarget("ArrowUp", "2026-11-25")).toBe("2026-11-18")
    expect(keyTarget("ArrowDown", "2026-11-25")).toBe("2026-12-02")
  })
  it("goes to the ends of the week", () => {
    expect(keyTarget("Home", "2026-11-25")).toBe("2026-11-23")
    expect(keyTarget("End", "2026-11-25")).toBe("2026-11-29")
  })
  it("goes by month and clamps the day", () => {
    expect(keyTarget("PageDown", "2026-01-31")).toBe("2026-02-28")
    expect(keyTarget("PageUp", "2026-01-15")).toBe("2025-12-15")
    expect(keyTarget("a", "2026-01-15")).toBeNull()
  })
})
describe("words", () => {
  it("says stops, towns and the month", () => {
    expect(stopsWords(1)).toBe("1 stop")
    expect(stopsWords(5)).toBe("5 stops")
    expect(townsLine(["Erie", "Lafayette", "Longmont", "Firestone"])).toBe("Erie, Lafayette +2")
    expect(townsLine(["Erie"])).toBe("Erie")
    expect(monthTitle("2026-11")).toBe("November 2026")
    expect(shiftMonth("2026-12", 1)).toBe("2027-01")
  })
})
