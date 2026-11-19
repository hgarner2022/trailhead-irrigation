import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { InvoiceBanner } from "./InvoiceBanner"

const props = { jobName: "Repair", total: 115, dueOn: "2027-12-01", payHref: "/pay/inv_1?token=abc" }

describe("InvoiceBanner", () => {
  it("says the invoice, the amount and the due day, with a Pay now link", () => {
    render(<InvoiceBanner {...props} status="sent" />)
    expect(screen.getByText("Repair: $115 unpaid, due Dec 1")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Pay now" })).toHaveAttribute("href", "/pay/inv_1?token=abc")
  })

  it("says Past due since the due day once it has passed, and never says bill or overdue", () => {
    const { container } = render(<InvoiceBanner {...props} status="overdue" />)
    expect(screen.getByText("Repair: $115 unpaid, past due since Dec 1")).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/bill|overdue/i)
  })
})
