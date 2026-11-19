import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import PaidPage from "./page"

describe("the page Stripe returns to after an invoice is paid", () => {
  it("says thank you and gives the receipt and the account right there, not only an email to wait for", () => {
    render(<PaidPage />)
    expect(screen.getByText("Thank you, your payment went through")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "View the receipt" })).toHaveAttribute("href", "/account/visits")
    expect(screen.getByRole("link", { name: "Open your Trailhead account" })).toHaveAttribute("href", "/account")
    expect(screen.queryByText(/close this page/i)).toBeNull()
  })
})
