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

  it("lists every invoice with ONE link a row (its number), the customer and the job as text, and one action with the rest under More", async () => {
    render(<InvoicesPage rows={INVOICE_ROWS} />)
    expect(screen.getAllByRole("row")).toHaveLength(10)
    const first = screen.getAllByRole("row")[1]!
    // the number is the row's one link, to the invoice's own page; the customer and the job are text
    const links = within(first).getAllByRole("link")
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveTextContent("INV-2026-0035")
    expect(links[0]).toHaveAttribute("href", expect.stringContaining("invoice=i35"))
    expect(within(first).getByText("Joe Alvarez").closest("a")).toBeNull()
    expect(within(first).getByText("Sprinkler repair").closest("a")).toBeNull()
    expect(document.querySelectorAll("[data-slot=record-chip]")).toHaveLength(0)
    expect(within(first).getByText("Past due", { selector: "[data-slot=status-pill]" })).toBeInTheDocument()
    // one visible action; Collect payment is under the row's More
    expect(within(first).getByRole("button", { name: "Remind" }).parentElement).toHaveClass("flex-nowrap")
    expect(within(first).queryByRole("button", { name: "Collect payment" })).toBeNull()
    const paid = screen.getAllByRole("row").find((r) => r.textContent?.includes("INV-2026-0040"))!
    expect(within(paid).queryByRole("button")).toBeNull()
    expect(within(paid).getAllByRole("link")).toHaveLength(1)
    const more = within(first).getByRole("button", { name: "More for INV-2026-0035" })
    fireEvent.pointerDown(more, { button: 0, ctrlKey: false })
    fireEvent.click(more)
    expect(await screen.findByRole("menuitem", { name: "Collect payment" })).toBeInTheDocument()
  })

  it("opens the invoice from a click anywhere on its row, and not from a click on the row's own button", () => {
    render(<InvoicesPage rows={INVOICE_ROWS} />)
    const first = screen.getAllByRole("row")[1]!
    const opened = vi.fn((e: Event) => e.preventDefault())
    within(first).getByRole("link").addEventListener("click", opened)
    fireEvent.click(within(first).getByText("Joe Alvarez"))
    expect(opened).toHaveBeenCalledTimes(1)
    fireEvent.click(within(first).getByRole("button", { name: "Remind" }))
    expect(opened).toHaveBeenCalledTimes(1)
    // a Do not service customer keeps the mark beside the name
    expect(document.querySelectorAll("[data-slot=do-not-service-dot]").length).toBeGreaterThan(0)
  })

  it("has one toolbar row, Status and Who chips and a search, and filters from a tile", () => {
    render(<InvoicesPage rows={INVOICE_ROWS} />)
    expect(screen.getAllByRole("button", { name: "Status" }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: "Who" }).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole("button", { name: /Past due/ }))
    expect(screen.getAllByRole("row")).toHaveLength(3)
    fireEvent.change(screen.getByRole("searchbox", { name: "Search by number, name or street" }), { target: { value: "zzz" } })
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
    it(`renders ${which} with the number as the title and its pill, and the customer linked once, in the Customer card`, () => {
      render(<InvoicePage invoice={invoicePageOf(which)} />)
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^INV-2026-\d{4}$/)
      // no chip in the header; the one link to the customer is the Customer card's, and the address is text
      expect(within(document.querySelector("[data-slot=record-page-badges]") as HTMLElement).queryByRole("link")).toBeNull()
      expect(Array.from(document.querySelectorAll("a[href^='/admin/customers']"))).toHaveLength(1)
      expect(within(screen.getByRole("region", { name: "Customer" })).getByRole("link", { name: /Customer:/ })).toBeInTheDocument()
      expect(document.querySelector("[data-slot=customer-address] a")).toBeNull()
      for (const name of ["Lines", "Payments", "Reminders", "Messages", "Notes and history", "Customer", "Job"]) expect(screen.getByRole("heading", { name })).toBeInTheDocument()
      expect(screen.queryByRole("heading", { name: "Property" })).toBeNull()
      // Notes and history is the last card of the aside, as on every record page
      const aside = document.querySelector("[data-slot=record-page-aside]") as HTMLElement
      expect(Array.from(aside.querySelectorAll("h2")).at(-1)).toHaveTextContent("Notes and history")
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

  it("makes each band tile scroll to its section on this page (none leaves it) and leaves Paid on plain, with no chevron, while unpaid", () => {
    render(<InvoicePage invoice={invoicePageOf("sent")} />)
    const paidOn = Array.from(document.querySelectorAll("[data-slot=summary-cell]")).find((c) => c.textContent?.includes("Paid on"))!
    expect(paidOn).not.toHaveAttribute("data-link")
    expect(paidOn.querySelector("svg.lucide-chevron-right")).toBeNull()
    expect(document.querySelectorAll("[data-slot=summary-cell][data-link]")).toHaveLength(3)
    expect(document.querySelectorAll("a[data-slot=summary-cell]")).toHaveLength(0)
    const { unmount } = render(<InvoicePage invoice={invoicePageOf("paid-card")} />)
    expect(screen.getAllByRole("button", { name: /Paid on/ }).length).toBe(1)
    expect(document.querySelectorAll("a[data-slot=summary-cell]")).toHaveLength(0)
    unmount()
  })

  it("shows the tax on the lines and the card kept on a card payment", () => {
    const { unmount } = render(<InvoicePage invoice={invoicePageOf("past-due")} />)
    expect(screen.getByText("Tax")).toBeInTheDocument()
    expect(screen.getByText("$9")).toBeInTheDocument()
    unmount()
    render(<InvoicePage invoice={invoicePageOf("paid-card")} />)
    expect(screen.getByText(/Visa ending 4242, kept on file/)).toBeInTheDocument()
    // Open in Stripe is under the payment row's More
    expect(within(document.querySelector("[data-slot=payment-table]") as HTMLElement).getByRole("button", { name: "More" })).toBeInTheDocument()
  })

  it("reads Refunded, never Past due, with both payment rows and no reminder or Collect payment", () => {
    render(<InvoicePage invoice={invoicePageOf("refunded")} />)
    expect(within(document.querySelector("[data-slot=record-page-badges]") as HTMLElement).getByText("Refunded")).toBeInTheDocument()
    expect(screen.queryByText("Past due")).toBeNull()
    const pay = within(document.querySelector("[data-slot=payment-table]") as HTMLElement)
    expect(pay.getByText("-$145")).toBeInTheDocument()
    expect(pay.getByText("$145")).toBeInTheDocument()
    const bar = document.querySelector("[data-slot=record-footer]") as HTMLElement
    expect(within(bar).queryByRole("button", { name: /reminder|Collect payment/ })).toBeNull()
  })

  it("asks to cancel in the destructive colour, with a notify-free way under the caret", () => {
    render(<InvoicePage invoice={invoicePageOf("sent")} initialDialog="cancel" />)
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText(/and notify the customer by text at \(970\) 555-0188/)).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "More ways" })).toBeInTheDocument()
  })
})
