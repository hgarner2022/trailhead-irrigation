import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { PassSeason } from "./PassSeason"

const pass = (snapshot as AdminData).passes.find((p) => p.status === "active")!
const base = { pass, today: "2026-11-12T19:56:30Z", facts: [["Town", "Erie"], ["Zones", "8"], ["Status", "Active"]] as [string, string][], card: "Card ending 4242, expires 08/28", visits: [], charges: [] }

describe("PassSeason", () => {
  it("stacks the facts under the card on a phone and beside it from sm up, so they never wrap a letter to a line", () => {
    render(<PassSeason {...base} />)
    const row = document.querySelector('[data-slot="pass-season"] > div') as HTMLElement
    expect(row).toHaveClass("flex-col", "sm:flex-row")
    expect(document.querySelector('[data-slot="record-facts"]')).toHaveClass("min-w-0", "flex-1")
  })

  it("says the card once, without a second Card in front of it", () => {
    render(<PassSeason {...base} />)
    expect(screen.getByText("Card ending 4242, expires 08/28")).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Card\s*Card/)
  })

  it("is only the card, its facts and the season line for the customer's panel", () => {
    render(<PassSeason {...base} variant="customer" />)
    for (const name of ["Visits", "Season", "Charges"]) expect(screen.queryByRole("heading", { name })).toBeNull()
    expect(document.querySelector('[data-slot="pass-card-line"]')).toBeNull()
    expect(screen.getByLabelText("Season")).toBeInTheDocument()
  })
})
