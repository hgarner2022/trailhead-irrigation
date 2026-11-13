import { describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { SeasonPassCalculator } from "./SeasonPassCalculator"

const cta = () => screen.getByRole("link", { name: "Reserve my season" })

describe("SeasonPassCalculator button", () => {
  it("goes where it is told, unchanged, by default", () => {
    render(<SeasonPassCalculator ctaHref="/contact" />)
    expect(cta()).toHaveAttribute("href", "/contact")
    fireEvent.change(screen.getByLabelText(/How many zones/), { target: { value: "10" } })
    expect(cta()).toHaveAttribute("href", "/contact")
  })
  it("carries the chosen zones to the checkout when asked to", () => {
    render(<SeasonPassCalculator ctaHref="/season-pass/checkout" carryZones />)
    expect(cta()).toHaveAttribute("href", "/season-pass/checkout?zones=6")
    fireEvent.change(screen.getByLabelText(/How many zones/), { target: { value: "12" } })
    expect(cta()).toHaveAttribute("href", "/season-pass/checkout?zones=12")
  })
})
