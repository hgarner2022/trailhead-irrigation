import { beforeAll, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { CustomersList } from "./WalkScreens"
import { searchWorld } from "./data"

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 768px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})

describe("the walkthrough's Customers list", () => {
  it("has a Status column and a Status filter, with every customer's status read from their jobs", () => {
    render(<CustomersList onOpen={() => undefined} />)
    expect(screen.getAllByRole("button", { name: "Status" }).length).toBeGreaterThan(0)
    const rows = screen.getAllByRole("row").slice(1)
    expect(rows).toHaveLength(3)
    for (const r of rows) expect(within(r).getByText("Active", { selector: "[data-slot=status-pill]" })).toBeInTheDocument()
  })

  it("hides archived customers behind Show archived", () => {
    render(<CustomersList onOpen={() => undefined} />)
    const button = screen.getByRole("button", { name: "Show archived" })
    expect(button).toHaveAttribute("aria-pressed", "false")
    fireEvent.click(button)
    expect(screen.getByRole("button", { name: "Show archived" })).toHaveAttribute("aria-pressed", "true")
  })

  it("shows the status word on a Cmd+K customer hit", () => {
    const hit = searchWorld("Dalton").find((h) => h.kind === "customer")!
    expect(hit.detail).toBe("480 Briggs St, Erie · Active")
  })
})
