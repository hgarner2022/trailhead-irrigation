import { render, screen } from "@testing-library/react"
import { beforeAll, describe, expect, it, vi } from "vitest"
import { andrea } from "./account-fixtures"
import { DetailsScreen } from "./DetailsScreen"

// UX audit row 18: two Save buttons that are not both "Save", an example under the two fields a homeowner may not know, and a checkbox that promises only what it does.
beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})

describe("Details", () => {
  it("names its two buttons for what they save", () => {
    render(<DetailsScreen customer={andrea} />)
    expect(screen.getByRole("button", { name: "Save your details" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Save yard notes" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull()
  })
  it("puts one example line under Controller and under Backflow location, tied to the field", () => {
    render(<DetailsScreen customer={andrea} />)
    expect(screen.getByLabelText("Controller")).toHaveAccessibleDescription("For example, Rachio 3 or Hunter Pro-C.")
    expect(screen.getByLabelText("Backflow location")).toHaveAccessibleDescription("For example, left of the garage, or by the front hose bib.")
  })
  it("words the checkbox as a message to Ryan, not a scheduling promise", () => {
    render(<DetailsScreen customer={andrea} />)
    expect(screen.getByRole("checkbox", { name: "Tell Ryan someone needs to be home" })).toBeInTheDocument()
    expect(screen.queryByText(/Someone must be home for our visits/)).toBeNull()
  })
})
