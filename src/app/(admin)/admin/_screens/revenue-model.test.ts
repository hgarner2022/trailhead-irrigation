import { describe, expect, it } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, MonthTotal, Pass } from "@/lib/admin/types"
import { hasRenewals, outstanding, renewals, revenueContext, seriesFor, seriesWords, upcomingRows } from "./revenue-model"

const data = snapshot as AdminData
const TODAY = "2026-11-12T19:56:30Z"

describe("seriesFor", () => {
  it("puts the latest year first and nothing second when the year before is missing", () => {
    const series = seriesFor(data.monthTotals)
    expect(series?.length).toBe(1)
    expect(series?.[0].year).toBe(2026)
    expect(series?.[0].data).toHaveLength(8)
    expect(seriesWords(series)).toBe("2026")
  })

  it("adds the year before as the second series when it is there", () => {
    const y2025: MonthTotal[] = [{ year: 2025, month: 10, revenue: 14690, visits: 120 }]
    const series = seriesFor([...y2025, ...data.monthTotals])
    expect(series?.map((s) => s?.year)).toEqual([2026, 2025])
    expect(series?.[1]?.data).toEqual(y2025)
    expect(seriesWords(series)).toBe("2026 against 2025")
  })

  it("is undefined with no totals", () => {
    expect(seriesFor([])).toBeUndefined()
    expect(seriesWords(undefined)).toBe("")
  })
})

describe("revenueContext", () => {
  it("names the comparison only when last year is there", () => {
    const y2025: MonthTotal[] = [{ year: 2025, month: 10, revenue: 14690, visits: 120 }]
    expect(revenueContext(seriesFor(data.monthTotals), 2026, 2027)).toBe("2026, and the 2027 Season Pass commitments.")
    expect(revenueContext(seriesFor([...y2025, ...data.monthTotals]), 2026, 2027)).toBe("2026 against 2025, and the 2027 Season Pass commitments.")
    expect(revenueContext(undefined, 2026, 2027)).toBe("2026, and the 2027 Season Pass commitments.")
  })
})

describe("upcomingRows", () => {
  const booked = (pass: Pass, at: string): Pass => ({
    ...pass,
    visits: pass.visits.map((v) => (v.kind === "inspection" ? { ...v, scheduledAt: at } : v)),
  })

  it("has nothing in the snapshot, where every booked visit is already charged", () => {
    expect(upcomingRows(data.passes, TODAY)).toEqual([])
  })

  it("lists booked, uncharged visits soonest first with the written visit name", () => {
    const passes = [booked(data.passes[2], "2027-07-14T15:00:00Z"), booked(data.passes[0], "2027-07-09T15:00:00Z")]
    expect(upcomingRows(passes, TODAY)).toEqual([
      { key: "p1-inspection", date: "Jul 9", name: "Andrea", town: "Erie", visit: "Inspection", amount: 145 },
      { key: "p3-inspection", date: "Jul 14", name: "Abby", town: "Broomfield", visit: "Inspection", amount: 145 },
    ])
    expect(upcomingRows(passes, TODAY, 1)).toHaveLength(1)
  })

  it("reads a 7 pm Denver booking as that Denver day", () => {
    // 01:00 UTC on July 9 is 7 pm on July 8 in Denver.
    const passes = [booked(data.passes[0], "2027-07-09T01:00:00Z")]
    expect(upcomingRows(passes, TODAY)[0].date).toBe("Jul 8")
    // And a booking at 7 pm on the evening of `today` is still upcoming, not past.
    const tonight = [booked(data.passes[0], "2026-11-13T02:00:00Z")]
    expect(upcomingRows(tonight, TODAY)).toHaveLength(1)
  })
})

describe("renewals", () => {
  const earlier = (pass: Pass, id: string, status: Pass["status"], clientId = pass.clientId): Pass => ({ ...pass, id, season: 2026, status, clientId })

  it("is empty while every pass is in the current season", () => {
    expect(hasRenewals(data.passes, 2027)).toBe(false)
    expect(renewals(data.passes, 2027)).toEqual({ renewed: [], lapsed: [], notYetAsked: [] })
  })

  it("counts a client with a current pass as renewed and leaves them out of the asks", () => {
    const renewed = earlier(data.passes[0], "old-1", "active") // Andrea, c100, holds p1 for 2027
    const passes = [renewed, ...data.passes]
    expect(hasRenewals(passes, 2027)).toBe(true)
    const pipeline = renewals(passes, 2027)
    expect(pipeline.renewed).toEqual([renewed])
    expect(pipeline.lapsed).toEqual([])
    expect(pipeline.notYetAsked).toEqual([])
  })

  it("splits the rest into lapsed and not yet asked by status", () => {
    const lapsed = earlier(data.passes[1], "old-2", "lapsed", "c900")
    const active = earlier(data.passes[2], "old-3", "active", "c901")
    const cancelled = earlier(data.passes[3], "old-4", "cancelled", "c902")
    const pipeline = renewals([lapsed, active, cancelled, ...data.passes], 2027)
    expect(pipeline.renewed).toEqual([])
    expect(pipeline.lapsed).toEqual([lapsed])
    expect(pipeline.notYetAsked).toEqual([active, cancelled])
  })
})

describe("outstanding", () => {
  const visit = (id: string, over: Partial<AdminData["visits"][number]> = {}) => ({ id, clientId: "c", clientName: "Dana Reed", town: "Erie" as const, kind: "repair" as const, status: "completed" as const, isPass: false, jobberUrl: "", ...over })
  const money = (owed: number) => ({ paid: 0, total: owed, owed, words: `$${owed} owed` })
  const job = (id: string, visitIds: string[], over: Partial<NonNullable<AdminData["jobs"]>[number]> = {}) => ({ id, customerId: "c", kind: "repair" as const, status: "open" as const, source: "office" as const, visitIds, money: money(145), ...over })
  const bill = (jobId: string, total: number) => ({ id: `inv-${jobId}`, jobId, number: "INV-2026-0001", amount: total, tax: 0, total, sentOn: "2026-11-01", dueOn: "2026-11-15", status: "sent" as const, visitIds: [] })

  it("is nothing to say without the sold jobs", () => {
    expect(outstanding({ jobs: undefined, visits: [] })).toBeUndefined()
  })

  it("adds open bills at their total and Done and Owed jobs at what they owe, each job once", () => {
    const visits = [visit("a"), visit("b"), visit("c", { status: "scheduled" }), visit("d"), visit("e")]
    const jobs = [
      job("ja", ["a"]), // done and owed: $145
      job("jb", ["b"], { invoice: bill("jb", 160), money: money(145) }), // billed: the bill's $160, not $145 and not both
      job("jc", ["c"]), // not done: nothing yet
      job("jd", ["d"], { kind: "pass" }), // a pass is charged on its own
      job("je", ["e"], { money: { paid: 145, total: 145, owed: 0, words: "Paid" } }), // paid
    ]
    expect(outstanding({ jobs, visits })).toEqual({ total: 305, jobs: 2 })
  })

  it("counts a bill on a part-done job by the bill's total alone, leaving the lines still ahead out", () => {
    const visits = [visit("a"), visit("b", { status: "scheduled" })]
    const jobs = [job("ja", ["a", "b"], { invoice: bill("ja", 100), money: money(245) })]
    expect(outstanding({ jobs, visits })).toEqual({ total: 100, jobs: 1 })
  })
})
