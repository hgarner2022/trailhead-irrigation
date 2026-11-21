import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { reportFor } from "@/emails/fixtures"
import { PayFlow } from "./PayFlow"
import { PayScreen } from "./PayScreen"
import { StripeCardPage } from "./StripeCardPage"
import { introWords, payWithLabel, type PayBill } from "./pay-model"

const bill: PayBill = {
  number: "INV-2027-0001",
  firstName: "Andrea",
  serviceName: "repair",
  address: "412 Briggs Street",
  lines: [{ name: "Repair", description: null, quantity: 1, unitPrice: 115 }],
  tax: 0,
  total: 115,
  dueOn: "2027-12-01",
  paidOn: null,
  status: "sent",
  receiptUrl: null,
  report: reportFor("repair", 4, 2, ""),
}
const ok = async () => undefined

describe("the pay page's summary and report", () => {
  it("names the service and the address under the title, and the invoice number", () => {
    expect(introWords(bill)).toBe("Hi Andrea, here is invoice INV-2027-0001 for your repair at 412 Briggs Street.")
    render(<PayScreen bill={bill} payAction={ok} />)
    expect(screen.getByText("Hi Andrea, here is invoice INV-2027-0001 for your repair at 412 Briggs Street.")).toBeInTheDocument()
    expect(screen.getByText("Due Dec 1")).toBeInTheDocument()
  })

  it("carries What we did when the invoice includes the report, and has no such section when it does not", () => {
    const { rerender } = render(<PayScreen bill={bill} payAction={ok} />)
    expect(screen.getByRole("heading", { name: "What we did" })).toBeInTheDocument()
    expect(screen.getByText("Find the leak")).toBeInTheDocument()
    rerender(<PayScreen bill={{ ...bill, report: undefined }} payAction={ok} />)
    expect(screen.queryByRole("heading", { name: "What we did" })).toBeNull()
  })

  it("keeps What we did on the page once it is paid", () => {
    render(<PayScreen bill={{ ...bill, status: "paid", paidOn: "2027-04-29" }} payAction={ok} />)
    expect(screen.getByRole("heading", { name: "What we did" })).toBeInTheDocument()
  })
})

describe("a customer with a card on file", () => {
  it("gets Pay with the card as the filled button and Use a different card under it", () => {
    render(<PayScreen bill={{ ...bill, savedCard: "Visa ending 4242" }} payAction={ok} payWithSavedAction={ok} />)
    expect(payWithLabel(bill, "Visa ending 4242")).toBe("Pay $115 with Visa ending 4242")
    expect(screen.getByRole("button", { name: "Pay $115 with Visa ending 4242" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Use a different card" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Pay $115 by card" })).toBeNull()
    expect(screen.queryByText(/keep the card for future visits/)).toBeNull()
  })

  it("is not offered a saved card by a page that cannot take it (the live page today)", () => {
    render(<PayScreen bill={{ ...bill, savedCard: "Visa ending 4242" }} payAction={ok} />)
    expect(screen.getByRole("button", { name: "Pay $115 by card" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Visa ending/ })).toBeNull()
  })
})

describe("Stripe's card page, drawn", () => {
  it("shows the amount, what it is for, the drawn card boxes and the unticked save box, and puts no real field on the page", () => {
    const { container } = render(<StripeCardPage bill={bill} email="andrea@example.com" onPay={() => {}} onBack={() => {}} />)
    expect(screen.getByText("$115")).toBeInTheDocument()
    expect(screen.getByText("Invoice INV-2027-0001 for your repair at 412 Briggs Street")).toBeInTheDocument()
    expect(screen.getByText("1234 1234 1234 1234")).toBeInTheDocument()
    expect(screen.getByText("MM / YY")).toBeInTheDocument()
    expect(screen.getByText("CVC")).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "Save my payment method for future use" })).not.toBeChecked()
    expect(screen.getByRole("button", { name: "Pay $115" })).toBeInTheDocument()
    expect(screen.getByText(/placeholder\. No card is entered/)).toBeInTheDocument()
    expect(container.querySelectorAll("input:not([type=checkbox])")).toHaveLength(0)
  })

  it("sends the box as it stood when Pay is pressed, and Processing locks the page", () => {
    const onPay = vi.fn()
    const { rerender } = render(<StripeCardPage bill={bill} email="a@b.co" onPay={onPay} onBack={() => {}} />)
    fireEvent.click(screen.getByRole("checkbox", { name: "Save my payment method for future use" }))
    fireEvent.click(screen.getByRole("button", { name: "Pay $115" }))
    expect(onPay).toHaveBeenCalledWith({ saveCard: true })
    rerender(<StripeCardPage bill={bill} email="a@b.co" onPay={onPay} onBack={() => {}} processing />)
    expect(screen.getByRole("button", { name: "Processing" })).toBeDisabled()
  })
})

describe("PayFlow", () => {
  it("goes from the invoice to Stripe's card page, back again, then through processing to Paid", async () => {
    const onPaid = vi.fn()
    render(<PayFlow bill={bill} email="a@b.co" processingMs={0} onPaid={onPaid} />)
    fireEvent.click(screen.getByRole("button", { name: "Pay $115 by card" }))
    await screen.findByRole("checkbox", { name: "Save my payment method for future use" })
    fireEvent.click(screen.getByRole("button", { name: "Trailhead Lawn & Irrigation" }))
    expect(await screen.findByRole("heading", { name: "Your invoice" })).toBeInTheDocument()
    expect(onPaid).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Pay $115 by card" }))
    fireEvent.click(await screen.findByRole("button", { name: "Pay $115" }))
    await waitFor(() => expect(onPaid).toHaveBeenCalledWith({ saveCard: false, withSaved: false }))
  })

  it("pays with the card on file in one tap, with no card page", async () => {
    const onPaid = vi.fn()
    render(<PayFlow bill={{ ...bill, savedCard: "Visa ending 4242" }} email="a@b.co" processingMs={0} onPaid={onPaid} />)
    fireEvent.click(screen.getByRole("button", { name: "Pay $115 with Visa ending 4242" }))
    await waitFor(() => expect(onPaid).toHaveBeenCalledWith({ saveCard: false, withSaved: true }))
    expect(screen.queryByRole("checkbox")).toBeNull()
  })
})
