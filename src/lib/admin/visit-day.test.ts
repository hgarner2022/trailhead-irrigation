import { describe, expect, it } from "vitest"
import { visitDay } from "@/lib/portal/words"
import { dayOfVisit } from "@/app/(admin)/admin/_screens/visit-panel-model"
import { scheduledDayOf, visitDayOf, wasScheduledDay } from "./visit-day"
import type { Visit } from "./types"

const base = { id: "v", clientId: "c", clientName: "A B", town: "Erie", kind: "repair", isPass: false, jobberUrl: "" } as const
const done = (over: Partial<Visit> = {}): Visit => ({ ...base, status: "completed", scheduledOn: "2026-11-20", startAt: "2026-11-20T16:00:00Z", completedOn: "2026-11-18", ...over }) as Visit

describe("visitDayOf", () => {
  it("reads a done visit by the day it was done, not the Friday it was set for", () => {
    expect(visitDayOf(done())).toBe("2026-11-18")
    expect(dayOfVisit(done())).toBe("2026-11-18")
  })

  it("agrees with the customer's account on the same repair", () => {
    const v = done()
    expect(visitDayOf(v)).toBe(visitDay({ status: v.status, scheduledOn: v.scheduledOn ?? null, completedOn: v.completedOn }))
  })

  it("reads any other visit by its scheduled day, from startAt when scheduledOn is absent", () => {
    expect(visitDayOf({ ...done(), status: "scheduled", completedOn: undefined })).toBe("2026-11-20")
    expect(visitDayOf({ status: "scheduled", startAt: "2026-11-20T16:00:00Z" })).toBe("2026-11-20")
    expect(visitDayOf({ status: "unscheduled" })).toBeUndefined()
  })

  it("falls back to the scheduled day for a done visit with no done day", () => {
    expect(visitDayOf(done({ completedOn: undefined }))).toBe("2026-11-20")
  })
})

describe("wasScheduledDay", () => {
  it("is the scheduled day only when a done visit was done on another day", () => {
    expect(wasScheduledDay(done())).toBe("2026-11-20")
    expect(wasScheduledDay(done({ completedOn: "2026-11-20" }))).toBeUndefined()
    expect(wasScheduledDay({ ...done(), status: "scheduled" })).toBeUndefined()
    expect(scheduledDayOf(done())).toBe("2026-11-20")
  })
})
