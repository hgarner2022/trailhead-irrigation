import { describe, expect, it } from "vitest"
import { clockToMinutes, clockWords, conflictFor, conflictMap, detailFor, minuteAt, minutesToPx, moveResult, packLanes, pxToMinutes, rangeWords, resizeResult, snap, timeOffLabel, visibleRange, type GridBlock } from "./time-grid-model"

const range = { start: 8, end: 17 }
const b = (id: string, start: number | null, minutes: number, over: Partial<GridBlock> = {}): GridBlock => ({
  id, day: "2026-11-24", personId: "p1", start, minutes, title: id, name: "Andrea", kind: "repair", town: "Erie", service: "Repair", ...over,
})

describe("pixels and snapping", () => {
  it("is 56 px an hour", () => {
    expect(minutesToPx(60)).toBe(56)
    expect(minutesToPx(15)).toBe(14)
    expect(pxToMinutes(28)).toBe(30)
  })
  it("snaps to 15 minutes", () => {
    expect(snap(7)).toBe(0)
    expect(snap(8)).toBe(15)
    expect(snap(541)).toBe(540)
    expect(snap(553)).toBe(555)
  })
  it("reads the minute under a pointer", () => {
    expect(minuteAt(0, range)).toBe(480)
    expect(minuteAt(56, range)).toBe(540)
  })
})

describe("words", () => {
  it("reads times as the app does", () => {
    expect(clockToMinutes("09:30")).toBe(570)
    expect(clockToMinutes(undefined)).toBeNull()
    expect(clockWords(720)).toBe("12:00 pm")
    expect(clockWords(555, true)).toBe("9:15")
    expect(rangeWords(555, 75)).toBe("9:15 to 10:30 am")
    expect(rangeWords(690, 150)).toBe("11:30 am to 2:00 pm")
  })
  it("words time off", () => {
    expect(timeOffLabel({ id: "o", personId: "p1", day: "d", start: 720, end: 840 }, "Ryan")).toBe("Ryan off 12 to 2 pm")
    expect(timeOffLabel({ id: "o", personId: "p1", day: "d", start: null, end: null }, "Tech")).toBe("Tech off all day")
  })
})

describe("visibleRange", () => {
  it("is at least 8 to 17", () => {
    expect(visibleRange([])).toEqual({ start: 8, end: 17 })
    expect(visibleRange([{ hoursStart: "09:00", hoursEnd: "16:00" }])).toEqual({ start: 8, end: 17 })
  })
  it("widens to the earliest start and latest end", () => {
    expect(visibleRange([{ hoursStart: "06:30", hoursEnd: "19:15" }])).toEqual({ start: 6, end: 20 })
  })
  it("widens for a block outside the hours", () => {
    expect(visibleRange([], [{ start: 17 * 60 + 30, minutes: 90 }])).toEqual({ start: 8, end: 19 })
  })
})

describe("what a block shows", () => {
  it("goes by length", () => {
    expect(detailFor(30)).toBe("line")
    expect(detailFor(45)).toBe("two")
    expect(detailFor(60)).toBe("full")
    expect(detailFor(120)).toBe("full")
  })
})

describe("packLanes", () => {
  it("leaves clear blocks alone in one lane", () => {
    const p = packLanes([b("a", 540, 60), b("c", 600, 30)], range)
    expect(p.map((x) => [x.lane, x.lanes])).toEqual([[0, 1], [0, 1]])
    expect(p[0]).toMatchObject({ top: 56, height: 56 })
  })
  it("sets overlapping blocks side by side and reuses a freed lane", () => {
    const p = packLanes([b("a", 540, 120), b("b", 570, 60), b("c", 630, 30)], range)
    const by = Object.fromEntries(p.map((x) => [x.block.id, x]))
    expect([by.a.lane, by.b.lane, by.c.lane]).toEqual([0, 1, 1])
    expect(by.a.lanes).toBe(2)
    expect(by.c.lanes).toBe(2)
  })
  it("starts a new cluster after a gap and skips Any time blocks", () => {
    const p = packLanes([b("a", 540, 60), b("b", 540, 60), b("c", 700, 30), b("d", null, 30)], range)
    expect(p).toHaveLength(3)
    expect(p.find((x) => x.block.id === "c")?.lanes).toBe(1)
  })
  it("never draws a block shorter than 15 minutes", () => {
    expect(packLanes([b("a", 540, 5)], range)[0].height).toBe(14)
  })
})

describe("moveResult", () => {
  it("snaps and labels", () => {
    expect(moveResult(b("a", 540, 75), { day: "2026-11-26", personId: "p1", start: 553 }, range)).toMatchObject({ start: 555, label: "9:15 to 10:30 am" })
  })
  it("keeps the whole block inside the drawn hours", () => {
    expect(moveResult(b("a", 540, 120), { day: "d", personId: "p1", start: 16 * 60 + 30 }, range).start).toBe(15 * 60)
    expect(moveResult(b("a", 540, 60), { day: "d", personId: "p1", start: 100 }, range).start).toBe(480)
  })
  it("keeps Any time as Any time", () => {
    expect(moveResult(b("a", 540, 60), { day: "d", personId: "p1", start: null }, range)).toMatchObject({ start: null, label: "Any time" })
  })
})

describe("resizeResult", () => {
  it("snaps to 15 minutes", () => expect(resizeResult(b("a", 540, 60), 20, range)).toBe(75))
  it("never goes under 15 minutes", () => expect(resizeResult(b("a", 540, 60), -500, range)).toBe(15))
  it("stops at the end of the drawn hours", () => expect(resizeResult(b("a", 16 * 60, 30), 500, range)).toBe(60))
})

describe("conflicts", () => {
  const names = () => "Ryan"
  const blocks = [b("Dry Creek", 900, 60), b("Briggs", 540, 60)]
  it("finds a clash with another visit of the same person", () => {
    expect(conflictFor({ id: "x", day: "2026-11-24", personId: "p1", start: 930, minutes: 60 }, blocks, [], names)).toBe("Ryan has Dry Creek at 3:00 pm.")
  })
  it("lets back-to-back blocks sit", () => expect(conflictFor({ id: "x", day: "2026-11-24", personId: "p1", start: 960, minutes: 30 }, blocks, [], names)).toBeNull())
  it("ignores itself, other people, Any time and planned blocks", () => {
    expect(conflictFor({ id: "Briggs", day: "2026-11-24", personId: "p1", start: 540, minutes: 60 }, blocks, [], names)).toBeNull()
    expect(conflictFor({ id: "x", day: "2026-11-24", personId: "p2", start: 540, minutes: 60 }, blocks, [], names)).toBeNull()
    expect(conflictFor({ id: "x", day: "2026-11-24", personId: "p1", start: null, minutes: 60 }, blocks, [], names)).toBeNull()
    expect(conflictFor({ id: "x", day: "2026-11-24", personId: "p1", start: 540, minutes: 60 }, [b("P", 540, 60, { planned: { day: "d", personId: "p1", start: 0 } })], [], names)).toBeNull()
  })
  it("finds time off", () => {
    const off = [{ id: "o", personId: "p1", day: "2026-11-25", start: 720, end: 840 }]
    expect(conflictFor({ id: "x", day: "2026-11-25", personId: "p1", start: 780, minutes: 60 }, [], off, names)).toBe("Ryan is off 12 to 2 pm.")
    expect(conflictFor({ id: "x", day: "2026-11-25", personId: "p1", start: 840, minutes: 60 }, [], off, names)).toBeNull()
    expect(conflictFor({ id: "x", day: "2026-11-25", personId: "p1", start: 540, minutes: 30 }, [], [{ ...off[0], start: null, end: null }], names)).toBe("Ryan is off all day.")
  })
  it("maps every clashing block, an explicit reason winning", () => {
    const map = conflictMap([b("a", 540, 60), b("b", 570, 60), b("c", 700, 30, { conflict: "Needs a hose." })], [], names)
    expect([...map.keys()].sort()).toEqual(["a", "b", "c"])
    expect(map.get("c")).toBe("Needs a hose.")
  })
})
