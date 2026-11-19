import { beforeAll, describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { InvoiceTable, PaymentTable, type PaymentRowData } from "./BillingTables"

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})

const CARD: PaymentRowData = { id: "p2", at: "2026-04-20T17:00:00Z", method: "card", methodLabel: "Visa ending 4242", amount: "$145", by: "Andrea, online", receiptHref: "/account/receipts/p2", stripeHref: "https://dashboard.stripe.com/payments/pi_1", canRefund: true }
const CHECK: PaymentRowData = { ...CARD, id: "p1", method: "check", methodLabel: "Check #1042", stripeHref: undefined }

describe("PaymentTable", () => {
  it("offers Receipt on every row and Open in Stripe only on a card payment, in a new tab", () => {
    render(<PaymentTable rows={[CARD, CHECK]} />)
    expect(screen.getAllByRole("link", { name: "Receipt" })).toHaveLength(2)
    const stripe = screen.getAllByRole("link", { name: /Open in Stripe/ })
    expect(stripe).toHaveLength(1)
    expect(stripe[0]).toHaveAttribute("rel", expect.stringContaining("noopener"))
  })

  it("puts Refund under More and asks the caller to confirm it", async () => {
    const onRefund = vi.fn()
    render(<PaymentTable rows={[CHECK]} onRefund={onRefund} />)
    const more = screen.getByRole("button", { name: /More for the \$145 payment/ })
    fireEvent.pointerDown(more, { button: 0, ctrlKey: false })
    fireEvent.click(more)
    fireEvent.click(await screen.findByRole("menuitem", { name: /Refund \$145/ }))
    expect(onRefund).toHaveBeenCalledWith(expect.objectContaining({ id: "p1" }))
  })

  it("draws a refund as a grey negative row with no buttons but Receipt", () => {
    render(<PaymentTable rows={[{ ...CHECK, id: "r1", amount: "-$145", refund: true, canRefund: false }]} onRefund={vi.fn()} />)
    const table = document.querySelector("[data-slot=payment-table]") as HTMLElement
    expect(within(table).getByText("-$145")).toHaveClass("text-muted-foreground")
    expect(within(table).getByText("Refunded")).toBeInTheDocument()
    expect(within(table).queryByRole("button", { name: /More for/ })).toBeNull()
  })
})

describe("InvoiceTable", () => {
  it("shows the number, amount, sent and due days with the pill and its two buttons", () => {
    const onRemind = vi.fn()
    render(<InvoiceTable rows={[{ id: "i1", number: "INV-2026-0001", amount: "$145", sent: "Nov 18", due: "Dec 2", status: "bill-sent", canRemind: true }]} onRemind={onRemind} />)
    expect(screen.getByText("INV-2026-0001")).toBeInTheDocument()
    expect(screen.getByText("Invoice sent")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Remind" }))
    expect(onRemind).toHaveBeenCalled()
    expect(screen.getByRole("link", { name: "Open invoice" })).toBeInTheDocument()
  })

  it("has no Remind on a paid invoice", () => {
    render(<InvoiceTable rows={[{ id: "i1", number: "INV-2026-0001", amount: "$145", sent: "Nov 18", due: "Dec 2", status: "paid", canRemind: false }]} onRemind={vi.fn()} />)
    expect(screen.queryByRole("button", { name: "Remind" })).toBeNull()
  })
})
