import { describe, expect, it } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, Visit } from "@/lib/admin/types"
import { mapStops, moneyFigures, townsPhrase, weekView } from "./home-week"
import { filterFrom, MONEY_OPTIONS } from "./visits-model"

const base = snapshot as AdminData
const TODAY = "2026-11-12T19:56:30Z"
const visit = (over: Partial<Visit>): Visit => ({
  id: "x", clientId: "c", clientName: "Dana Reed", town: "Erie", kind: "repair", status: "scheduled", isPass: false, jobberUrl: "", jobId: "j",
  scheduledOn: "2026-11-12", startAt: "2026-11-12T15:00:00Z", price: 145, personId: "person_truck-1", personName: "Ryan Garner", ...over,
})

describe("weekView", () => {
  it("shows today when today has a visit", () => {
    const week = weekView({ ...base, visits: [visit({ id: "a" })] }, TODAY)
    expect(week).toMatchObject({ day: "2026-11-12", isToday: true, title: "Today", heading: "Thu, Nov 12 · 1 visit in Erie" })
    expect(week.people.map((p) => p.name)).toEqual(["Ryan Garner"])
  })

  it("files a visit under its person even when they have no truck now, as Visits does, never under No one yet", () => {
    const people = base.settings.people.map((p) => (p.id === "person_truck-2" ? { ...p, truck: undefined } : p))
    const week = weekView({ visits: [visit({ id: "a", personId: "person_truck-2", personName: "Second truck" })], settings: { ...base.settings, people } }, TODAY)
    expect(week.people.map((p) => p.name)).toEqual(["Second truck"])
    const loose = weekView({ visits: [visit({ id: "b", personId: undefined, personName: undefined })], settings: base.settings }, TODAY)
    expect(loose.people.map((p) => p.name)).toEqual(["No one yet"])
  })

  it("skips past days and cancelled visits to the first day ahead that has one", () => {
    const visits = [
      visit({ id: "past", startAt: "2026-11-09T15:00:00Z", scheduledOn: "2026-11-09" }),
      visit({ id: "gone", status: "cancelled", startAt: "2026-11-20T15:00:00Z", scheduledOn: "2026-11-20" }),
      visit({ id: "n1", startAt: "2027-04-27T15:00:00Z", scheduledOn: "2027-04-27" }),
      visit({ id: "n2", town: "Longmont", personId: "person_truck-2", startAt: "2027-04-27T17:00:00Z", scheduledOn: "2027-04-27" }),
      visit({ id: "n3", town: "Louisville", personId: "person_truck-2", startAt: "2027-04-27T19:00:00Z", scheduledOn: "2027-04-27" }),
    ]
    const week = weekView({ ...base, visits }, TODAY)
    expect(week.title).toBe("Next up")
    expect(week.heading).toBe("Tue, Apr 27 · 3 visits in Erie, Longmont and Louisville")
    expect(week.visits.map((v) => v.id)).toEqual(["n1", "n2", "n3"])
  })

  it("has no day when nothing is ahead", () => {
    expect(weekView({ ...base, visits: [visit({ startAt: "2026-11-09T15:00:00Z" })] }, TODAY)).toMatchObject({ day: null, people: [], visits: [] })
  })
})

describe("townsPhrase", () => {
  it("names up to three towns and counts more", () => {
    expect(townsPhrase(["Erie", "Erie"])).toBe("Erie")
    expect(townsPhrase(["Erie", "Longmont"])).toBe("Erie and Longmont")
    expect(townsPhrase(["Erie", "Longmont", "Louisville", "Lafayette"])).toBe("4 towns")
  })
})

describe("mapStops", () => {
  it("keeps a visit's own point and puts one without at its town's centre", () => {
    const [own, none] = mapStops([visit({ id: "a", lat: 40.1, lng: -105.2 }), visit({ id: "b", town: "Longmont" })])
    expect(own).toMatchObject({ lat: 40.1, lng: -105.2 })
    expect(none).toMatchObject({ lat: 40.167, lng: -105.102 })
  })
})

describe("moneyFigures", () => {
  it("adds up what is owed on done visits and what failed, each linking to the Visits that make it", () => {
    const done = { status: "completed" as const, completedOn: "2026-11-10", scheduledOn: "2026-11-10", startAt: "2026-11-10T15:00:00Z" }
    const data: AdminData = { ...base, passes: [], monthTotals: [], visits: [visit({ id: "o1", ...done }), visit({ id: "o2", ...done, price: 100 }), visit({ id: "f1", ...done, price: 60, chargeFailed: true }), visit({ id: "p1", ...done, chargedAt: "2026-11-10T20:00:00Z", paidMethod: "check" })] }
    const [charged, owed, failed, season] = moneyFigures(data, TODAY)
    expect(owed).toMatchObject({ label: "Owed on 2 done visits", value: "$245", href: "/admin/visits?money=unpaid,bill-sent" })
    expect(failed).toMatchObject({ label: "Failed charges, 1", value: "$60", href: "/admin/visits?money=failed" })
    expect([charged!.href, season!.href]).toEqual(["/admin/reports", "/admin/reports"])
    expect(season!.value).toBe("$0")
  })
})

describe("filterFrom", () => {
  it("keeps only real options from a link's list", () => {
    expect(filterFrom("money", "unpaid,bogus,failed", MONEY_OPTIONS)).toEqual([{ column: "money", values: ["unpaid", "failed"] }])
    expect(filterFrom("money", undefined, MONEY_OPTIONS)).toEqual([])
  })
})
