import { describe, expect, it } from "vitest"
import { timeBooked, waitingVisitIds, type MoveEvent } from "./move-rules"
import { withinCutoff, withinCutoffOn } from "@/lib/portal/change-day"

describe("timeBooked", () => {
  it("is a told window, or a time on a one-off; a pass visit's stacked time promises nothing", () => {
    expect(timeBooked({ isPass: true, startTime: "08:00", windowTold: false })).toBe(false)
    expect(timeBooked({ isPass: true, startTime: "08:00", windowTold: true })).toBe(true)
    expect(timeBooked({ isPass: false, startTime: "14:00" })).toBe(true)
    expect(timeBooked({ isPass: false, startTime: null })).toBe(false)
    expect(timeBooked({ isPass: false })).toBe(false)
  })
})

describe("waitingVisitIds", () => {
  const ev = (kind: string, visitId: string, detail: Record<string, unknown> = {}): MoveEvent => ({ kind, visitId, detail })
  it("is the visit whose newest placement event asked the customer to reply YES", () => {
    expect([...waitingVisitIds([ev("visit.moved", "a", { asked: true })])]).toEqual(["a"])
  })
  it("clears on a later confirmation, a later move (the customer's own pick is one) or a later placement; older events do not count", () => {
    const events = [ev("visit.confirmed", "a"), ev("visit.moved", "a", { asked: true }), ev("visit.moved", "b", { asked: false }), ev("visit.moved", "b", { asked: true }), ev("visit.moved", "c", { asked: true }), ev("note", "c")]
    expect([...waitingVisitIds(events)].sort()).toEqual(["c"])
  })
  it("ignores events with no visit and an empty list", () => {
    expect(waitingVisitIds([{ kind: "visit.moved", visitId: null, detail: { asked: true } }]).size).toBe(0)
    expect(waitingVisitIds(undefined).size).toBe(0)
  })
})

describe("withinCutoffOn reads the same rule as withinCutoff", () => {
  it("is inside from the day before the visit and not before it", () => {
    expect(withinCutoffOn("2027-04-28", "2027-04-26")).toBe(false)
    expect(withinCutoffOn("2027-04-28", "2027-04-27")).toBe(true)
    expect(withinCutoffOn("2027-04-28", "2027-04-28")).toBe(true)
    expect(withinCutoffOn(null, "2027-04-28")).toBe(false)
    // the same answers as the instant rule, at 11:59 pm and midnight Mountain (UTC-6 in April)
    expect(withinCutoff({ scheduledOn: "2027-04-28" }, new Date("2027-04-27T05:59:00Z"))).toBe(false)
    expect(withinCutoff({ scheduledOn: "2027-04-28" }, new Date("2027-04-27T06:00:00Z"))).toBe(true)
  })
})
