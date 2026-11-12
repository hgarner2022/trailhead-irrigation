import { describe, it, expect } from "vitest"
import type { BlowoutWeek, Invoice, MonthTotal, Pass, PassVisit, Quote, Visit } from "./types"
import {
  chargedSoFar,
  committedByMonth,
  committedRevenue,
  formatDelta,
  formatMoney,
  invoicesOverdue,
  monthComparison,
  quotesAwaiting,
  spotsLeft,
  upcomingCharges,
  visitsOn,
} from "./metrics"

function pass(over: Partial<Pass> & { visits: PassVisit[] }): Pass {
  return {
    id: "p1",
    number: "TH-2027-0001",
    season: 2027,
    clientId: "c1",
    firstName: "Andrea",
    town: "Erie",
    zones: 6,
    blowoutWeek: "2027-10-04",
    status: "active",
    stripeUrl: "https://dashboard.stripe.com/customers/cus_1",
    jobberUrl: "https://secure.getjobber.com/clients/1",
    ...over,
  }
}

const turnOn: PassVisit = { kind: "turn-on", window: "April to May", amount: 145 }
const inspection: PassVisit = { kind: "inspection", window: "July", amount: 145 }
const blowout: PassVisit = { kind: "blowout", window: "October, week of the 4th", amount: 95 }

const active = pass({ id: "p1", visits: [turnOn, inspection, blowout] })
const cancelled = pass({
  id: "p2",
  firstName: "Nick",
  status: "cancelled",
  visits: [
    { ...turnOn, amount: 1000, chargedAt: "2027-04-01T00:00:00Z" },
    { ...inspection, amount: 1000 },
    { ...blowout, amount: 1000 },
  ],
})

describe("committedRevenue", () => {
  it("sums the visits of active passes only", () => {
    expect(committedRevenue([active, cancelled])).toBe(145 + 145 + 95)
  })
  it("is 0 with no passes", () => {
    expect(committedRevenue([])).toBe(0)
  })
})

describe("chargedSoFar", () => {
  it("sums only the charged visits of passes that are not cancelled", () => {
    const partlyCharged = pass({
      id: "p3",
      visits: [{ ...turnOn, chargedAt: "2027-04-20T17:12:00Z" }, inspection, blowout],
    })
    expect(chargedSoFar([partlyCharged, cancelled])).toBe(145)
  })
})

describe("committedByMonth", () => {
  it("places windows and scheduled dates in their months, in month order", () => {
    const p = pass({
      id: "p4",
      visits: [
        { ...turnOn, chargedAt: "2027-04-20T17:12:00Z" },
        inspection,
        { ...blowout, scheduledAt: "2027-10-05T15:00:00Z" },
      ],
    })
    expect(committedByMonth([p, cancelled], 2027)).toEqual([
      { month: 4, committed: 145, charged: 145 },
      { month: 7, committed: 145, charged: 0 },
      { month: 10, committed: 95, charged: 0 },
    ])
  })
  it("uses scheduledAt over the window when both are set", () => {
    const p = pass({ id: "p5", visits: [{ ...turnOn, scheduledAt: "2027-05-03T15:00:00Z" }] })
    expect(committedByMonth([p], 2027)).toEqual([{ month: 5, committed: 145, charged: 0 }])
  })
  it("ignores passes from other seasons", () => {
    const other = pass({ id: "p6", season: 2026, visits: [turnOn] })
    expect(committedByMonth([other], 2027)).toEqual([])
  })
})

describe("monthComparison", () => {
  const totals: MonthTotal[] = [
    { year: 2025, month: 10, revenue: 16000, visits: 100 },
    { year: 2026, month: 10, revenue: 18365, visits: 162 },
    { year: 2026, month: 11, revenue: 3245, visits: 38 },
  ]
  it("compares a month with the same month a year earlier", () => {
    expect(monthComparison(totals, 2026, 10)).toEqual({ current: 18365, previous: 16000, deltaPct: 15 })
  })
  it("has no comparison when the previous year is missing", () => {
    expect(monthComparison(totals, 2026, 11)).toEqual({ current: 3245, previous: null, deltaPct: null })
  })
  it("is 0 with no comparison when the month itself is missing", () => {
    expect(monthComparison(totals, 2026, 3)).toEqual({ current: 0, previous: null, deltaPct: null })
  })
  it("has no delta when the previous year was zero", () => {
    const zero: MonthTotal[] = [
      { year: 2025, month: 4, revenue: 0, visits: 0 },
      { year: 2026, month: 4, revenue: 500, visits: 2 },
    ]
    expect(monthComparison(zero, 2026, 4)).toEqual({ current: 500, previous: 0, deltaPct: null })
  })
})

describe("spotsLeft", () => {
  const week = (taken: number): BlowoutWeek => ({ season: 2027, weekStart: "2027-10-04", capacity: 20, taken, towns: ["Erie"] })
  it("is capacity minus taken", () => {
    expect(spotsLeft(week(3))).toBe(17)
  })
  it("never goes below zero", () => {
    expect(spotsLeft(week(25))).toBe(0)
  })
})

describe("upcomingCharges", () => {
  const p = pass({
    id: "p7",
    firstName: "Dana",
    town: "Longmont",
    visits: [
      { ...turnOn, scheduledAt: "2027-04-20T16:00:00Z", chargedAt: "2027-04-20T17:00:00Z" },
      { ...inspection, scheduledAt: "2027-07-14T16:00:00Z" },
      { ...blowout, scheduledAt: "2027-10-05T16:00:00Z" },
    ],
  })
  const cancelledScheduled = pass({
    id: "p8",
    status: "cancelled",
    visits: [{ ...inspection, scheduledAt: "2027-06-01T16:00:00Z" }],
  })
  it("lists uncharged scheduled visits from the date, soonest first", () => {
    expect(upcomingCharges([p, cancelledScheduled], "2027-05-01")).toEqual([
      { passId: "p7", firstName: "Dana", town: "Longmont", kind: "inspection", amount: 145, scheduledAt: "2027-07-14T16:00:00Z" },
      { passId: "p7", firstName: "Dana", town: "Longmont", kind: "blowout", amount: 95, scheduledAt: "2027-10-05T16:00:00Z" },
    ])
  })
  it("caps at the limit", () => {
    expect(upcomingCharges([p], "2027-01-01", 1)).toHaveLength(1)
  })
  it("sorts across passes", () => {
    const later = pass({ id: "p9", visits: [{ ...blowout, scheduledAt: "2027-10-01T16:00:00Z" }] })
    expect(upcomingCharges([p, later], "2027-08-01").map((c) => c.passId)).toEqual(["p9", "p7"])
  })
})

describe("quotesAwaiting", () => {
  const quote = (status: Quote["status"], total: number): Quote => ({
    id: `q${total}`, clientName: "A", town: "Erie", total, sentAt: "2026-11-01", status, jobberUrl: "",
  })
  it("counts and totals the awaiting quotes", () => {
    expect(quotesAwaiting([quote("awaiting", 300), quote("approved", 50), quote("awaiting", 200)])).toEqual({ count: 2, total: 500 })
  })
})

describe("invoicesOverdue", () => {
  const invoice = (status: Invoice["status"], dueAt: string, total: number): Invoice => ({
    id: `i${total}`, clientName: "A", total, issuedAt: "2026-10-01", dueAt, status, jobberUrl: "",
  })
  it("counts unpaid invoices whose due date has passed", () => {
    const list = [
      invoice("unpaid", "2026-11-01", 100),
      invoice("overdue", "2026-11-11", 50),
      invoice("unpaid", "2026-11-12", 999), // due today is not yet overdue
      invoice("paid", "2026-10-01", 999),
    ]
    expect(invoicesOverdue(list, "2026-11-12")).toEqual({ count: 2, total: 150 })
  })
})

describe("visitsOn", () => {
  const visit = (id: string, startAt?: string): Visit => ({
    id, clientId: "c1", clientName: "A", town: "Erie", kind: "repair", status: "scheduled", startAt, isPass: false, jobberUrl: "",
  })
  it("returns that day's visits sorted by start time", () => {
    const list = [visit("late", "2026-11-12T20:00:00Z"), visit("other", "2026-11-13T09:00:00Z"), visit("early", "2026-11-12T15:00:00Z"), visit("none")]
    expect(visitsOn(list, "2026-11-12").map((v) => v.id)).toEqual(["early", "late"])
  })
})

describe("formatMoney", () => {
  it("formats whole dollars with thousands separators", () => {
    expect(formatMoney(1234)).toBe("$1,234")
    expect(formatMoney(18365.4)).toBe("$18,365")
    expect(formatMoney(0)).toBe("$0")
    expect(formatMoney(-50)).toBe("-$50")
  })
})

describe("formatDelta", () => {
  it("signs the percentage and names a missing comparison", () => {
    expect(formatDelta(12)).toBe("+12%")
    expect(formatDelta(-8)).toBe("-8%")
    expect(formatDelta(0)).toBe("0%")
    expect(formatDelta(null)).toBe("no comparison")
  })
})
