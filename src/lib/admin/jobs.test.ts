import { describe, expect, it } from "vitest"
import snapshot from "./fixtures/snapshot.json"
import { JOB_WORDS, NOT_CLOSED_LOOKBACK_DAYS, dayWords, jobCounts, jobMoney, jobOf, statesOf, passVisitJob, visitJob, windowLabel, type JobRow } from "./jobs"
import type { AdminData, PassVisit, Visit } from "./types"

const TODAY = "2026-11-12"
const TZ = "America/Denver"
const state = (row: JobRow, today = TODAY) => jobOf(row, today).state

describe("jobOf", () => {
  it("has one word for each of the eight states", () => {
    expect(JOB_WORDS).toEqual({
      "needs-a-day": "Needs a day",
      scheduled: "Scheduled",
      routed: "Routed",
      done: "Done",
      charged: "Charged",
      "charge-failed": "Charge failed",
      cancelled: "Cancelled",
      skipped: "Skipped",
    })
  })

  it("reads Needs a day, Scheduled and Routed from the day and the start time", () => {
    expect(state({ status: "unscheduled" })).toBe("needs-a-day")
    expect(state({ status: "scheduled", scheduledOn: "2026-11-20" })).toBe("scheduled")
    expect(state({ status: "scheduled", scheduledOn: "2026-11-20", startTime: "09:30" })).toBe("routed")
    // An empty start time is no start time.
    expect(state({ status: "scheduled", scheduledOn: "2026-11-20", startTime: null })).toBe("scheduled")
  })

  it("reads Done, Charged and Charge failed from the visit and its charge", () => {
    expect(state({ status: "completed", completedOn: "2026-11-10" })).toBe("done")
    expect(state({ status: "completed", completedOn: "2026-11-10", chargedAt: "2026-11-10T20:00:00Z" })).toBe("charged")
    expect(state({ status: "completed", completedOn: "2026-11-10", chargeFailed: true })).toBe("charge-failed")
    expect(state({ status: "completed", completedOn: "2026-11-10", cardFailedAt: "2026-11-11T10:00:00Z" })).toBe("charge-failed")
  })

  it("reads a failed card only on a job that is done: a future visit stays Scheduled", () => {
    expect(state({ status: "scheduled", scheduledOn: "2026-11-20", cardFailedAt: "2026-11-11T10:00:00Z" })).toBe("scheduled")
    expect(state({ status: "unscheduled", cardFailedAt: "2026-11-11T10:00:00Z" })).toBe("needs-a-day")
  })

  it("lets a charge win over a failed card, and a failed charge row win over everything but cancelled and skipped", () => {
    expect(state({ status: "completed", completedOn: "2026-11-10", chargedAt: "2026-11-10T20:00:00Z", cardFailedAt: "2026-11-11T10:00:00Z" })).toBe("charged")
    expect(state({ status: "scheduled", scheduledOn: "2026-11-20", chargeFailed: true })).toBe("charge-failed")
    expect(state({ status: "cancelled", chargeFailed: true })).toBe("cancelled")
    expect(state({ status: "skipped", scheduledOn: "2026-11-20" })).toBe("skipped")
  })

  it("flags Not closed on a job whose day has passed and was not marked done, and on nothing else", () => {
    expect(jobOf({ status: "scheduled", scheduledOn: "2026-11-11" }, TODAY)).toMatchObject({ state: "scheduled", notClosed: true, day: "2026-11-11" })
    expect(jobOf({ status: "scheduled", scheduledOn: "2026-11-11", startTime: "08:00" }, TODAY).notClosed).toBe(true)
    // Today is not yet past, and a job with a day ahead is open, not unclosed.
    expect(jobOf({ status: "scheduled", scheduledOn: TODAY }, TODAY).notClosed).toBe(false)
    expect(jobOf({ status: "scheduled", scheduledOn: "2026-11-13" }, TODAY).notClosed).toBe(false)
    // Done, cancelled, skipped and day-less jobs are never unclosed.
    expect(jobOf({ status: "completed", scheduledOn: "2026-11-01", completedOn: "2026-11-01" }, TODAY).notClosed).toBe(false)
    expect(jobOf({ status: "cancelled", scheduledOn: "2026-11-01" }, TODAY).notClosed).toBe(false)
    expect(jobOf({ status: "skipped", scheduledOn: "2026-11-01" }, TODAY).notClosed).toBe(false)
    expect(jobOf({ status: "unscheduled" }, TODAY).notClosed).toBe(false)
  })

  it("keeps the old not-closed status word as Scheduled with the flag", () => {
    expect(jobOf({ status: "not-closed" }, TODAY)).toMatchObject({ state: "scheduled", notClosed: true })
  })
})

describe("visitJob and passVisitJob", () => {
  const visit = (over: Partial<Visit>): Visit => ({ id: "v", clientId: "c", clientName: "A", town: "Erie", kind: "turn-on", status: "scheduled", isPass: true, jobberUrl: "", ...over })

  it("read a calendar visit's day off its start instant in Mountain time", () => {
    // 03:00Z on Nov 11 is 8 pm on Nov 10 in Denver: the day passed.
    expect(visitJob(visit({ startAt: "2026-11-11T03:00:00Z" }), TODAY, TZ)).toMatchObject({ state: "scheduled", notClosed: true, day: "2026-11-10" })
    expect(visitJob(visit({ startAt: "2026-11-13T15:00:00Z", skipped: true, status: "cancelled" }), TODAY, TZ).state).toBe("skipped")
    expect(visitJob(visit({ startAt: "2026-11-13T15:00:00Z", startTime: "09:00" }), TODAY, TZ).state).toBe("routed")
  })

  it("read a pass visit's job off its own row and the pass's card", () => {
    const base: PassVisit = { kind: "turn-on", window: "May", amount: 145 }
    expect(passVisitJob({}, base, TODAY, TZ).state).toBe("needs-a-day")
    expect(passVisitJob({}, { ...base, scheduledAt: "2027-04-26T14:00:00Z" }, TODAY, TZ)).toMatchObject({ state: "scheduled", day: "2027-04-26" })
    expect(passVisitJob({}, { ...base, scheduledOn: "2027-04-26", startTime: "08:00" }, TODAY, TZ).state).toBe("routed")
    expect(passVisitJob({ cardFailedAt: "2026-11-10T00:00:00Z" }, { ...base, completedAt: "2026-11-09T17:00:00Z" }, TODAY, TZ).state).toBe("charge-failed")
    expect(passVisitJob({}, { ...base, completedAt: "2026-11-09T17:00:00Z", chargedAt: "2026-11-09T18:00:00Z" }, TODAY, TZ).state).toBe("charged")
    expect(passVisitJob({}, { ...base, chargeFailed: true, completedAt: "2026-11-09T17:00:00Z" }, TODAY, TZ).state).toBe("charge-failed")
  })
})

describe("windowLabel and dayWords", () => {
  it("writes a two-hour window the way a person says it", () => {
    expect(windowLabel("08:00")).toBe("8 to 10 am")
    expect(windowLabel("10:00")).toBe("10 am to 12 pm")
    expect(windowLabel("11:00", 180)).toBe("11 am to 2 pm")
    expect(windowLabel("13:30")).toBe("1:30 to 3:30 pm")
  })

  it("writes the day, with the window only once a start time is set, and nothing before a day", () => {
    const visit: PassVisit = { kind: "turn-on", window: "May", amount: 145 }
    expect(dayWords(visit)).toBe("")
    expect(dayWords(undefined)).toBe("")
    expect(dayWords({ ...visit, scheduledOn: "2027-04-26" })).toBe("Apr 26")
    expect(dayWords({ ...visit, scheduledOn: "2027-04-26", startTime: "08:00" })).toBe("Apr 26, 8 to 10 am")
    // The day is Mountain's, not UTC's.
    expect(dayWords({ ...visit, scheduledAt: "2027-07-09T01:00:00Z" })).toBe("Jul 8")
  })
})

describe("jobCounts", () => {
  const data = snapshot as AdminData

  it("counts jobs needing a day for active passes only", () => {
    const needing = data.passes.filter((p) => p.status === "active").flatMap((p) => p.visits).filter((v) => !v.scheduledAt && !v.completedAt).length
    expect(jobCounts({ passes: data.passes, visits: [] }, TODAY, TZ).needsDay).toBe(needing)
    expect(jobCounts({ passes: data.passes.map((p) => ({ ...p, status: "pending" as const })), visits: [] }, TODAY, TZ)).toEqual({ needsDay: 0, chargeFailed: 0, notClosed: 0, pendingPasses: data.passes.length })
  })

  it("counts not closed within the lookback and no further", () => {
    const visit = (id: string, day: string): Visit => ({ id, clientId: "c", clientName: "A", town: "Erie", kind: "blowout", status: "scheduled", startAt: `${day}T17:00:00Z`, isPass: false, jobberUrl: "" })
    expect(NOT_CLOSED_LOOKBACK_DAYS).toBe(14)
    const counts = jobCounts({ passes: [], visits: [visit("a", "2026-11-09"), visit("edge", "2026-10-29"), visit("old", "2026-10-28"), visit("ahead", "2026-11-13")] }, TODAY, TZ)
    expect(counts.notClosed).toBe(2)
  })

  it("counts a pass's job once, though live data holds it as a calendar visit as well", () => {
    const pass = { ...data.passes.find((p) => p.status === "active")!, visits: [{ kind: "turn-on" as const, window: "May", amount: 145, scheduledOn: "2026-11-05", scheduledAt: "2026-11-05T16:00:00Z" }] }
    const row: Visit = { id: "p-turn-on", clientId: pass.clientId, clientName: "A", town: "Erie", kind: "turn-on", status: "scheduled", startAt: "2026-11-05T16:00:00Z", isPass: true, jobberUrl: "" }
    expect(jobCounts({ passes: [pass], visits: [row] }, TODAY, TZ).notClosed).toBe(1)
  })
})

describe("statesOf: the work pill and the money pill", () => {
  const s = (row: JobRow) => statesOf(row, TODAY)
  it("reads the work from the day and the money from the charge", () => {
    expect(s({ status: "unscheduled" })).toMatchObject({ work: "needs-a-day", money: "not-yet", moneyLabel: "Not yet", dayPassed: false })
    expect(s({ status: "scheduled", scheduledOn: "2026-11-20" })).toMatchObject({ work: "scheduled", money: "not-yet" })
    expect(s({ status: "cancelled" })).toMatchObject({ work: "cancelled" })
    expect(s({ status: "completed", completedOn: "2026-11-10" })).toMatchObject({ work: "done", money: "not-yet" })
  })
  it("keeps a Scheduled visit whose day has passed Scheduled, with a note, and never calls Routed a state", () => {
    expect(s({ status: "scheduled", scheduledOn: "2026-11-09", startTime: "08:00" })).toMatchObject({ work: "scheduled", dayPassed: true, workLabel: "Scheduled" })
    expect(s({ status: "scheduled", scheduledOn: "2026-11-12" }).dayPassed).toBe(false)
  })
  it("says Not done with the reason until the visit has a day again", () => {
    expect(s({ status: "unscheduled", notDoneReason: "no-water" })).toMatchObject({ work: "not-done", workLabel: "Not done, no water on" })
    expect(s({ status: "scheduled", scheduledOn: "2026-11-20", notDoneReason: "no-water" }).work).toBe("scheduled")
  })
  it("says how the money came, or that it failed or a bill is out", () => {
    const done = { status: "completed" as const, completedOn: "2026-11-10" }
    expect(s({ ...done, chargedAt: "2026-11-10T20:00:00Z", paidMethod: "check" })).toMatchObject({ money: "paid", moneyLabel: "Paid, check" })
    expect(s({ ...done, chargedAt: "2026-11-10T20:00:00Z", paidMethod: "card_on_file" }).moneyLabel).toBe("Paid, card")
    expect(s({ ...done, chargeFailed: true }).money).toBe("failed")
    expect(s({ ...done, cardFailedAt: "2026-11-11T00:00:00Z" }).money).toBe("failed")
    expect(s({ ...done, billSent: true })).toMatchObject({ money: "bill-sent", moneyLabel: "Bill sent" })
  })
  it("sums a job's money across its visits, leaving cancelled ones out", () => {
    const paid = s({ status: "completed", completedOn: "2026-11-10", chargedAt: "2026-11-10T20:00:00Z" })
    expect(jobMoney([paid, s({ status: "scheduled", scheduledOn: "2026-11-20" }), s({ status: "cancelled" })])).toBe("1 of 2 paid")
  })
})
