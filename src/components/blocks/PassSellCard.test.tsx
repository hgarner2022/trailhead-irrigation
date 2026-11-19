import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PassSellCard } from "./PassSellCard"
import { SEASON_PASS_FROM } from "@/lib/season-pass"

describe("PassSellCard", () => {
  it("sells the two visits, the days picked when you reserve, repair priority and the price per zone, with one button", () => {
    render(<PassSellCard />)
    expect(screen.getByText(/spring turn-on and fall blowout/i)).toBeInTheDocument()
    expect(screen.getByText(/repair visits go to season pass customers first/i)).toBeInTheDocument()
    expect(screen.getByText(`From $${SEASON_PASS_FROM} for 6 zones, $20 more for each extra zone.`)).toBeInTheDocument()
    expect(screen.getAllByRole("link")).toHaveLength(1)
    expect(screen.getByRole("link", { name: "Get a Season Pass" })).toHaveAttribute("href", "/season-pass")
  })
})
