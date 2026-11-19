import { describe, expect, it } from "vitest"
import { andrea, canceledRepairJob, repairJob, TODAY } from "@/app/(account)/account/_screens/account-fixtures"
import { portalTimeline } from "./timeline"

// UX audit row 8: two Repair rows on Nov 18 (one canceled, one done) cannot be told apart by day alone.
describe("a canceled row and a done row on the same day", () => {
  const doneToday = { ...repairJob, id: "job_today", visits: repairJob.visits.map((v) => ({ ...v, id: "v-done", jobId: "job_today", completedOn: "2026-11-18", scheduledOn: "2026-11-18" })) }
  const canceledToday = { ...canceledRepairJob, id: "job_gone", visits: canceledRepairJob.visits.map((v) => ({ ...v, id: "v-a-canceled", jobId: "job_gone", canceledOn: "2026-11-18" })) }

  it("reads Canceled and the day in words, in this year without the year", () => {
    const row = portalTimeline(andrea, [canceledToday], "2026-11-20").past[0]!
    expect(row.dayWords).toBe("Canceled Nov 18")
    expect(row.pill.label).toBe("Canceled")
  })
  it("keeps the year for another year", () => {
    expect(portalTimeline(andrea, [canceledToday], "2027-02-01").past[0]!.dayWords).toBe("Canceled Nov 18, 2026")
  })
  it("sorts the canceled row after the done row of the same day, whatever their ids say", () => {
    for (const jobs of [[doneToday, canceledToday], [canceledToday, doneToday]]) {
      expect(portalTimeline(andrea, jobs, TODAY).past.map((r) => r.id)).toEqual(["v-done", "v-a-canceled"])
    }
  })
})
