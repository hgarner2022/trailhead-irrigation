import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { chargedTotal, nextVisit, nextVisitSortKey, passColumns, preferenceOptions } from "./data-grid-columns"

// passes[0] is Andrea in Erie: turn-on charged, inspection in July, both preferences recommended.
const andrea = snapshot.passes[0] as Pass
const cellText = (id: string, pass: Pass) => {
  const column = passColumns.find((c) => c.id === id)
  const cell = column?.cell as unknown as (ctx: { row: { original: Pass } }) => React.ReactNode
  return cell({ row: { original: pass } })
}

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

describe("status column", () => {
  it("renders the status as a StatusPill and exports its label", () => {
    const column = passColumns.find((c) => c.id === "status")
    const cell = column?.cell as unknown as (ctx: { getValue: () => unknown }) => React.ReactNode
    render(<>{cell({ getValue: () => "active" })}</>)
    expect(screen.getByText("Active")).toHaveAttribute("data-slot", "status-pill")
    expect(column?.meta?.csv?.(andrea)).toBe("Active")
  })
})

describe("preference columns", () => {
  it("write the preference in the customer's words and export the same", () => {
    expect(cellText("turnOn", andrea)).toBe("Mid May")
    expect(cellText("blowout", andrea)).toBe("Mid October")
    expect(cellText("blowout", { ...andrea, blowoutPreference: "later" })).toBe("Late October")
    expect(passColumns.find((c) => c.id === "turnOn")?.meta?.csv?.({ ...andrea, turnOnPreference: "earlier" })).toBe("Early May")
    expect(passColumns.find((c) => c.id === "blowout")?.meta?.csv?.(andrea)).toBe("Mid October")
  })

  it("sort earlier before recommended before later, whatever the alphabet says", () => {
    const column = passColumns.find((c) => c.id === "blowout")
    const row = (value: string) => ({ getValue: () => value }) as unknown as Parameters<NonNullable<typeof column>["sortFn"] & ((a: never, b: never, id: string) => number)>[0]
    const sort = column?.sortFn as unknown as (a: unknown, b: unknown, id: string) => number
    expect(sort(row("earlier"), row("recommended"), "blowout")).toBeLessThan(0)
    expect(sort(row("recommended"), row("later"), "blowout")).toBeLessThan(0)
    expect(sort(row("later"), row("earlier"), "blowout")).toBeGreaterThan(0)
    expect(sort(row("later"), row("later"), "blowout")).toBe(0)
  })

  it("offer the three answers as filter chips, earlier to later", () => {
    expect(preferenceOptions("blowout")).toEqual([
      { value: "earlier", label: "Early October" },
      { value: "recommended", label: "Mid October" },
      { value: "later", label: "Late October" },
    ])
    expect(preferenceOptions("turn-on").map((o) => o.label)).toEqual(["Early May", "Mid May", "Late May"])
  })
})

describe("passColumns", () => {
  it("puts the name first and keeps the eight columns in the agreed order", () => {
    expect(passColumns.map((c) => c.id)).toEqual(["firstName", "town", "zones", "turnOn", "blowout", "status", "charged", "nextVisit"])
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
