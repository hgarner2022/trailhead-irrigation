import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { CalendarLegend } from "./CalendarLegend"

describe("CalendarLegend", () => {
  it("names every mark in the product's words, and folds to its button", async () => {
    render(<CalendarLegend />)
    for (const word of ["Done", "Waiting on customer", "Overlaps", "Time off"]) expect(screen.getByText(word)).toBeInTheDocument()
    const button = screen.getByRole("button", { name: "Legend" })
    expect(button).toHaveAttribute("aria-expanded", "true")
    await userEvent.click(button)
    expect(button).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("Overlaps")).toBeNull()
  })
})
