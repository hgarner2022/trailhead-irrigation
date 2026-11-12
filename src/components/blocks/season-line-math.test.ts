import { describe, it, expect } from "vitest"
import {
  listJoin,
  markerAlign,
  monthFromWindow,
  monthOf,
  reservedWeek,
  seasonPhase,
  seasonPosition,
  writtenDate,
} from "./season-line-math"

describe("monthFromWindow", () => {
  it("reads the first month named in a window", () => {
    expect(monthFromWindow("April to May")).toBe(4)
    expect(monthFromWindow("July")).toBe(7)
    expect(monthFromWindow("October, week of the 11th")).toBe(10)
  })
  it("is null when no month is named", () => {
    expect(monthFromWindow("whenever")).toBeNull()
    expect(monthFromWindow("")).toBeNull()
  })
})

describe("monthOf", () => {
  it("prefers the scheduled date over the window", () => {
    expect(monthOf({ kind: "turn-on", window: "April to May", amount: 145, scheduledAt: "2027-05-03T16:00:00Z" })).toBe(5)
    expect(monthOf({ kind: "inspection", window: "July", amount: 145 })).toBe(7)
  })
})

describe("seasonPosition", () => {
  it("places the first of July a little past a third of the way", () => {
    const p = seasonPosition("2027-07-01")
    expect(p).toBeGreaterThan(0.35)
    expect(p).toBeLessThan(0.45)
  })
  it("starts at April 1 and ends at November 30", () => {
    expect(seasonPosition("2027-04-01")).toBe(0)
    expect(seasonPosition("2027-11-30")).toBeLessThan(1)
    expect(seasonPosition("2027-11-30")).toBeGreaterThan(0.99)
  })
  it("pins dates outside April to November", () => {
    expect(seasonPosition("2027-03-20")).toBe(0)
    expect(seasonPosition("2027-12-02")).toBe(1)
  })
  it("pins other years against the season", () => {
    expect(seasonPosition("2026-11-12", 2027)).toBe(0)
    expect(seasonPosition("2028-01-05", 2027)).toBe(1)
  })
})

describe("seasonPhase", () => {
  it("names where a date sits against the season", () => {
    expect(seasonPhase("2027-03-20")).toBe("before")
    expect(seasonPhase("2027-04-01")).toBe("during")
    expect(seasonPhase("2027-11-30")).toBe("during")
    expect(seasonPhase("2027-12-03")).toBe("after")
    expect(seasonPhase("2026-11-12", 2027)).toBe("before")
  })
})

describe("labels", () => {
  it("reads the reserved week from a blowout window", () => {
    expect(reservedWeek("October, week of the 11th")).toBe("October 11")
    expect(reservedWeek("October, week of the 4th")).toBe("October 4")
    expect(reservedWeek("October")).toBeNull()
  })
  it("writes a date out in full", () => {
    expect(writtenDate("2027-04-20T16:00:00Z")).toBe("April 20")
  })
  it("joins a list the way a sentence does", () => {
    expect(listJoin(["April"])).toBe("April")
    expect(listJoin(["April", "July"])).toBe("April and July")
    expect(listJoin(["April", "July", "October"])).toBe("April, July and October")
  })
  it("keeps the today label inside the track", () => {
    expect(markerAlign(0)).toBe("start")
    expect(markerAlign(0.5)).toBe("center")
    expect(markerAlign(1)).toBe("end")
  })
})
