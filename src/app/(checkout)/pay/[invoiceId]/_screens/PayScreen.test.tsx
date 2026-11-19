import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { PayScreen } from "./PayScreen"
import { dueWords, paidWords, payLabel, type PayBill } from "./pay-model"

const sent: PayBill = {
  number: "INV-2026-0001",
  firstName: "Andrea",
  lines: [{ name: "Repair", description: "One hour on site.", quantity: 1, unitPrice: 145 }],
  tax: 0,
  total: 145,
  dueOn: "2026-12-01",
  paidOn: null,
  status: "sent",
  receiptUrl: null,
}
const ok = async () => undefined

describe("PayScreen", () => {
  it("shows the invoice, the due day, the one button and the two lines around it", () => {
    render(<PayScreen bill={sent} payAction={ok} />)
    expect(screen.getByRole("heading", { level: 1, name: "Your invoice" })).toBeInTheDocument()
    expect(screen.getByText("Hi Andrea, here is invoice INV-2026-0001.")).toBeInTheDocument()
    expect(screen.getByText("Repair")).toBeInTheDocument()
    expect(screen.getByText("One hour on site.")).toBeInTheDocument()
    expect(screen.getByText("Due Dec 1")).toBeInTheDocument()
    expect(screen.getByText("You can keep the card for future visits on the next page.")).toBeInTheDocument()
    expect(screen.getByText("Paid by check, Venmo or cash already? Nothing to do.")).toBeInTheDocument()
    expect(screen.getAllByRole("button")).toHaveLength(1)
    expect(screen.getByRole("button", { name: "Pay $145 by card" })).toBeInTheDocument()
    expect(screen.queryByText("Tax")).toBeNull()
  })

  it("says Was due for an overdue invoice and keeps the button", () => {
    render(<PayScreen bill={{ ...sent, status: "overdue" }} payAction={ok} />)
    expect(screen.getByText("Was due Dec 1")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Pay $145 by card" })).toBeInTheDocument()
  })

  it("shows the tax line only when there is tax, a credit as a minus, and a quantity under its line", () => {
    const bill: PayBill = {
      ...sent, tax: 9, total: 224,
      lines: [{ name: "Repair", description: null, quantity: 1, unitPrice: 145 }, { name: "Extra zones", description: null, quantity: 2, unitPrice: 10 }, { name: "Payments received", description: null, quantity: 1, unitPrice: -45 }],
    }
    render(<PayScreen bill={bill} payAction={ok} />)
    expect(screen.getByText("Tax")).toBeInTheDocument()
    expect(screen.getByText("$9")).toBeInTheDocument()
    expect(screen.getByText("-$45")).toBeInTheDocument()
    expect(screen.getByText("2 at $10")).toBeInTheDocument()
    expect(screen.getByText("$20")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Pay $224 by card" })).toBeInTheDocument()
  })

  it("keeps every dt and dd directly in the dl or in one div group of it, the structure axe's definition-list rules ask for", () => {
    const bill: PayBill = {
      ...sent, tax: 9, total: 224,
      lines: [{ name: "Repair", description: "One hour on site.", quantity: 2, unitPrice: 145 }, { name: "Payments received", description: null, quantity: 1, unitPrice: -45 }],
    }
    const { container } = render(<PayScreen bill={bill} payAction={ok} />)
    const list = container.querySelector("dl")!
    const terms = [...list.querySelectorAll("dt, dd")]
    expect(terms.length).toBe(2 + 1 + 1 + 2 + 2)
    for (const el of terms) {
      const parent = el.parentElement!
      expect(parent === list || parent.parentElement === list).toBe(true)
    }
    // a group holds exactly one dt, and a dd is never alone in its group
    for (const group of list.children) {
      expect(group.querySelectorAll(":scope > dt")).toHaveLength(1)
      expect(group.querySelectorAll(":scope > dd").length).toBeGreaterThanOrEqual(1)
      expect(group.querySelector("div")).toBeNull()
    }
  })

  it("shows a paid invoice with the date and the receipt, and no button", () => {
    render(<PayScreen bill={{ ...sent, status: "paid", paidOn: "2026-11-20", receiptUrl: "https://pay.stripe.test/r/1" }} payAction={ok} />)
    expect(screen.getByText("Paid Nov 20, thank you")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "View the receipt" })).toHaveAttribute("href", "https://pay.stripe.test/r/1")
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.queryByText(/keep the card/)).toBeNull()
  })

  it("a paid invoice always offers the receipt and the account, even before Stripe has a card receipt", () => {
    render(<PayScreen bill={{ ...sent, status: "paid", paidOn: "2026-11-20", receiptUrl: null }} payAction={ok} />)
    expect(screen.getByRole("link", { name: "View the receipt" })).toHaveAttribute("href", "/account/visits")
    expect(screen.getByRole("link", { name: "Open your Trailhead account" })).toHaveAttribute("href", "/account")
  })

  it("a voided invoice says Text Ryan if you have a question, with the phone", () => {
    render(<PayScreen bill={{ ...sent, status: "cancelled" }} payAction={ok} />)
    expect(screen.getByText(/if you have a question, at/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Text Ryan" }).getAttribute("href")).toMatch(/^sms:\+19706927270/)
    expect(screen.getByRole("link", { name: "(970) 692-7270" })).toHaveAttribute("href", "tel:9706927270")
  })

  it("shows a canceled invoice with one sentence and no button", () => {
    render(<PayScreen bill={{ ...sent, status: "cancelled" }} payAction={ok} />)
    expect(screen.getByText("This invoice was voided.")).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getByRole("link", { name: "(970) 692-7270" })).toHaveAttribute("href", "tel:9706927270")
  })

  it("runs the action once on a press and shows its sentence when the form would not open", async () => {
    const action = vi.fn(async () => ({ message: "We couldn't open the card form." }))
    render(<PayScreen bill={sent} payAction={action} />)
    fireEvent.click(screen.getByRole("button", { name: "Pay $145 by card" }))
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("We couldn't open the card form."))
    expect(action).toHaveBeenCalledTimes(1)
  })

  it("carries nothing of the customer but the first name, and none of the banned words", () => {
    const { container } = render(<PayScreen bill={sent} payAction={ok} />)
    expect(container.textContent).not.toMatch(/@|proposed|approve|failed|declined|—/)
  })
})

describe("pay-model words", () => {
  it("words the due day, the paid day and the button", () => {
    expect(dueWords({ dueOn: "2026-12-01", status: "sent" })).toBe("Due Dec 1")
    expect(dueWords({ dueOn: "2026-12-01", status: "overdue" })).toBe("Was due Dec 1")
    expect(paidWords({ paidOn: "2026-11-20" })).toBe("Paid Nov 20, thank you")
    expect(payLabel({ total: 1234 })).toBe("Pay $1,234 by card")
  })
})
