import { beforeAll, describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { InvoiceTable, PaymentTable, type InvoiceRowData, type PaymentRowData } from "./BillingTables"

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})

const CARD: PaymentRowData = { id: "p2", at: "2026-04-20T17:00:00Z", method: "card", methodLabel: "Visa ending 4242", amount: "$145", by: "Andrea, online", receiptHref: "/account/receipts/p2", stripeHref: "https://dashboard.stripe.com/payments/pi_1", canRefund: true }
const CHECK: PaymentRowData = { ...CARD, id: "p1", method: "check", methodLabel: "Check #1042", stripeHref: undefined }

describe("PaymentTable", () => {
  it("offers View receipt on every row and Open in Stripe only on a card payment, in a new tab, each icon with its label", () => {
    render(<PaymentTable rows={[CARD, CHECK]} />)
    expect(screen.getAllByRole("link", { name: "View receipt" })).toHaveLength(2)
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

  it("draws a refund as a grey negative row with no buttons but View receipt", () => {
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

const OUT: InvoiceRowData = { id: "i1", number: "INV-2026-0042", amount: "$145", sent: "Nov 18", due: "Dec 2", status: "bill-sent", canRemind: true }
const PAID: InvoiceRowData = { ...OUT, status: "paid", canRemind: false, paidBy: CARD }

describe("InvoiceTable: Invoices and payments", () => {
  it("is one row for a paid invoice: the number, how it was paid under it, the amount, the Paid pill and the buttons", () => {
    render(<InvoiceTable rows={[PAID]} onRefund={vi.fn()} />)
    const table = document.querySelector("[data-slot=invoice-table]") as HTMLElement
    expect(within(table).getAllByRole("row")).toHaveLength(2) // the header and one row
    expect(within(table).getByText("Paid by Visa ending 4242 on Apr 20 · Andrea, online")).toBeInTheDocument()
    expect(within(table).getByText("Paid")).toBeInTheDocument()
    expect(within(table).getByRole("link", { name: "View receipt" })).toBeInTheDocument()
    expect(within(table).getByRole("link", { name: /Open in Stripe/ })).toBeInTheDocument()
    expect(within(table).getByRole("link", { name: "Open invoice" })).toBeInTheDocument()
    expect(within(table).queryByRole("button", { name: "Remind" })).toBeNull()
  })

  it("puts a refund as a grey negative row under the payment it reverses, with only View receipt", () => {
    const refund: PaymentRowData = { ...CARD, id: "r1", amount: "-$50", refund: true, refundOf: "p2", canRefund: false, stripeHref: undefined, at: "2026-04-22T17:00:00Z" }
    render(<InvoiceTable rows={[{ ...PAID, refunds: [refund] }]} />)
    const rows = within(document.querySelector("[data-slot=invoice-table]") as HTMLElement).getAllByRole("row")
    expect(rows).toHaveLength(3)
    expect(within(rows[2]!).getByText("-$50")).toHaveClass("text-muted-foreground")
    expect(within(rows[2]!).getByText("Refunded")).toBeInTheDocument()
    expect(within(rows[2]!).getAllByRole("link")).toHaveLength(1)
  })

  it("keeps Remind on an invoice that is still out and shows when it was sent and is due", () => {
    render(<InvoiceTable rows={[OUT]} onRemind={vi.fn()} />)
    expect(screen.getByText("Sent Nov 18, due Dec 2")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Remind" })).toBeInTheDocument()
  })

  it("draws no sort arrows in a table of fewer than six rows", () => {
    render(<InvoiceTable rows={[PAID]} />)
    render(<PaymentTable rows={[CHECK]} />)
    for (const table of document.querySelectorAll("[data-slot=data-grid-table]")) {
      expect(table.querySelectorAll("th button")).toHaveLength(0)
      expect(table.querySelector("th[aria-sort]")).toBeNull()
    }
  })

  it("starts the first cell at the card's edge and ends the last there, so hairlines do not bleed", () => {
    render(<PaymentTable rows={[CHECK]} />)
    const grid = document.querySelector("[data-slot=data-grid-table]") as HTMLElement
    expect(grid.className).not.toMatch(/-mx-/)
    expect(grid.querySelector("th")?.className).toContain("first:pl-0")
    expect(grid.querySelector("td")?.className).toContain("first:pl-0")
    expect(grid.querySelector("td:last-child")?.className).toContain("last:pr-0")
  })
})
