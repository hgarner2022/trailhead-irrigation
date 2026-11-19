import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { CustomerPage } from "./CustomerPage"
import { CUSTOMER_STATES, customerPageOf } from "./customer-fixtures"

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)" || query === "(min-width: 768px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})

describe("customer page", () => {
  for (const state of CUSTOMER_STATES) {
    it(`renders ${state} with the name as title, New job as the one primary and the cards`, () => {
      render(<CustomerPage customer={customerPageOf(state)} />)
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
      expect(document.querySelector("[data-slot=record-footer] button")).toHaveTextContent("New job")
      for (const name of ["Jobs", "Invoices", "Messages", "Notes and history", "Contact", "Property", "Season Pass", "Consent"]) expect(screen.getByRole("heading", { name })).toBeInTheDocument()
      expect(document.querySelectorAll("[data-slot=summary-icon]")).toHaveLength(4)
    })
  }

  it("shows Unpaid $145 as a badge beside the name and the phone as a tel link", () => {
    render(<CustomerPage customer={customerPageOf("pass-holder")} />)
    expect(screen.getByText("Unpaid $145", { selector: "[data-slot=status-pill]" })).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: "(970) 555-0123" })[0]).toHaveAttribute("href", "tel:+19705550123")
  })

  it("links a renewal back to last season and last season forward to the renewal", () => {
    render(<CustomerPage customer={customerPageOf("two-seasons")} />)
    expect(screen.getByText(/Renewed from/)).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: "Season Pass 2026, TH-2026-0003" }).length).toBeGreaterThan(1)
    expect(screen.getByRole("link", { name: "TH-2027-0011" })).toBeInTheDocument()
    expect(screen.getByText("Active, renewed")).toBeInTheDocument()
  })

  it("sells a pass to a one-off customer and reserves the next season for a lapsed one", () => {
    const { unmount } = render(<CustomerPage customer={customerPageOf("one-off")} />)
    expect(screen.getByRole("button", { name: "Get a Season Pass" })).toBeInTheDocument()
    unmount()
    render(<CustomerPage customer={customerPageOf("reserve-next")} />)
    expect(screen.getByRole("button", { name: "Reserve next season" })).toBeInTheDocument()
  })

  it("invites the first job when there is none", () => {
    render(<CustomerPage customer={customerPageOf("nothing-yet")} />)
    const jobs = screen.getByRole("heading", { name: "Jobs" }).closest("section")!
    expect(within(jobs).getByRole("button", { name: "New job" })).toBeInTheDocument()
  })

  it("opens the Send a text dialog with its effect in plain words", () => {
    render(<CustomerPage customer={customerPageOf("pass-holder")} initialDialog="text" />)
    expect(screen.getByText(/Sends this text to \(970\) 555-0123 now/)).toBeInTheDocument()
  })
})
