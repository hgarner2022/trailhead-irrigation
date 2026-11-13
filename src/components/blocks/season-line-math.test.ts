import { describe, it, expect } from "vitest"
import { monthInWindow, visitMonth } from "@/lib/admin/metrics"
import {
  listJoin,
  markerAlign,
  preferenceWord,
  seasonPhase,
  seasonPosition,
} from "./season-line-math"

describe("the shared month rule", () => {
  it("reads the first month named anywhere in a window, in full or abbreviated", () => {
    expect(monthInWindow("May")).toBe(5)
    expect(monthInWindow("July")).toBe(7)
    expect(monthInWindow("October")).toBe(10)
    expect(monthInWindow("April to May")).toBe(4)
    expect(monthInWindow("early April")).toBe(4)
    expect(monthInWindow("Oct 13")).toBe(10)
    expect(monthInWindow("Late April to May")).toBe(4)
    expect(monthInWindow("whenever")).toBeNull()
  })
  it("prefers the scheduled date over the window", () => {
    expect(visitMonth({ kind: "turn-on", window: "May", amount: 145, scheduledAt: "2027-04-28T16:00:00Z" })).toBe(4)
    expect(visitMonth({ kind: "inspection", window: "July", amount: 145 })).toBe(7)
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
  it("names where in the month a preferred visit sits", () => {
    expect(preferenceWord("earlier")).toBe("Early")
    expect(preferenceWord("recommended")).toBe("Mid")
    expect(preferenceWord("later")).toBe("Late")
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
