import { describe, expect, it } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, MonthTotal, Pass } from "@/lib/admin/types"
import { hasRenewals, renewalRows, seriesFor, seriesWords, upcomingRows } from "./revenue-model"

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

describe("upcomingRows", () => {
  it("has nothing in the snapshot, where every booked visit is already charged", () => {
    expect(upcomingRows(data.passes, TODAY)).toEqual([])
  })

  it("lists booked, uncharged visits soonest first with the written visit name", () => {
    const booked = (pass: Pass, at: string): Pass => ({
      ...pass,
      visits: pass.visits.map((v) => (v.kind === "inspection" ? { ...v, scheduledAt: at } : v)),
    })
    const passes = [booked(data.passes[2], "2027-07-14T15:00:00Z"), booked(data.passes[0], "2027-07-09T15:00:00Z")]
    expect(upcomingRows(passes, TODAY)).toEqual([
      { key: "p1-inspection", date: "Jul 9", name: "Andrea", town: "Erie", visit: "Inspection", amount: 145 },
      { key: "p3-inspection", date: "Jul 14", name: "Abby", town: "Broomfield", visit: "Inspection", amount: 145 },
    ])
    expect(upcomingRows(passes, TODAY, 1)).toHaveLength(1)
  })
})

describe("renewals", () => {
  it("is false while every pass is in the current season", () => {
    expect(hasRenewals(data.passes, 2027)).toBe(false)
    expect(renewalRows(data.passes, 2027)).toEqual([])
  })

  it("finds passes from an earlier season", () => {
    const old: Pass = { ...data.passes[0], id: "old", season: 2026 }
    expect(hasRenewals([old, ...data.passes], 2027)).toBe(true)
    expect(renewalRows([old, ...data.passes], 2027)).toEqual([old])
  })
})
