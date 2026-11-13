import { describe, it, expect } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { formatMoney } from "@/lib/admin/metrics"
import { priceOnSale, visitPrice, visitsOnSale } from "@/lib/season-pass"
import { OrderSummary } from "./checkout-summary"

describe("OrderSummary", () => {
  it("lists each visit with its price, the total and what is charged today, all from season-pass.ts", () => {
    render(<OrderSummary state={{ zones: 10, inspection: true, today: "2026-11-12" }} />)
    const summary = screen.getByRole("region", { name: "Your pass" })
    for (const visit of visitsOnSale(true, "2026-11-12")) {
      const row = within(summary).getByText(visit.name).closest("li")!
      expect(row).toHaveTextContent(formatMoney(visitPrice(visit, 10)))
    }
    expect(within(summary).getByText("Season total").parentElement).toHaveTextContent(formatMoney(priceOnSale(10, true, "2026-11-12")))
    expect(within(summary).getByText("$0 today. We charge the card after each visit.")).toBeInTheDocument()
  })
  it("leaves out a visit that is no longer on sale and the inspection when not added", () => {
    render(<OrderSummary state={{ zones: 6, inspection: false, today: "2027-06-15" }} />)
    expect(screen.queryByText(/Spring turn-on/)).not.toBeInTheDocument()
    expect(screen.queryByText(/inspection/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Fall blowout/)).toBeInTheDocument()
  })
})
