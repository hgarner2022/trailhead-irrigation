import { describe, expect, it } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, Visit } from "@/lib/admin/types"
import { mapStops, townsPhrase, weekView } from "./home-week"
import { filterFrom, MONEY_OPTIONS, visitRows, visitsContext } from "./visits-model"

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
    const week = weekView({ visits: [visit({ id: "a", personId: "person_truck-2", personName: "Tech Two" })], settings: { ...base.settings, people } }, TODAY)
    expect(week.people.map((p) => p.name)).toEqual(["Tech Two"])
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

describe("the Visits header reads Bill sent apart from Owed", () => {
  const done = { status: "completed" as const, completedOn: "2026-11-10", scheduledOn: "2026-11-10", startAt: "2026-11-10T15:00:00Z" }
  const bill = { id: "inv1", jobId: "j2", number: "INV-2026-0001", amount: 100, tax: 0, total: 100, sentOn: "2026-11-01", dueOn: "2026-11-08", status: "overdue" as const, visitIds: [] }
  const job = (id: string, over: Partial<NonNullable<AdminData["jobs"]>[number]> = {}) => ({ id, customerId: "c", kind: "repair" as const, status: "open" as const, source: "office" as const, visitIds: [], ...over })
  const data: AdminData = {
    ...base, passes: [], monthTotals: [],
    visits: [
      visit({ id: "o1", jobId: "j1", ...done, payments: [] }),
      // a done job with an open bill reads Bill sent: not owed on either line
      visit({ id: "b1", jobId: "j2", ...done, price: 100, payments: [], invoice: bill }),
    ],
    jobs: [job("j1", { visitIds: ["o1"] }), job("j2", { visitIds: ["b1"], invoice: bill })],
  }

  it("counts Owed only in the header: a Bill sent visit is not in it", () => {
    const rows = visitRows(data, TODAY)
    expect(rows.find((r) => r.id === "b1")).toMatchObject({ money: "bill-sent", moneyLabel: "Bill sent" })
    expect(visitsContext(rows)).toBe("2 visits this season. 1 done and owed.")
  })

  it("lets the Visits list be filtered to Bill sent from a link", () => {
    expect(filterFrom("money", "bill-sent", MONEY_OPTIONS)).toEqual([{ column: "money", values: ["bill-sent"] }])
  })
})

describe("filterFrom", () => {
  it("keeps only real options from a link's list", () => {
    expect(filterFrom("money", "owed,bogus,failed", MONEY_OPTIONS)).toEqual([{ column: "money", values: ["owed", "failed"] }])
    expect(filterFrom("money", "unpaid", MONEY_OPTIONS)).toEqual([])
    expect(filterFrom("money", undefined, MONEY_OPTIONS)).toEqual([])
  })
})
