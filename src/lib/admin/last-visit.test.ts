import { describe, expect, it } from "vitest"
import { instantOf } from "./shape"
import { lastVisitAt } from "./last-visit"

// Admin Customers read "Last visit Nov 20" for a customer with nothing ahead (Nov 18 2026): a visit was marked done before its scheduled day and the column
// read the scheduled day. Last visit is the day the newest done visit was done, and never a day still ahead.
const v = (clientId: string, over: Partial<{ status: string; startAt: string; scheduledOn: string; completedOn: string }>) => ({ clientId, status: "completed", ...over })

describe("lastVisitAt", () => {
  it("reads the done-on day of a visit marked done before its scheduled day, not the scheduled day", () => {
    const m = lastVisitAt([v("c1", { startAt: "2026-11-20T15:00:00Z", scheduledOn: "2026-11-20", completedOn: "2026-11-17" })], "2026-11-18")
    expect(m.get("c1")).toBe(instantOf("2026-11-17", "12:00"))
  })
  it("takes the newest done-on day of several done visits", () => {
    const m = lastVisitAt([v("c1", { completedOn: "2026-05-03" }), v("c1", { completedOn: "2026-10-22" }), v("c1", { completedOn: "2026-07-10" })], "2026-11-18")
    expect(m.get("c1")).toBe(instantOf("2026-10-22", "12:00"))
  })
  it("ignores visits that are not done, however late they are scheduled", () => {
    const m = lastVisitAt([v("c1", { status: "scheduled", startAt: "2026-11-20T15:00:00Z", scheduledOn: "2026-11-20" }), v("c2", { status: "cancelled", scheduledOn: "2026-10-01" })], "2026-11-18")
    expect(m.size).toBe(0)
  })
  it("falls back to a done visit's scheduled day only when it is not in the future", () => {
    expect(lastVisitAt([v("c1", { scheduledOn: "2026-11-03" })], "2026-11-18").get("c1")).toBe(instantOf("2026-11-03", "12:00"))
    expect(lastVisitAt([v("c1", { scheduledOn: "2026-11-20" })], "2026-11-18").has("c1")).toBe(false)
  })
  it("never reads a day after today even when a done-on day is wrong", () => {
    expect(lastVisitAt([v("c1", { completedOn: "2026-11-25" })], "2026-11-18").has("c1")).toBe(false)
  })
})
