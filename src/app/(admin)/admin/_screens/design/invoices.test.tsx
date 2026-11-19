import { beforeAll, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { InvoicePage } from "./InvoicePanel"
import { InvoicesPage } from "./InvoicesPage"
import { INVOICE_FIXTURES, INVOICE_ROWS, invoicePageOf, invoiceTotals, sortInvoiceRows } from "./invoice-fixtures"

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)" || query === "(min-width: 768px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  Element.prototype.scrollIntoView = vi.fn()
})

describe("Invoices page", () => {
  it("reads the four tiles from the rows", () => {
    const t = invoiceTotals(INVOICE_ROWS)
    expect(t.unpaid).toEqual({ total: 759, count: 5 })
    expect(t.pastDue).toEqual({ total: 269, count: 2 })
    expect(t.sent.count).toBe(6)
    expect(t.paid).toEqual({ total: 260, count: 2 })
  })

  it("sorts past due first, oldest due day on top, then sent, then paid and canceled", () => {
    expect(sortInvoiceRows(INVOICE_ROWS).map((r) => r.status)).toEqual(["past-due", "past-due", "sent", "sent", "sent", "paid", "paid", "paid", "canceled"])
    expect(sortInvoiceRows(INVOICE_ROWS)[0]!.number).toBe("INV-2026-0035")
  })

  it("lists every invoice with the invoice, customer and job as chips and the row's actions", () => {
    render(<InvoicesPage rows={INVOICE_ROWS} />)
    expect(screen.getAllByRole("row")).toHaveLength(10)
    const first = screen.getAllByRole("row")[1]!
    expect(within(first).getByRole("link", { name: "Invoice: INV-2026-0035" })).toBeInTheDocument()
    expect(within(first).getByRole("link", { name: /Customer: Joe Alvarez/ })).toBeInTheDocument()
    expect(within(first).getByRole("link", { name: /Job: Sprinkler repair/ })).toBeInTheDocument()
    expect(within(first).getByText("Past due", { selector: "[data-slot=status-pill]" })).toBeInTheDocument()
    for (const name of ["Remind", "Collect payment", "Open"]) expect(within(first).getByRole("button", { name })).toBeInTheDocument()
    const paid = screen.getAllByRole("row").find((r) => r.textContent?.includes("INV-2026-0040"))!
    expect(within(paid).queryByRole("button", { name: "Remind" })).toBeNull()
    expect(within(paid).getByRole("button", { name: "Open" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Columns" })).toBeNull()
  })

  it("filters from a tile, from Status and from search, and says when nothing matches", () => {
    render(<InvoicesPage rows={INVOICE_ROWS} />)
    fireEvent.click(screen.getByRole("button", { name: /Past due/ }))
    expect(screen.getAllByRole("row")).toHaveLength(3)
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "paid" } })
    expect(screen.getAllByRole("row")).toHaveLength(4)
    fireEvent.change(screen.getByLabelText("Search invoices"), { target: { value: "cedar" } })
    expect(screen.getAllByRole("row")).toHaveLength(2)
    fireEvent.change(screen.getByLabelText("Search invoices"), { target: { value: "zzz" } })
    expect(screen.getByText("No invoices match.")).toBeInTheDocument()
  })

  it("says how an invoice gets made when there are none, and its tiles are plain", () => {
    render(<InvoicesPage rows={[]} />)
    expect(screen.getByText("No invoices yet")).toBeInTheDocument()
    expect(document.querySelectorAll("[data-slot=summary-cell][data-link]")).toHaveLength(0)
  })

  it("confirms Remind with the exact text and no caret", () => {
    render(<InvoicesPage rows={INVOICE_ROWS} />)
    fireEvent.click(within(screen.getAllByRole("row")[1]!).getByRole("button", { name: "Remind" }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText(/Trailhead: a reminder that your \$145 invoice for the sprinkler repair was due Nov 12/)).toBeInTheDocument()
    expect(within(dialog).queryByRole("button", { name: "More ways" })).toBeNull()
    expect(within(dialog).getByRole("link", { name: "Edit the wording in Settings" })).toBeInTheDocument()
  })
})

describe("Invoice page", () => {
  for (const which of INVOICE_FIXTURES) {
    it(`renders ${which} with the number as the title, its pill and the customer chip`, () => {
      render(<InvoicePage invoice={invoicePageOf(which)} />)
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^INV-2026-\d{4}$/)
      expect(within(document.querySelector("[data-slot=record-page-badges]") as HTMLElement).getByRole("link", { name: /Customer:/ })).toBeInTheDocument()
      for (const name of ["Lines", "Payments", "Reminders", "Messages", "Notes and history", "Customer", "Job", "Property"]) expect(screen.getByRole("heading", { name })).toBeInTheDocument()
      expect(document.querySelectorAll("[data-slot=summary-icon]")).toHaveLength(4)
    })
  }

  it("leads with Send a payment reminder while unpaid, with Collect payment beside it and Cancel invoice under More", () => {
    render(<InvoicePage invoice={invoicePageOf("sent")} />)
    const bar = document.querySelector("[data-slot=record-footer]") as HTMLElement
    expect(within(bar).getByRole("button", { name: "Send a payment reminder" })).toBeInTheDocument()
    expect(within(bar).getByRole("button", { name: "Collect payment" })).toBeInTheDocument()
    fireEvent.pointerDown(within(bar).getByRole("button", { name: "More" }), { button: 0, ctrlKey: false })
    for (const name of ["Resend the invoice", "Open pay page", "Cancel invoice"]) expect(screen.getByText(name)).toBeInTheDocument()
  })

  it("has no primary action once paid or canceled", () => {
    for (const which of ["paid-card", "paid-check", "canceled"] as const) {
      const { unmount } = render(<InvoicePage invoice={invoicePageOf(which)} />)
      const bar = document.querySelector("[data-slot=record-footer]") as HTMLElement
      expect(within(bar).queryByRole("button", { name: "Send a payment reminder" })).toBeNull()
      expect(within(bar).queryByRole("button", { name: "Collect payment" })).toBeNull()
      unmount()
    }
  })

  it("shows the reminder schedule with Pause and, once paused, Resume", () => {
    render(<InvoicePage invoice={invoicePageOf("sent")} />)
    expect(screen.getByText("Next reminder: Nov 29, 3 days before due")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Pause" }))
    expect(screen.getByText("Scheduled reminders are paused.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument()
  })

  it("lists the reminders already sent by hand and by the schedule", () => {
    render(<InvoicePage invoice={invoicePageOf("past-due")} />)
    const reminders = within(screen.getByRole("heading", { name: "Reminders" }).closest("section")!)
    expect(reminders.getByText("Scheduled, 3 days before due")).toBeInTheDocument()
    expect(reminders.getByText("Scheduled, on the due date")).toBeInTheDocument()
    expect(reminders.getByText("Next reminder: Nov 24, 7 days after due")).toBeInTheDocument()
  })

  it("moves a sent reminder into the table and greys the button, with no message in the section", () => {
    render(<InvoicePage invoice={invoicePageOf("sent")} initialDialog="remind" />)
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Send the reminder" }))
    return screen.findByRole("button", { name: "Reminded today" }).then((b) => {
      expect(b).toBeDisabled()
      expect(within(screen.getByRole("heading", { name: "Reminders" }).closest("section")!).getByText("By hand")).toBeInTheDocument()
    })
  })

  it("makes the band's tiles links and leaves Paid on plain while unpaid", () => {
    render(<InvoicePage invoice={invoicePageOf("sent")} />)
    expect(document.querySelectorAll("[data-slot=summary-cell][data-link]")).toHaveLength(3)
    const { unmount } = render(<InvoicePage invoice={invoicePageOf("paid-card")} />)
    expect(screen.getAllByRole("link", { name: /Paid on/ }).length).toBe(1)
    unmount()
  })

  it("shows the tax on the lines and the card kept on a card payment", () => {
    const { unmount } = render(<InvoicePage invoice={invoicePageOf("past-due")} />)
    expect(screen.getByText("Tax")).toBeInTheDocument()
    expect(screen.getByText("$9")).toBeInTheDocument()
    unmount()
    render(<InvoicePage invoice={invoicePageOf("paid-card")} />)
    expect(screen.getByText("Card, kept on file")).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: /Open in Stripe/ }).length).toBeGreaterThan(0)
  })

  it("asks to cancel in the destructive colour, with a notify-free way under the caret", () => {
    render(<InvoicePage invoice={invoicePageOf("sent")} initialDialog="cancel" />)
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText(/and notify the customer by text at \(970\) 555-0188/)).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "More ways" })).toBeInTheDocument()
  })
})
