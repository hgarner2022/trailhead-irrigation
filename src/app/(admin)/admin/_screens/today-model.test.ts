import { describe, expect, it } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, Visit } from "@/lib/admin/types"
import { clockMinutes, isOnToday, moneyWordOf, todayView, windowEnd } from "./today-model"

const base = snapshot as AdminData
// 12:56 pm Mountain on Thursday, November 12, 2026
const NOW = "2026-11-12T19:56:30Z"
const visit = (over: Partial<Visit>): Visit => ({
  id: "x", clientId: "c", clientName: "Dana Reed", town: "Erie", kind: "repair", status: "scheduled", isPass: false, jobberUrl: "", jobId: "j",
  scheduledOn: "2026-11-12", startAt: "2026-11-12T15:00:00Z", startTime: "08:00", price: 145, personId: "person_truck-1", personName: "Ryan Garner", payments: [], ...over,
})
const done = (over: Partial<Visit>) => visit({ status: "completed", completedOn: "2026-11-12", ...over })
const view = (visits: Visit[]) => todayView({ ...base, visits, jobs: undefined }, NOW)
const ids = (rows: { id: string }[]) => rows.map((r) => r.id)

describe("clock and window", () => {
  it("reads the Mountain clock of an instant and the end of a window", () => {
    expect(clockMinutes(NOW)).toBe(12 * 60 + 56)
    expect(windowEnd({ startTime: "08:00" })).toBe(10 * 60)
    expect(windowEnd({ startTime: "10:30", minutes: 60 })).toBe(11 * 60 + 30)
    expect(windowEnd({})).toBeNull()
  })
})

describe("which visits are on today", () => {
  const day = "2026-11-12"
  it("takes a visit scheduled for the day and one done on it, never a cancelled or skipped one or another day's", () => {
    expect(isOnToday(visit({}), day)).toBe(true)
    expect(isOnToday(done({ scheduledOn: "2026-11-10", startAt: "2026-11-10T15:00:00Z" }), day)).toBe(true)
    expect(isOnToday(done({ completedOn: "2026-11-10" }), day)).toBe(false)
    expect(isOnToday(visit({ status: "cancelled" }), day)).toBe(false)
    expect(isOnToday(visit({ skipped: true }), day)).toBe(false)
    expect(isOnToday(visit({ scheduledOn: "2026-11-11", startAt: "2026-11-11T15:00:00Z" }), day)).toBe(false)
  })
})

describe("the three groups", () => {
  const v = view([
    visit({ id: "past", startTime: "08:00" }),
    visit({ id: "edge-past", startTime: "10:30", startAt: "2026-11-12T17:30:00Z" }),
    visit({ id: "edge-ahead", startTime: "11:00", startAt: "2026-11-12T18:00:00Z" }),
    visit({ id: "later", startTime: "13:00", startAt: "2026-11-12T20:00:00Z" }),
    visit({ id: "anytime", startTime: undefined }),
    done({ id: "finished", startTime: "09:00", startAt: "2026-11-12T16:00:00Z" }),
    done({ id: "old-done", completedOn: "2026-11-10" }),
    visit({ id: "gone", status: "cancelled" }),
  ])

  it("puts a visit past its window when the window end has passed and it is not done", () => {
    expect(ids(v.groups.past)).toEqual(["past", "edge-past"])
  })

  it("keeps a visit ahead while its window is not over or it has no window yet", () => {
    expect(ids(v.groups.ahead).sort()).toEqual(["anytime", "edge-ahead", "later"])
  })

  it("shows only what was done today in Done today, and leaves out a cancelled visit and an older done one", () => {
    expect(ids(v.groups.done)).toEqual(["finished"])
    expect(ids(v.rows).sort()).toEqual(["anytime", "edge-ahead", "edge-past", "finished", "later", "past"])
  })

  it("orders a group by window start, an unscheduled hour last", () => {
    expect(ids(v.groups.ahead)).toEqual(["edge-ahead", "later", "anytime"])
  })

  it("words the window and the done money in the screen's words", () => {
    expect(v.rows.find((r) => r.id === "past")).toMatchObject({ window: "8 to 10 am", firstName: "Dana", service: "Repair", group: "past", moneyWord: "" })
    expect(v.rows.find((r) => r.id === "anytime")!.window).toBe("Any time")
    expect(v.rows.find((r) => r.id === "finished")).toMatchObject({ money: "owed", moneyWord: "$145 owed" })
  })
})

describe("the money word on a done row", () => {
  it("says how it was paid, the number owed, or the bill's word", () => {
    expect(moneyWordOf("paid", "Paid, Venmo", 95)).toBe("Paid, Venmo")
    expect(moneyWordOf("owed", "Owed", 95)).toBe("$95 owed")
    expect(moneyWordOf("owed", "Owed", 0)).toBe("Owed")
    expect(moneyWordOf("bill-sent", "Bill sent", 95)).toBe("Bill sent")
    expect(moneyWordOf("not-yet", "", 95)).toBe("")
  })

  it("reads Paid with how from the payment rows", () => {
    const paid = done({ id: "p", payments: [{ id: "pay", visitId: "p", amount: 145, method: "venmo", status: "succeeded" }] })
    expect(view([paid]).rows[0]).toMatchObject({ money: "paid", moneyWord: "Paid, Venmo" })
  })
})

describe("by person", () => {
  const visits = [
    visit({ id: "r2", startTime: "10:00", startAt: "2026-11-12T17:00:00Z", stopOrder: 2 }),
    visit({ id: "r1", startTime: "13:00", startAt: "2026-11-12T20:00:00Z", stopOrder: 1 }),
    visit({ id: "t1", personId: "person_truck-2", personName: "Tech Two", startTime: undefined, startAt: "2026-11-12T16:00:00Z" }),
    visit({ id: "nobody", personId: undefined, personName: undefined }),
  ]
  const v = view(visits)

  it("lists each person's visits in route order under their name and initials, nobody last", () => {
    expect(v.people.map((p) => [p.name, p.initials, ids(p.rows)])).toEqual([
      ["Ryan Garner", "RG", ["r1", "r2"]],
      ["Tech Two", "TT", ["t1"]],
      ["No one yet", "", ["nobody"]],
    ])
  })

  it("numbers the map's stops in each person's route", () => {
    expect(v.stops.filter((s) => s.personId === "person_truck-1").map((s) => [s.id, s.stopOrder])).toEqual([["r2", 2], ["r1", 1]])
    expect(v.stops.find((s) => s.id === "t1")!.stopOrder).toBe(1)
    expect(v.rows.find((r) => r.id === "r1")).toMatchObject({ route: 1 })
    expect(v.rows.find((r) => r.id === "t1")).toMatchObject({ route: 1 })
  })

  it("files a person who lost their truck under their name, never under No one yet", () => {
    const people = base.settings.people.map((p) => (p.id === "person_truck-2" ? { ...p, truck: undefined } : p))
    const out = todayView({ ...base, settings: { ...base.settings, people }, visits: [visits[2]!] }, NOW)
    expect(out.people.map((p) => p.name)).toEqual(["Tech Two"])
  })
})

describe("an empty day", () => {
  it("has no rows, nothing in any group and no people", () => {
    const v = view([])
    expect(v.rows).toEqual([])
    expect([v.groups.past, v.groups.ahead, v.groups.done].map((g) => g.length)).toEqual([0, 0, 0])
    expect(v.people).toEqual([])
  })
})
