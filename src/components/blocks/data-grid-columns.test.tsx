import { describe, it, expect } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { STATUS_LABEL, chargedTotal, nextVisit, nextVisitSortKey, passColumns, shortDate } from "./data-grid-columns"

// passes[0] is Andrea in Erie: turn-on charged, inspection in July, blowout the week of October 4.
const andrea = snapshot.passes[0] as Pass

describe("shortDate", () => {
  it("reads a date or a datetime as the short table form", () => {
    expect(shortDate("2027-10-04")).toBe("Oct 4")
    expect(shortDate("2027-04-20T16:00:00Z")).toBe("Apr 20")
    expect(shortDate("2027-11-30")).toBe("Nov 30")
  })
})

describe("chargedTotal", () => {
  it("sums the amounts of the charged visits only", () => {
    expect(chargedTotal(andrea)).toBe(145)
    expect(chargedTotal({ ...andrea, visits: andrea.visits.map((v) => ({ ...v, chargedAt: undefined })) })).toBe(0)
    expect(chargedTotal({ ...andrea, visits: andrea.visits.map((v) => ({ ...v, chargedAt: "2027-10-12T16:00:00Z" })) })).toBe(385)
  })
})

describe("nextVisit", () => {
  it("names the first uncharged visit by its window when nothing is booked", () => {
    expect(nextVisit(andrea)).toBe("July")
  })

  it("names the first uncharged visit by its date when it is booked", () => {
    const booked: Pass = { ...andrea, visits: andrea.visits.map((v, i) => (i === 1 ? { ...v, scheduledAt: "2027-07-14T15:00:00Z" } : v)) }
    expect(nextVisit(booked)).toBe("Jul 14")
  })

  it("reads done when every visit is charged", () => {
    expect(nextVisit({ ...andrea, visits: andrea.visits.map((v) => ({ ...v, chargedAt: "2027-10-12T16:00:00Z" })) })).toBe("Done")
  })
})

describe("nextVisitSortKey", () => {
  it("is the booked date, else the first day of the window's month, and nothing when done", () => {
    expect(nextVisitSortKey(andrea)).toBe("2027-07-01")
    const booked: Pass = { ...andrea, visits: andrea.visits.map((v, i) => (i === 1 ? { ...v, scheduledAt: "2027-07-14T15:00:00Z" } : v)) }
    expect(nextVisitSortKey(booked)).toBe("2027-07-14")
    expect(nextVisitSortKey({ ...andrea, visits: andrea.visits.map((v) => ({ ...v, chargedAt: "2027-10-12T16:00:00Z" })) })).toBeUndefined()
  })
})

describe("STATUS_LABEL", () => {
  it("writes every status in sentence case", () => {
    expect(STATUS_LABEL).toEqual({ active: "Active", cancelled: "Cancelled", lapsed: "Lapsed" })
  })
})

describe("passColumns", () => {
  it("puts the name first and keeps the seven columns in the agreed order", () => {
    expect(passColumns.map((c) => c.id)).toEqual(["firstName", "town", "zones", "blowoutWeek", "status", "charged", "nextVisit"])
  })

  it("sorts finished passes last on next visit and exports its written form", () => {
    const column = passColumns.find((c) => c.id === "nextVisit")
    expect(column?.sortUndefined).toBe("last")
    expect(column?.meta?.csv?.(andrea)).toBe("July")
  })

  it("aligns the two numeric columns to the right", () => {
    const right = passColumns.filter((c) => c.meta?.align === "right").map((c) => c.id)
    expect(right).toEqual(["zones", "charged"])
  })
})
