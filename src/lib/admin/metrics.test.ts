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
const lapsed = pass({
  id: "p3",
  firstName: "Lee",
  status: "lapsed",
  visits: [
    { ...turnOn, amount: 1000, scheduledAt: "2027-04-02T16:00:00Z", chargedAt: "2027-04-02T17:00:00Z" },
    { ...inspection, amount: 1000, scheduledAt: "2027-07-02T16:00:00Z" },
    { ...blowout, amount: 1000, scheduledAt: "2027-10-02T16:00:00Z" },
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
  it("sums only the charged visits of active passes", () => {
    const partlyCharged = pass({
      id: "p4",
      visits: [{ ...turnOn, chargedAt: "2027-04-20T17:12:00Z" }, inspection, blowout],
    })
    expect(chargedSoFar([partlyCharged, cancelled])).toBe(145)
  })
})

describe("a lapsed pass is no longer a commitment", () => {
  it("counts nowhere", () => {
    expect(committedRevenue([lapsed])).toBe(0)
    expect(chargedSoFar([lapsed])).toBe(0)
    expect(committedByMonth([lapsed], 2027)).toEqual([])
    expect(upcomingCharges([lapsed], "2027-01-01")).toEqual([])
  })
})

describe("committedByMonth", () => {
  it("places windows and scheduled dates in their months, in month order", () => {
    const p = pass({
      id: "p5",
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
    const p = pass({ id: "p6", visits: [{ ...turnOn, scheduledAt: "2027-05-03T15:00:00Z" }] })
    expect(committedByMonth([p], 2027)).toEqual([{ month: 5, committed: 145, charged: 0 }])
  })
  it("reads the first month named anywhere in the window", () => {
    const months = (window: string) =>
      committedByMonth([pass({ id: "p7", visits: [{ ...turnOn, window }] })], 2027).map((r) => r.month)
    expect(months("early April")).toEqual([4])
    expect(months("Late April to May")).toEqual([4])
    expect(months("Week of October 13")).toEqual([10])
    expect(months("Oct 13")).toEqual([10])
  })
  it("drops a visit whose window names no month", () => {
    const p = pass({ id: "p8", visits: [{ ...turnOn, window: "sometime" }, inspection] })
    expect(committedByMonth([p], 2027)).toEqual([{ month: 7, committed: 145, charged: 0 }])
  })
  it("ignores passes from other seasons", () => {
    const other = pass({ id: "p9", season: 2026, visits: [turnOn] })
    expect(committedByMonth([other], 2027)).toEqual([])
  })
})

describe("monthComparison", () => {
  const totals: MonthTotal[] = [
    { year: 2025, month: 10, revenue: 16000, visits: 100 },
    { year: 2026, month: 10, revenue: 18365, visits: 162 },
    { year: 2026, month: 11, revenue: 3245, visits: 38 },
    { year: 2025, month: 9, revenue: 10000, visits: 40 },
    { year: 2026, month: 9, revenue: 9150, visits: 30 },
    { year: 2025, month: 8, revenue: 1000, visits: 4 },
    { year: 2026, month: 8, revenue: 999, visits: 4 },
  ]
  it("compares a month with the same month a year earlier", () => {
    expect(monthComparison(totals, 2026, 10)).toEqual({ current: 18365, previous: 16000, deltaPct: 15 })
  })
  it("rounds a negative delta symmetrically", () => {
    expect(monthComparison(totals, 2026, 9)).toEqual({ current: 9150, previous: 10000, deltaPct: -9 })
  })
  it("never returns negative zero", () => {
    expect(Object.is(monthComparison(totals, 2026, 8).deltaPct, 0)).toBe(true)
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
    id: "p10",
    firstName: "Dana",
    town: "Longmont",
    visits: [
      { ...turnOn, scheduledAt: "2027-04-20T16:00:00Z", chargedAt: "2027-04-20T17:00:00Z" },
      { ...inspection, scheduledAt: "2027-07-14T16:00:00Z" },
      { ...blowout, scheduledAt: "2027-10-05T16:00:00Z" },
    ],
  })
  const cancelledScheduled = pass({
    id: "p11",
    status: "cancelled",
    visits: [{ ...inspection, scheduledAt: "2027-06-01T16:00:00Z" }],
  })
  it("lists uncharged scheduled visits from the date, soonest first", () => {
    expect(upcomingCharges([p, cancelledScheduled], "2027-05-01")).toEqual([
      { passId: "p10", firstName: "Dana", town: "Longmont", kind: "inspection", amount: 145, scheduledAt: "2027-07-14T16:00:00Z" },
      { passId: "p10", firstName: "Dana", town: "Longmont", kind: "blowout", amount: 95, scheduledAt: "2027-10-05T16:00:00Z" },
    ])
  })
  it("includes a visit scheduled on the from day itself", () => {
    expect(upcomingCharges([p], "2027-07-14").map((c) => c.kind)).toEqual(["inspection", "blowout"])
    expect(upcomingCharges([p], "2027-07-14T23:59:00Z").map((c) => c.kind)).toEqual(["inspection", "blowout"])
    expect(upcomingCharges([p], "2027-07-15").map((c) => c.kind)).toEqual(["blowout"])
  })
  it("caps at the limit", () => {
    expect(upcomingCharges([p], "2027-01-01", 1)).toHaveLength(1)
  })
  it("reads the from day in a time zone when one is given", () => {
    // 2027-07-15T03:00Z is 9 pm on July 14 in Denver, so the inspection on the 14th is still from that day.
    expect(upcomingCharges([p], "2027-07-15T03:00:00Z").map((c) => c.kind)).toEqual(["blowout"])
    expect(upcomingCharges([p], "2027-07-15T03:00:00Z", 10, "America/Denver").map((c) => c.kind)).toEqual(["inspection", "blowout"])
  })
  it("sorts across passes", () => {
    const later = pass({ id: "p12", visits: [{ ...blowout, scheduledAt: "2027-10-01T16:00:00Z" }] })
    expect(upcomingCharges([p, later], "2027-08-01").map((c) => c.passId)).toEqual(["p12", "p10"])
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
  const list = [
    invoice("unpaid", "2026-11-01", 100),
    invoice("overdue", "2026-11-11T00:00:00Z", 50),
    invoice("unpaid", "2026-11-12", 999), // due today is not yet overdue
    invoice("paid", "2026-10-01", 999),
  ]
  it("counts unpaid invoices whose due date has passed", () => {
    expect(invoicesOverdue(list, "2026-11-12")).toEqual({ count: 2, total: 150 })
  })
  it("accepts a full timestamp for today", () => {
    expect(invoicesOverdue(list, "2026-11-12T18:30:00Z")).toEqual({ count: 2, total: 150 })
  })
  it("reads the boundary day in a time zone when one is given", () => {
    // 2026-11-13T02:00Z is still Thursday the 12th in Denver, so the invoice due on the 12th is not yet overdue there.
    expect(invoicesOverdue(list, "2026-11-13T02:00:00Z")).toEqual({ count: 3, total: 1149 })
    expect(invoicesOverdue(list, "2026-11-13T02:00:00Z", "America/Denver")).toEqual({ count: 2, total: 150 })
  })
})

describe("visitsOn", () => {
  const visit = (id: string, startAt?: string, status: Visit["status"] = "scheduled"): Visit => ({
    id, clientId: "c1", clientName: "A", town: "Erie", kind: "repair", status, startAt, isPass: false, jobberUrl: "",
  })
  it("returns that day's visits sorted by start time", () => {
    const list = [visit("late", "2026-11-12T20:00:00Z"), visit("other", "2026-11-13T09:00:00Z"), visit("early", "2026-11-12T15:00:00Z"), visit("none")]
    expect(visitsOn(list, "2026-11-12").map((v) => v.id)).toEqual(["early", "late"])
  })
  it("leaves cancelled visits off the day", () => {
    const list = [visit("kept", "2026-11-12T15:00:00Z"), visit("gone", "2026-11-12T16:00:00Z", "cancelled")]
    expect(visitsOn(list, "2026-11-12").map((v) => v.id)).toEqual(["kept"])
  })
  it("groups by the calendar day of a time zone when one is given", () => {
    // 5:30 pm Thursday in Denver is 00:30Z Friday; 7 pm Thursday in Denver is 02:00Z Friday.
    const list = [visit("noon", "2026-11-12T19:00:00Z"), visit("evening", "2026-11-13T00:30:00Z"), visit("friday", "2026-11-13T19:00:00Z")]
    expect(visitsOn(list, "2026-11-13T02:00:00Z").map((v) => v.id)).toEqual(["evening", "friday"])
    expect(visitsOn(list, "2026-11-13T02:00:00Z", "America/Denver").map((v) => v.id)).toEqual(["noon", "evening"])
    expect(visitsOn(list, "2026-11-13T19:00:00Z", "America/Denver").map((v) => v.id)).toEqual(["friday"])
  })
})

describe("formatMoney", () => {
  it("formats whole dollars with thousands separators", () => {
    expect(formatMoney(999)).toBe("$999")
    expect(formatMoney(1000)).toBe("$1,000")
    expect(formatMoney(1234)).toBe("$1,234")
    expect(formatMoney(1234567)).toBe("$1,234,567")
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
