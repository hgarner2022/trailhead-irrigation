import { NO_TAX } from "@/lib/jobs/tax"
import { describe, expect, it } from "vitest"
import snapshot from "./fixtures/snapshot.json"
import { JOB_WORDS, MONEY_WORDS, NOT_CLOSED_LOOKBACK_DAYS, dayWords, jobCounts, jobMoney, jobOf, moneyOf, paymentsOf, statesOf, passVisitJob, visitJob, visitPaid, visitPaidOn, visitPaidTotal, windowLabel, type JobRow } from "./jobs"
import type { AdminData, PassVisit, Visit } from "./types"

const TODAY = "2026-11-12"
const TZ = "America/Denver"
const state = (row: JobRow, today = TODAY) => jobOf(row, today).state
/** A charged visit carries one succeeded payment (a card charge unless it says how), the way a real charge leaves it. */
const charged = (method = "card_on_file") => ({ payments: [{ id: `p-${method}`, visitId: "", amount: 145, method, status: "succeeded" }] })

describe("jobOf", () => {
  it("has one word for each of the eight states", () => {
    expect(JOB_WORDS).toEqual({
      "needs-a-day": "Unscheduled",
      scheduled: "Scheduled",
      routed: "Routed",
      done: "Done",
      charged: "Charged",
      "charge-failed": "Charge failed",
      cancelled: "Cancelled",
      skipped: "Skipped",
    })
  })

  it("reads Unscheduled, Scheduled and Routed from the day and the start time", () => {
    expect(state({ status: "unscheduled" })).toBe("needs-a-day")
    expect(state({ status: "scheduled", scheduledOn: "2026-11-20" })).toBe("scheduled")
    expect(state({ status: "scheduled", scheduledOn: "2026-11-20", startTime: "09:30" })).toBe("routed")
    // An empty start time is no start time.
    expect(state({ status: "scheduled", scheduledOn: "2026-11-20", startTime: null })).toBe("scheduled")
  })

  it("reads Done, Charged and Charge failed from the visit and its charge", () => {
    expect(state({ status: "completed", completedOn: "2026-11-10" })).toBe("done")
    expect(state({ status: "completed", completedOn: "2026-11-10", ...charged() })).toBe("charged")
    expect(state({ status: "completed", completedOn: "2026-11-10", chargeFailed: true })).toBe("charge-failed")
    expect(state({ status: "completed", completedOn: "2026-11-10", cardFailedAt: "2026-11-11T10:00:00Z" })).toBe("charge-failed")
  })

  it("reads a failed card only on a job that is done: a future visit stays Scheduled", () => {
    expect(state({ status: "scheduled", scheduledOn: "2026-11-20", cardFailedAt: "2026-11-11T10:00:00Z" })).toBe("scheduled")
    expect(state({ status: "unscheduled", cardFailedAt: "2026-11-11T10:00:00Z" })).toBe("needs-a-day")
  })

  it("lets a charge win over a failed card, and a failed charge row win over everything but cancelled and skipped", () => {
    expect(state({ status: "completed", completedOn: "2026-11-10", ...charged(), cardFailedAt: "2026-11-11T10:00:00Z" })).toBe("charged")
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
    expect(passVisitJob({}, { ...base, completedAt: "2026-11-09T17:00:00Z", ...charged() }, TODAY, TZ).state).toBe("charged")
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
    expect(s({ status: "unscheduled" })).toMatchObject({ work: "needs-a-day", money: "not-yet", moneyLabel: "", workLabel: "Unscheduled", dayPassed: false })
    expect(s({ status: "scheduled", scheduledOn: "2026-11-20" })).toMatchObject({ work: "scheduled", money: "not-yet" })
    expect(s({ status: "cancelled" })).toMatchObject({ work: "cancelled" })
    expect(s({ status: "completed", completedOn: "2026-11-10" })).toMatchObject({ work: "done", money: "owed", moneyLabel: "Owed" })
    expect(s({ status: "completed", completedOn: "2026-11-10", ...charged("check") })).toMatchObject({ money: "paid", moneyLabel: "Paid, check" })
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
    expect(s({ ...done, ...charged("check") })).toMatchObject({ money: "paid", moneyLabel: "Paid, check" })
    expect(s({ ...done, ...charged("card_on_file") }).moneyLabel).toBe("Paid, card")
    expect(s({ ...done, chargeFailed: true }).money).toBe("failed")
    expect(s({ ...done, cardFailedAt: "2026-11-11T00:00:00Z" }).money).toBe("failed")
    expect(s({ ...done, billSent: true })).toMatchObject({ money: "bill-sent", moneyLabel: "Bill sent" })
    const invoice = { id: "i1", jobId: "j", number: "INV-2026-0001", amount: 145, tax: 0, total: 145, sentOn: "2026-11-10", dueOn: "2026-11-24", status: "sent" as const, visitIds: [] }
    expect(s({ ...done, invoice })).toMatchObject({ money: "bill-sent", moneyLabel: "Bill sent" })
    // an overdue bill still reads Bill sent; Paid and a failed card win over it
    expect(s({ ...done, invoice: { ...invoice, status: "overdue" } }).money).toBe("bill-sent")
    expect(s({ ...done, invoice, ...charged("check") }).money).toBe("paid")
    expect(s({ ...done, invoice, chargeFailed: true }).money).toBe("failed")
    // a visit that is not done yet reads nothing, whatever bill its job has
    expect(s({ status: "scheduled", scheduledOn: "2026-11-20", invoice }).money).toBe("not-yet")
  })
  it("reads a failed charge from the customer's card for every done pass visit, whichever pass it is on", () => {
    const done: PassVisit = { kind: "turn-on", window: "May", amount: 145, completedAt: "2026-11-09T17:00:00Z" }
    const failedAt = "2026-11-10T00:00:00Z"
    // the pass row carries the customer's cardFailedAt (the API serves it from the customer), so two passes of one customer agree
    expect(passVisitJob({ cardFailedAt: failedAt }, done, TODAY, TZ).state).toBe("charge-failed")
    expect(passVisitJob({ cardFailedAt: failedAt }, { ...done, id: "other-pass-visit" }, TODAY, TZ).state).toBe("charge-failed")
    expect(passVisitJob({ cardFailedAt: undefined }, done, TODAY, TZ).state).toBe("done")
  })
  it("sums a job's money across its visits from the payment rows, leaving cancelled ones out", () => {
    const visit = (id: string, over: Partial<Visit> = {}): Visit => ({ id, clientId: "c", clientName: "A", town: "Erie", kind: "repair", status: "completed", isPass: false, jobberUrl: "", price: 145, ...over })
    const row = (visitId: string, amount: number, over: Record<string, unknown> = {}) => ({ id: `pay-${visitId}`, visitId, amount, method: "check", status: "succeeded", ...over })
    const lines = [{ id: "l1", name: "Repair", quantity: 1, unitPrice: 145, taxable: false, visitId: "a" }, { id: "l2", name: "Repair", quantity: 1, unitPrice: 145, taxable: false, visitId: "b" }]
    // one of two visits paid
    expect(jobMoney({ lines, payments: [row("a", 145)] }, [visit("a"), visit("b")], NO_TAX)).toBe("1 of 2 paid, $145 owed")
    // nothing paid yet
    expect(jobMoney({ lines, payments: [] }, [visit("a"), visit("b")], NO_TAX)).toBe("$290 owed")
    // both paid, then a refund of one reopens the number
    expect(jobMoney({ lines, payments: [row("a", 145), row("b", 145)] }, [visit("a"), visit("b")], NO_TAX)).toBe("Paid")
    expect(jobMoney({ lines, payments: [row("a", 145), row("b", 145), row("b", -145, { id: "refund" })] }, [visit("a"), visit("b")], NO_TAX)).toBe("1 of 2 paid, $145 owed")
    // a cancelled visit is not counted
    expect(jobMoney({ lines: [lines[0]!], payments: [row("a", 145)] }, [visit("a"), visit("b", { status: "cancelled" })], NO_TAX)).toBe("Paid")
    // without the job's lines or payments (the fixtures) the visits stand in, with their own payments
    expect(jobMoney(undefined, [visit("a", { payments: [row("a", 145)] }), visit("b")], NO_TAX)).toBe("1 of 2 paid, $145 owed")
    // a job nothing has priced says nothing
    expect(jobMoney({ lines: [], payments: [] }, [visit("a", { price: 0 })], NO_TAX)).toBe("")
  })
})

describe("the money words are read from the payment rows", () => {
  const done = { status: "completed" as const, completedOn: "2026-11-10", visitId: "v" }
  const pay = (method: string, over: Record<string, unknown> = {}) => ({ id: `p-${method}`, visitId: "v", amount: 145, method, status: "succeeded", ...over })

  it("has one word for each money state, with Owed where it said Unpaid", () => {
    expect(MONEY_WORDS).toEqual({ "not-yet": "", paid: "Paid", owed: "Owed", "bill-sent": "Bill sent", failed: "Failed" })
  })

  it("says Paid with how, from the newest payment that arrived", () => {
    expect(moneyOf({ ...done, payments: [pay("card_on_file")] })).toEqual({ state: "paid", label: "Paid, card" })
    expect(moneyOf({ ...done, payments: [pay("check")] })).toEqual({ state: "paid", label: "Paid, check" })
    expect(moneyOf({ ...done, payments: [pay("venmo")] })).toEqual({ state: "paid", label: "Paid, Venmo" })
    expect(moneyOf({ ...done, payments: [pay("cash")] })).toEqual({ state: "paid", label: "Paid, cash" })
  })

  it("says Owed for a done visit with no payment row", () => {
    expect(moneyOf({ ...done, payments: [] })).toEqual({ state: "owed", label: "Owed" })
    expect(moneyOf(done)).toEqual({ state: "owed", label: "Owed" })
  })

  it("says nothing until the visit is done, and Owed again once a refund leaves nothing paid", () => {
    expect(moneyOf({ status: "scheduled", scheduledOn: "2026-11-20", visitId: "v", payments: [] }).state).toBe("not-yet")
    expect(moneyOf({ ...done, payments: [pay("check"), pay("check", { id: "refund", amount: -145 })] })).toEqual({ state: "owed", label: "Owed" })
  })

  it("says Failed from a failed newest row, and a retry that went through clears it", () => {
    expect(moneyOf({ ...done, payments: [pay("card_on_file", { status: "failed" })] })).toEqual({ state: "failed", label: "Failed" })
    expect(moneyOf({ ...done, payments: [pay("card_on_file", { id: "a", status: "failed" }), pay("card_on_file", { id: "b" })] })).toEqual({ state: "paid", label: "Paid, card" })
  })

  it("drives the pills and the job state from the same rows", () => {
    expect(statesOf({ ...done, payments: [pay("venmo")] }, TODAY)).toMatchObject({ work: "done", money: "paid", moneyLabel: "Paid, Venmo" })
    expect(jobOf({ ...done, payments: [pay("venmo")] }, TODAY).state).toBe("charged")
    expect(jobOf({ ...done, payments: [] }, TODAY).state).toBe("done")
    expect(jobOf({ ...done, payments: [pay("card_on_file", { status: "failed" })] }, TODAY).state).toBe("charge-failed")
  })

  it("reads a visit with no rows array as nothing paid: there is no charged flag to read instead", () => {
    expect(paymentsOf({ id: "v", amount: 145 })).toEqual([])
    expect(visitPaid({ id: "v", amount: 145 })).toBe(false)
    expect(visitPaid({ id: "v", payments: [] })).toBe(false)
    expect(visitPaidTotal({ id: "v", payments: [pay("check"), pay("check", { id: "r", amount: -45 })] })).toBe(100)
  })

  it("reads Owed, not Paid, for a visit with only part of its price, from the pill, the job state and visitPaid", () => {
    const part = { ...done, price: 145, payments: [pay("check", { amount: 100 })] }
    expect(moneyOf(part)).toEqual({ state: "owed", label: "Owed" })
    expect(jobOf(part, TODAY).state).toBe("done")
    expect(visitPaid({ id: "v", price: 145, payments: [{ ...pay("check", { amount: 100 }) }] })).toBe(false)
    expect(visitPaid({ id: "v", amount: 145, payments: [{ ...pay("check", { amount: 100 }) }] })).toBe(false)
    const full = { ...part, payments: [pay("check", { amount: 100 }), pay("cash", { id: "rest", amount: 45 })] }
    expect(moneyOf(full)).toEqual({ state: "paid", label: "Paid, cash" })
    expect(visitPaid({ id: "v", price: 145, payments: [pay("check", { amount: 145 })] })).toBe(true)
  })

  it("keeps the money on a visit that was paid and then cancelled", () => {
    expect(moneyOf({ status: "cancelled", visitId: "v", payments: [pay("check")] })).toEqual({ state: "paid", label: "Paid, check" })
    expect(moneyOf({ status: "cancelled", visitId: "v", payments: [] }).state).toBe("not-yet")
  })

  it("names the day the money last arrived", () => {
    expect(visitPaidOn({ id: "v", payments: [{ ...pay("check"), paidOn: "2026-11-09" }, { ...pay("cash", { id: "later" }), paidOn: "2026-11-11" }] })).toBe("2026-11-11")
    expect(visitPaidOn({ id: "v", payments: [] })).toBeUndefined()
    // after a full refund nothing arrived: no day, so the pass panel does not print "Paid Nov 9"
    expect(visitPaidOn({ id: "v", payments: [{ ...pay("check"), paidOn: "2026-11-09" }, { ...pay("check", { id: "refund", amount: -145, refundsPaymentId: "p-check" }), paidOn: "2026-11-10" }] })).toBeUndefined()
    expect(visitPaidOn({ id: "v" })).toBeUndefined()
  })
})
