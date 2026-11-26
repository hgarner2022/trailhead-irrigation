import { describe, expect, it } from "vitest"
import { peekPlacement, PEEK_GAP, type Box } from "./PeekAnchor"

const area = (width: number): Box => ({ left: 0, right: width, top: 0, bottom: 600 })
const block = (left: number, width = 96): Box => ({ left, right: left + width, top: 100, bottom: 160 })

describe("peekPlacement", () => {
  it("opens to the right at 360 px when that much room is beside the block", () => {
    expect(peekPlacement(block(10), area(700))).toMatchObject({ side: "right", width: 360, mode: "beside" })
  })
  it("flips to the left at 360 px when the right has no room and the left does", () => {
    expect(peekPlacement(block(600), area(700))).toMatchObject({ side: "left", width: 360, mode: "beside" })
  })
  it("narrows to the room (280 to 360 px) on the roomier side when 360 does not fit", () => {
    const p = peekPlacement(block(10), area(10 + 96 + PEEK_GAP * 2 + 300))
    expect(p).toMatchObject({ side: "right", mode: "beside", width: 300 })
  })
  it("floats over the calendar's edge, 280 px, on the roomier side when neither side has 280 px", () => {
    const right = peekPlacement(block(10), area(10 + 96 + PEEK_GAP * 2 + 260))
    expect(right).toMatchObject({ side: "left", mode: "over", width: 280 })
    expect(right.anchor).toMatchObject({ left: 10 + 96 + PEEK_GAP * 2 + 260, right: 10 + 96 + PEEK_GAP * 2 + 260 })
    const left = peekPlacement(block(250), area(250 + 96 + 100))
    expect(left).toMatchObject({ side: "right", mode: "over", width: 280 })
    expect(left.anchor.left).toBe(0)
  })
  it("never makes the card wider than the calendar", () => {
    expect(peekPlacement(block(10, 50), area(200)).width).toBe(184)
  })
  it("keeps the block's own top and bottom for the edge strip, so the card lines up with the block", () => {
    const p = peekPlacement(block(250), area(446))
    expect(p.anchor.top).toBe(100)
    expect(p.anchor.bottom).toBe(160)
  })
})
