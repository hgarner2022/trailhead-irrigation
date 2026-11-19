import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SummaryBand } from "./SummaryBand"

describe("SummaryBand", () => {
  it("shows each fact as a quiet label over a value, four across from sm and two by two on a phone", () => {
    render(<SummaryBand items={[{ label: "When", value: "Wednesday, April 28 at 10:30 am" }, { label: "Who", value: "Ryan" }, { label: "Where", value: "412 Briggs Street, Erie" }, { label: "Money", value: "Paid" }]} />)
    expect(screen.getByText("When")).toBeInTheDocument()
    expect(screen.getByText("Wednesday, April 28 at 10:30 am")).toBeInTheDocument()
    const band = document.querySelector("[data-slot=summary-band] dl")!
    expect(band).toHaveClass("grid-cols-2", "sm:grid-cols-4")
  })
})
