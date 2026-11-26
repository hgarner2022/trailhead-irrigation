import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { SectionHeading } from "./SectionHeading"

describe("SectionHeading", () => {
  it("is an h3 at section size (type-admin-section) by default, with an id", () => {
    render(<SectionHeading id="property">Property</SectionHeading>)
    const h = screen.getByRole("heading", { level: 3, name: "Property" })
    expect(h).toHaveAttribute("id", "property")
    expect(h).toHaveAttribute("data-size", "section")
    expect(h).toHaveClass("text-navy", "type-admin-section")
  })

  it("is an h2 at card size for the title of a card", () => {
    render(<SectionHeading level={2}>Revenue by month</SectionHeading>)
    const h = screen.getByRole("heading", { level: 2, name: "Revenue by month" })
    expect(h).toHaveAttribute("data-size", "card")
    expect(h).toHaveClass("type-admin-card")
  })

  it("puts a quiet action at the right of the heading", () => {
    render(<SectionHeading action={<button type="button">Edit</button>}>Property</SectionHeading>)
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Property" }).parentElement).toHaveAttribute("data-slot", "section-heading-row")
  })
})
