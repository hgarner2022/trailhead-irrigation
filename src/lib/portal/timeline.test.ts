import { describe, expect, it } from "vitest"
import { andrea, andreaTwoProperties, canceledRepairJob, dana, invoicedJob, oneOffJob, partPaidJob, passJob, passJobCanceled, passJobCanceledVisit, passJobWindowTold, pastDueJob, repairJob, TODAY } from "@/app/(account)/account/_screens/account-fixtures"
import { nextRow, portalTimeline } from "./timeline"

describe("portalTimeline", () => {
  it("puts every visit of every job in one list: coming up soonest first, then the ones still waiting for a day; the rest is Past, newest first", () => {
    const t = portalTimeline(andrea, [passJob, repairJob, invoicedJob], TODAY)
    expect(t.upcoming.map((r) => [r.id, r.dayWords])).toEqual([
      ["v1", "Wed, Apr 28"],
      ["v2", "Day coming soon"],
    ])
    expect(t.past.map((r) => [r.id, r.dayWords])).toEqual([
      ["v4", "Sat, Mar 20"],
      ["v3", "Tue, Nov 3, 2026"],
    ])
  })

  it("labels a pass visit with its season and a one-off with nothing, and names the street only when the customer has two properties", () => {
    const one = portalTimeline(andrea, [passJob, oneOffJob], TODAY)
    expect(one.upcoming.find((r) => r.id === "v1")).toMatchObject({ label: "Season Pass 2027", street: null })
    expect(one.upcoming.find((r) => r.id === "v6")).toMatchObject({ label: null, street: null })
    expect(one.streets).toEqual([])
    const two = portalTimeline(andreaTwoProperties, [passJob, oneOffJob], TODAY)
    expect(two.upcoming.find((r) => r.id === "v6")!.street).toBe("12 Cottonwood Way")
    expect(two.upcoming.find((r) => r.id === "v1")!.street).toBe("412 Briggs Street")
    expect(two.streets.sort()).toEqual(["12 Cottonwood Way", "412 Briggs Street"])
  })

  it("shows who is coming only once the window was told", () => {
    expect(portalTimeline(andrea, [passJob], TODAY).upcoming[0]!.who).toBeNull()
    expect(portalTimeline(andrea, [passJobWindowTold], TODAY).upcoming[0]!.who).toBe("Ryan")
  })

  it("words the money: what a coming visit will cost and how it is paid, then what a done visit owes or paid", () => {
    expect(portalTimeline(andrea, [passJob], TODAY).upcoming[0]!.money).toBe("$120, charged after the visit")
    expect(portalTimeline(dana, [oneOffJob], TODAY).upcoming[0]!.money).toBe("$145, paid after the visit")
    const done = portalTimeline(andrea, [repairJob, invoicedJob, partPaidJob, pastDueJob], TODAY).past
    expect(done.find((r) => r.id === "v3")).toMatchObject({ money: "$145 · Paid", tone: "paid", receiptId: "pay_1" })
    expect(done.find((r) => r.id === "v4")).toMatchObject({ money: "Invoice sent, due Dec 1", tone: "invoice-sent", receiptId: null })
    expect(done.find((r) => r.id === "v5")).toMatchObject({ money: "$65 unpaid", tone: "unpaid", receiptId: null })
    expect(done.find((r) => r.id === "v7")).toMatchObject({ money: "Past due since Apr 1", tone: "past-due" })
  })

  it("keeps a canceled visit in Past, by the day it was canceled, with one customer word for skipped and canceled", () => {
    const t = portalTimeline(andrea, [passJobCanceledVisit, canceledRepairJob], TODAY)
    expect(t.past.map((r) => [r.id, r.dayWords, r.pill.label])).toEqual([
      ["v1", "Canceled Apr 10", "Canceled"],
      ["v8", "Canceled Apr 2", "Canceled"],
    ])
    expect(t.upcoming.map((r) => r.id)).toEqual(["v2"])
    expect(t.past.every((r) => r.money === "")).toBe(true)
  })

  it("moves every visit of a canceled pass to Past", () => {
    const t = portalTimeline(andrea, [passJobCanceled], TODAY)
    expect(t.upcoming).toEqual([])
    expect(t.past.map((r) => r.pill.label)).toEqual(["Canceled", "Canceled"])
  })

  it("keeps a booked visit whose day passed and was not closed in Past, still Booked", () => {
    const t = portalTimeline(andrea, [passJob], "2027-05-01")
    expect(t.past.map((r) => [r.id, r.pill.label])).toEqual([["v1", "Booked"]])
  })

  it("reads the pill as Pick a day when the customer may pick one, else Day coming soon", () => {
    expect(portalTimeline(andrea, [passJob], TODAY).upcoming[1]!.pill.label).toBe("Pick a day")
    const quiet = { ...passJob, visits: passJob.visits.map((v) => (v.id === "v2" ? { ...v, reschedule: "text" as const } : v)) }
    expect(portalTimeline(andrea, [quiet], TODAY).upcoming[1]!.pill.label).toBe("Day coming soon")
  })

  it("links each row to its visit page and picks the next visit", () => {
    const t = portalTimeline(andrea, [passJob, oneOffJob], TODAY)
    expect(t.upcoming[0]!.href).toBe("/account/visits/v1")
    expect(nextRow(t)!.id).toBe("v1")
    expect(nextRow(portalTimeline(andrea, [repairJob], TODAY))).toBeNull()
  })
})
