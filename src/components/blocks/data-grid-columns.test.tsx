import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { chargedTotal, nextVisit, nextVisitSortKey, passColumns, visitDayText } from "./data-grid-columns"

// passes[0] is Andrea in Erie: turn-on done and charged, inspection and blowout still needing a day.
const andrea = snapshot.passes[0] as Pass
/** A charged visit carries one succeeded card payment, the way a real charge leaves it. */
const paid = (v: { amount: number }) => ({ payments: [{ id: "pay", amount: v.amount, method: "card_on_file", status: "succeeded", paidOn: "2027-10-12" }] })
const cellText = (id: string, pass: Pass) => {
  const column = passColumns.find((c) => c.id === id)
  const cell = column?.cell as unknown as (ctx: { row: { original: Pass } }) => React.ReactNode
  return cell({ row: { original: pass } })
}
const withInspectionDay = (extra: Record<string, unknown>): Pass => ({ ...andrea, visits: andrea.visits.map((v, i) => (i === 1 ? { ...v, scheduledAt: "2027-07-14T15:00:00Z", scheduledOn: "2027-07-14", ...extra } : v)) })

describe("chargedTotal", () => {
  it("sums the amounts of the charged visits only", () => {
    expect(chargedTotal(andrea)).toBe(145)
    expect(chargedTotal({ ...andrea, visits: andrea.visits.map((v) => ({ ...v, payments: undefined })) })).toBe(0)
    expect(chargedTotal({ ...andrea, visits: andrea.visits.map((v) => ({ ...v, ...paid(v) })) })).toBe(385)
  })
})

describe("nextVisit", () => {
  it("says a visit with no day needs one, never a month or a preference", () => {
    expect(nextVisit(andrea)).toBe("Unscheduled")
  })

  it("names the first uncharged visit by its day when it has one", () => {
    expect(nextVisit(withInspectionDay({}))).toBe("Jul 14")
  })

  it("reads done when every visit is charged", () => {
    expect(nextVisit({ ...andrea, visits: andrea.visits.map((v) => ({ ...v, ...paid(v) })) })).toBe("Done")
  })
})

describe("nextVisitSortKey", () => {
  it("is the day the visit has, after every day while it needs one, and nothing once done", () => {
    expect(nextVisitSortKey(andrea)).toBe("9999-99-99")
    expect(nextVisitSortKey(withInspectionDay({}))).toBe("2027-07-14")
    expect(nextVisitSortKey({ ...andrea, visits: andrea.visits.map((v) => ({ ...v, ...paid(v) })) })).toBeUndefined()
  })
})

describe("status column", () => {
  it("renders the status as a StatusPill and exports its label", () => {
    const column = passColumns.find((c) => c.id === "status")
    const cell = column?.cell as unknown as (ctx: { getValue: () => unknown }) => React.ReactNode
    render(<>{cell({ getValue: () => "active" })}</>)
    expect(screen.getByText("Active")).toHaveAttribute("data-slot", "status-pill")
    expect(column?.meta?.csv?.(andrea)).toBe("Active")
  })

  it("says Pending for an unpaid attempt, never Active", () => {
    const column = passColumns.find((c) => c.id === "status")
    const cell = column?.cell as unknown as (ctx: { getValue: () => unknown }) => React.ReactNode
    render(<>{cell({ getValue: () => "pending" })}</>)
    expect(screen.getByText("Pending")).toHaveAttribute("data-status", "pending")
    expect(column?.meta?.csv?.({ ...andrea, status: "pending" })).toBe("Pending")
  })
})

describe("visit day columns", () => {
  it("show the day the visit row holds, and Unscheduled before it has one", () => {
    expect(cellText("turnOn", andrea)).toBe("May 3")
    expect(cellText("inspection", andrea)).toBe("Unscheduled")
    expect(cellText("blowout", andrea)).toBe("Unscheduled")
  })

  it("add the window once a start time is set", () => {
    expect(visitDayText(withInspectionDay({ startTime: "08:00" }), "inspection")).toBe("Jul 14, 8 to 10 am")
    expect(visitDayText(withInspectionDay({ startTime: "11:00", windowMinutes: 180 }), "inspection")).toBe("Jul 14, 11 am to 2 pm")
  })

  it("say None for a visit the pass does not have", () => {
    expect(visitDayText({ ...andrea, visits: andrea.visits.filter((v) => v.kind !== "inspection") }, "inspection")).toBe("None")
  })

  it("export the same words and sort by the day, nothing last", () => {
    expect(passColumns.find((c) => c.id === "turnOn")?.meta?.csv?.(andrea)).toBe("May 3")
    expect(passColumns.find((c) => c.id === "blowout")?.sortUndefined).toBe("last")
  })
})

describe("passColumns", () => {
  it("puts the name first and keeps the nine columns in the agreed order", () => {
    expect(passColumns.map((c) => c.id)).toEqual(["name", "town", "zones", "turnOn", "inspection", "blowout", "status", "charged", "nextVisit"])
  })

  it("reads the name as the full name where a last name is on record", () => {
    const column = passColumns.find((c) => c.id === "name") as unknown as { accessorFn: (p: Pass) => string }
    expect(column.accessorFn({ ...andrea, lastName: "Anderson" })).toBe("Andrea Anderson")
    expect(column.accessorFn({ ...andrea, lastName: undefined })).toBe("Andrea")
  })

  it("sorts finished passes last on next visit and exports its written form", () => {
    const column = passColumns.find((c) => c.id === "nextVisit")
    expect(column?.sortUndefined).toBe("last")
    expect(column?.meta?.csv?.(andrea)).toBe("Unscheduled")
  })

  it("aligns the two numeric columns to the right", () => {
    const right = passColumns.filter((c) => c.meta?.align === "right").map((c) => c.id)
    expect(right).toEqual(["zones", "charged"])
  })
})
