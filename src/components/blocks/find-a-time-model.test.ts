import { describe, expect, it } from "vitest"
import { shortDay } from "@/emails/format"
import { recommendedId, sortOpenings, timeRange } from "./find-a-time-model"
import { FORCED, OPENINGS } from "./scheduler-panels-fixtures"
import type { Opening } from "./scheduler-panels-types"

const ids = (rows: Opening[]) => rows.map((r) => r.id)

describe("sortOpenings", () => {
  it("Recommended puts the lowest score first", () => {
    expect(ids(sortOpenings(OPENINGS, "recommended"))).toEqual(["o-3", "o-2", "o-1", "o-4", "o-5"])
  })
  it("Soonest is day, then start, then person", () => {
    expect(ids(sortOpenings(OPENINGS, "soonest"))).toEqual(["o-1", "o-2", "o-3", "o-4", "o-5"])
  })
  it("Least driving is added minutes, then day, then start", () => {
    expect(ids(sortOpenings(OPENINGS, "least-driving"))).toEqual(["o-3", "o-2", "o-4", "o-5", "o-1"])
  })
  it("breaks a score tie by the earlier day, then the earlier start, then the lower person id", () => {
    const base = { day: "2026-11-30", start: "09:00", end: "10:00", personId: "b", personName: "B", addedMinutes: 5, score: 5 }
    const rows: Opening[] = [
      { ...base, id: "late-day", day: "2026-12-01" },
      { ...base, id: "late-start", start: "10:00" },
      { ...base, id: "person-b" },
      { ...base, id: "person-a", personId: "a" },
    ]
    expect(ids(sortOpenings(rows, "recommended"))).toEqual(["person-a", "person-b", "late-start", "late-day"])
  })
  it("does not change its input", () => {
    const copy = [...OPENINGS]
    sortOpenings(OPENINGS, "least-driving")
    expect(OPENINGS).toEqual(copy)
  })
})

describe("recommendedId", () => {
  it("is the lowest score, and a forced row never carries it", () => {
    expect(recommendedId(OPENINGS)).toBe("o-3")
    expect(recommendedId([...FORCED, ...OPENINGS])).toBe("o-3")
    expect(recommendedId(FORCED)).toBeUndefined()
  })
})

describe("words", () => {
  it("writes the day and the range", () => {
    expect(shortDay("2026-11-30")).toBe("Mon, Nov 30")
    expect(timeRange("09:00", "10:00")).toBe("9:00 to 10:00 am")
    expect(timeRange("11:30", "12:30")).toBe("11:30 am to 12:30 pm")
    expect(timeRange("16:30", "17:30")).toBe("4:30 to 5:30 pm")
  })
})
