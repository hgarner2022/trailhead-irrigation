import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { CardTitleHeading } from "./CardTitleHeading"

describe("CardTitleHeading", () => {
  it("is an h2 in the display face with an optional id", () => {
    render(<CardTitleHeading id="revenue-by-month">Revenue by month</CardTitleHeading>)
    const heading = screen.getByRole("heading", { level: 2, name: "Revenue by month" })
    expect(heading).toHaveAttribute("id", "revenue-by-month")
    expect(heading).toHaveAttribute("data-slot", "card-title-heading")
    expect(heading).toHaveClass("font-display", "text-navy")
  })
})
