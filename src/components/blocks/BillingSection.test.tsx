import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BillingSection } from "./BillingSection"

describe("BillingSection", () => {
  it("opens an invoice row and leaves a payment row as text", async () => {
    const open = vi.fn()
    render(
      <BillingSection
        summary={[["Total", "$145"]]}
        rows={[
          { id: "i", kind: "invoice", title: "Invoice TH-1042", detail: "Sent Nov 18, due Dec 2", onOpen: open },
          { id: "p", kind: "payment", title: "Venmo", amount: "$145" },
        ]}
      />,
    )
    await userEvent.click(screen.getByRole("link", { name: /Invoice TH-1042/ }))
    expect(open).toHaveBeenCalledOnce()
    expect(screen.queryAllByRole("button")).toHaveLength(0)
    expect(screen.getByText("$145", { selector: "[data-slot=money-cell]" })).toBeInTheDocument()
  })

  it("says what it has with no rows", () => {
    render(<BillingSection summary={[]} rows={[]} />)
    expect(screen.getByText("Nothing to bill yet.")).toBeInTheDocument()
  })
})
