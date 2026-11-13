import { describe, expect, it } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, Visit } from "@/lib/admin/types"
import { TIME_ZONE } from "@/lib/admin/format"
import { addDays, areaOf, dayLabel, dayOf, dayVisits, weekDays, weekOf, weekVisits, weekdayOf, worksOn } from "./week-grid-days"

const data = snapshot as AdminData
const { trucks, areas } = data.settings
// 12:56 pm in Denver on Thursday, November 12, 2026.
const TODAY = "2026-11-12T19:56:30Z"
const WEEK = "2026-11-09"

describe("days", () => {
  it("reads the Mountain calendar day and the weekday", () => {
    expect(dayOf(TODAY, TIME_ZONE)).toBe("2026-11-12")
    expect(dayOf("2026-11-13T02:00:00Z", TIME_ZONE)).toBe("2026-11-12") // 7 pm Thursday in Denver
    expect(dayOf("2026-11-12", TIME_ZONE)).toBe("2026-11-12")
    expect(weekdayOf("2026-11-09")).toBe("mon")
    expect(weekdayOf("2026-11-15")).toBe("sun")
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01")
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31")
  })

  it("finds the Monday of the week and lists its seven days", () => {
    expect(weekOf(TODAY, TIME_ZONE)).toBe(WEEK)
    expect(weekOf("2026-11-09T15:00:00Z", TIME_ZONE)).toBe(WEEK)
    expect(weekOf("2026-11-16T03:00:00Z", TIME_ZONE)).toBe(WEEK) // Sunday 8 pm in Denver
    expect(weekOf("2026-11-16T15:00:00Z", TIME_ZONE)).toBe("2026-11-16")
    expect(weekDays(WEEK)).toEqual(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"])
    expect(dayLabel("2026-11-09")).toBe("Mon 9")
    expect(dayLabel("2026-11-15")).toBe("Sun 15")
  })
})

describe("the week's visits", () => {
  it("keeps the dated, uncancelled visits whose Mountain day is in the week", () => {
    const week = weekVisits(data.visits, WEEK, TIME_ZONE)
    expect(week).toHaveLength(18)
    expect(week.every((v) => v.status !== "cancelled" && v.startAt)).toBe(true)
    const cancelled = { ...week[0], id: "x", status: "cancelled" as const }
    expect(weekVisits([cancelled], WEEK, TIME_ZONE)).toEqual([])
  })

  it("lists a day's stops by stop order, then by start time when none", () => {
    const names = (visits: Visit[], truckId?: string) => dayVisits(visits, "2026-11-13", truckId, TIME_ZONE).map((v) => v.clientName)
    expect(names(data.visits)).toEqual(["David", "Ricky", "Joel", "Brian"])
    expect(names(data.visits, "truck-2")).toEqual([])
    const unordered = dayVisits(data.visits, "2026-11-13", undefined, TIME_ZONE).map((v) => ({ ...v, stopOrder: undefined })).reverse()
    expect(names(unordered)).toEqual(["David", "Ricky", "Joel", "Brian"])
  })
})

describe("areas and trucks", () => {
  it("finds the area a town sits in", () => {
    expect(areaOf("Firestone", areas)?.id).toBe("area-north")
    expect(areaOf("Broomfield", areas)?.id).toBe("area-south")
    expect(areaOf("Longmont", [])).toBeUndefined()
  })

  it("knows which days a truck works", () => {
    expect(worksOn(trucks[0], "2026-11-13")).toBe(true) // Friday
    expect(worksOn(trucks[0], "2026-11-14")).toBe(false) // Saturday
    expect(worksOn(trucks[1], "2026-11-14")).toBe(true)
    expect(worksOn(trucks[1], "2026-11-15")).toBe(false)
  })
})
