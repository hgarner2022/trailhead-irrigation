import { describe, expect, it } from "vitest"
import { autoScroll, placeWords, type Preview } from "./time-grid-dnd"

// The pure halves of the drag: the grid scrolls itself near its edges (never the page), and what is said aloud for a place.

function grid(box: { left: number; top: number; width: number; height: number }, scroll = { left: 100, top: 100 }) {
  const el = document.createElement("div")
  const head = document.createElement("div")
  head.dataset.slot = "time-grid-head"
  head.getBoundingClientRect = () => ({ height: 90 }) as DOMRect
  el.append(head)
  el.getBoundingClientRect = () => ({ left: box.left, top: box.top, right: box.left + box.width, bottom: box.top + box.height, width: box.width, height: box.height }) as DOMRect
  // jsdom has no layout: scroll offsets are plain numbers, bounded by a generous content size
  let sl = scroll.left
  let st = scroll.top
  Object.defineProperty(el, "scrollLeft", { get: () => sl, set: (v: number) => { sl = Math.max(0, Math.min(2000, v)) } })
  Object.defineProperty(el, "scrollTop", { get: () => st, set: (v: number) => { st = Math.max(0, Math.min(2000, v)) } })
  return el
}
const BOX = { left: 100, top: 100, width: 800, height: 600 }

describe("autoScroll", () => {
  it("scrolls toward the right edge, faster the nearer the pointer is", () => {
    const near = grid(BOX)
    const far = grid(BOX)
    expect(autoScroll(near, 895, 400)).toBe(true)
    expect(autoScroll(far, 860, 400)).toBe(true)
    expect(near.scrollLeft).toBeGreaterThan(far.scrollLeft)
    expect(near.scrollTop).toBe(100)
  })
  it("scrolls left beside the hour gutter, up under the sticky head and down at the bottom", () => {
    const l = grid(BOX)
    expect(autoScroll(l, 160, 400)).toBe(true)
    expect(l.scrollLeft).toBeLessThan(100)
    const u = grid(BOX)
    expect(autoScroll(u, 500, 195)).toBe(true)
    expect(u.scrollTop).toBeLessThan(100)
    const d = grid(BOX)
    expect(autoScroll(d, 500, 695)).toBe(true)
    expect(d.scrollTop).toBeGreaterThan(100)
  })
  it("does nothing in the middle, or when the pointer is outside the grid (a row dragged from a panel beside it)", () => {
    const g = grid(BOX)
    expect(autoScroll(g, 500, 400)).toBe(false)
    expect(autoScroll(g, 950, 400)).toBe(false)
    expect(autoScroll(g, 500, 750)).toBe(false)
    expect([g.scrollLeft, g.scrollTop]).toEqual([100, 100])
  })
  it("reports no move at the end of the scroll", () => {
    const g = grid(BOX, { left: 0, top: 100 })
    expect(autoScroll(g, 140, 400)).toBe(false)
  })
})

describe("placeWords", () => {
  const preview = (over: Partial<Preview> = {}): Preview => ({ id: "v1", day: "2026-11-19", personId: "p1", start: 525, minutes: 60, label: "8:45 to 9:45 am", conflict: null, external: false, ...over })
  const names = (id: string) => (id === "p1" ? "Ryan" : "Hannah")
  it("says the day, the person and the time", () => {
    expect(placeWords(preview(), names)).toBe("Thursday, Nov 19, Ryan, 8:45 to 9:45 am")
  })
  it("adds the clash and says Any time for a visit with no time", () => {
    expect(placeWords(preview({ conflict: "Ryan has Aspen Dr at 9:00 am." }), names)).toBe("Thursday, Nov 19, Ryan, 8:45 to 9:45 am. Ryan has Aspen Dr at 9:00 am.")
    expect(placeWords(preview({ start: null, label: "Any time", personId: "p2" }), names)).toBe("Thursday, Nov 19, Hannah, Any time")
  })
})
