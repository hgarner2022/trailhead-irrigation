import { describe, expect, it } from "vitest"
import type { Person, Visit } from "./types"
import { DEFAULT_DAY_MINUTES, dayFill, fillWords, hoursWords, townsWords } from "./day-fill"

const TZ = "America/Denver"
const person = (days: Person["workingDays"]): Pick<Person, "workingDays"> => ({ workingDays: days })
const weekdays = person(["mon", "tue", "wed", "thu", "fri"])
const visit = (id: string, town: Visit["town"], over: Partial<Visit> = {}): Visit => ({
  id, clientId: id, clientName: id, town, kind: "turn-on", status: "scheduled", startAt: "2026-11-24T16:00:00Z", isPass: false, jobberUrl: "", personId: "p1", stopOrder: 1, minutes: 60, ...over,
})

describe("dayFill", () => {
  it("counts the stops, the open time over everyone working and the towns, the most stops first", () => {
    const visits = [visit("a", "Erie"), visit("b", "Erie"), visit("c", "Lafayette"), visit("d", "Erie", { startAt: "2026-11-25T16:00:00Z" })]
    const fill = dayFill(visits, "2026-11-24", [weekdays, weekdays], TZ)
    expect(fill).toEqual({ stops: 3, working: 2, openMinutes: 2 * DEFAULT_DAY_MINUTES - 180, towns: [{ town: "Erie", count: 2 }, { town: "Lafayette", count: 1 }] })
    expect(fillWords(fill)).toBe("3 visits, 13 h open")
    expect(townsWords(fill)).toBe("Erie 2, Lafayette 1")
  })

  it("takes a service's usual length for a visit with none, and never goes below zero", () => {
    const fill = dayFill([visit("a", "Erie", { minutes: undefined, kind: "repair" })], "2026-11-24", [weekdays], TZ)
    expect(fill.openMinutes).toBe(DEFAULT_DAY_MINUTES - 120)
    const full = dayFill([visit("a", "Erie", { minutes: 600 })], "2026-11-24", [weekdays], TZ)
    expect(full.openMinutes).toBe(0)
    expect(fillWords(full)).toBe("1 visit, full")
  })

  it("leaves a canceled visit out, and does not count a person who does not work the day or the season", () => {
    const gone = visit("a", "Erie", { status: "cancelled" })
    expect(dayFill([gone], "2026-11-24", [weekdays], TZ).stops).toBe(0)
    expect(dayFill([], "2026-11-28", [weekdays], TZ).working).toBe(0)
    expect(dayFill([], "2026-11-24", [{ ...weekdays, seasonStart: "2027-03-01" }], TZ).working).toBe(0)
  })

  it("reads each working person's own hours, 09:00 to 17:00 when none are saved", () => {
    const early = { ...weekdays, hoursStart: "07:00", hoursEnd: "15:30" }
    const half = { ...weekdays, hoursStart: "09:00", hoursEnd: "13:00" }
    const fill = dayFill([visit("a", "Erie")], "2026-11-24", [early, half, weekdays], TZ)
    expect(fill.working).toBe(3)
    expect(fill.openMinutes).toBe(8.5 * 60 + 4 * 60 + DEFAULT_DAY_MINUTES - 60)
    // a person who does not work the day adds nothing, whatever their hours
    expect(dayFill([], "2026-11-28", [early], TZ).openMinutes).toBe(0)
    // hours that end before they start are worth nothing rather than a negative day
    expect(dayFill([], "2026-11-24", [{ ...weekdays, hoursStart: "17:00", hoursEnd: "09:00" }], TZ).openMinutes).toBe(0)
  })

  it("says Day off when no one works it and No visits when someone does", () => {
    expect(fillWords(dayFill([], "2026-11-28", [weekdays], TZ))).toBe("Day off")
    expect(fillWords(dayFill([], "2026-11-24", [weekdays], TZ))).toBe("No visits")
    expect(townsWords(dayFill([], "2026-11-24", [weekdays], TZ))).toBe("")
  })

  it("words hours and minutes", () => {
    expect(hoursWords(180)).toBe("3 h")
    expect(hoursWords(45)).toBe("45 min")
    expect(hoursWords(210)).toBe("3 h 30 min")
    expect(hoursWords(0)).toBe("0 min")
  })
})
