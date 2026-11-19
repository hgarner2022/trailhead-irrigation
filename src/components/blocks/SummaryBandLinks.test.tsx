import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SummaryBand } from "./SummaryBand"

describe("SummaryBand link cells", () => {
  it("makes a cell with href a link and a cell with onClick a button, and leaves an empty one plain", () => {
    render(<SummaryBand items={[{ label: "Next visit", value: "Thu, Nov 19", href: "/admin/jobs?job=j1" }, { label: "Card on file", value: "Visa 4242", onClick: () => undefined }, { label: "Unpaid", value: "$0", sub: "Nothing unpaid" }]} />)
    expect(screen.getByRole("link", { name: /Next visit/ })).toHaveAttribute("href", "/admin/jobs?job=j1")
    expect(screen.getByRole("button", { name: /Card on file/ })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Unpaid/ })).toBeNull()
    expect(document.querySelectorAll("[data-link]")).toHaveLength(2)
  })
})
