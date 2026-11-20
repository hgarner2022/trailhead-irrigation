import { beforeAll, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { CustomerPage } from "./CustomerPage"
import { sortInvoices, sortJobs } from "./CustomerTables"
import { CUSTOMER_STATES, customerPageOf } from "./customer-fixtures"

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)" || query === "(min-width: 768px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})

const sectionOf = (name: string) => screen.getByRole("heading", { name }).closest("section")!

describe("customer page", () => {
  for (const state of CUSTOMER_STATES) {
    it(`renders ${state} with the name as title, New job as the one primary and the cards`, () => {
      render(<CustomerPage customer={customerPageOf(state)} />)
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
      expect(document.querySelector("[data-slot=record-footer] a, [data-slot=record-footer] button")).toHaveTextContent("New job")
      for (const name of ["Jobs", "Season Pass", "Billing", "Messages", "Notes and history", "Contact", "Property", "Consent"]) expect(screen.getByRole("heading", { name })).toBeInTheDocument()
      expect(document.querySelectorAll("[data-slot=summary-icon]")).toHaveLength(4)
    })
  }

  it("makes every summary tile with something behind it a link or a button, and leaves an empty one plain", () => {
    render(<CustomerPage customer={customerPageOf("pass-holder")} />)
    expect(document.querySelectorAll("[data-slot=summary-cell][data-link]")).toHaveLength(4)
    expect(screen.getByRole("link", { name: /Unpaid/ })).toHaveAttribute("href", expect.stringContaining("invoice=i1"))
    expect(screen.getByRole("link", { name: /Next visit/ })).toHaveAttribute("href", expect.stringContaining("job=j1"))
    expect(within(document.querySelector("[data-slot=summary-band]") as HTMLElement).getByRole("link", { name: /Season Pass/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Card on file/ })).toBeInTheDocument()
    render(<CustomerPage customer={customerPageOf("nothing-yet")} />)
    const bands = document.querySelectorAll("[data-slot=summary-band]")
    expect(bands[1]!.querySelectorAll("[data-link]")).toHaveLength(0)
  })

  it("shows Unpaid $145 as a badge and offers Collect payment beside Send a message", () => {
    render(<CustomerPage customer={customerPageOf("pass-holder")} />)
    expect(screen.getByText("Unpaid $145", { selector: "[data-slot=status-pill]" })).toBeInTheDocument()
    const bar = document.querySelector("[data-slot=record-footer]") as HTMLElement
    expect(within(bar).getByRole("button", { name: "Collect payment" })).toBeInTheDocument()
    expect(within(bar).getByRole("button", { name: "Send a message" })).toBeInTheDocument()
    expect(within(bar).queryByRole("button", { name: /Record the payment/ })).toBeNull()
  })

  it("offers no Collect payment when nothing is unpaid, and Delete only when nothing has happened", () => {
    const { unmount } = render(<CustomerPage customer={customerPageOf("one-off")} />)
    expect(screen.queryByRole("button", { name: "Collect payment" })).toBeNull()
    unmount()
    render(<CustomerPage customer={customerPageOf("nothing-yet")} />)
    fireEvent.pointerDown(within(document.querySelector("[data-slot=record-footer]") as HTMLElement).getByRole("button", { name: "More" }), { button: 0, ctrlKey: false })
    expect(screen.getByRole("menuitem", { name: "Delete customer" })).toBeInTheDocument()
  })

  it("lists every job with a name chip, a day chip to the Schedule, a person chip, a status pill and a money word, open jobs first", () => {
    render(<CustomerPage customer={customerPageOf("pass-holder")} />)
    const jobs = within(sectionOf("Jobs"))
    expect(jobs.getAllByRole("row")).toHaveLength(6)
    expect(jobs.queryByRole("button", { name: "Columns" })).toBeNull()
    expect(jobs.getByRole("link", { name: /Day: May 3, 2027/ })).toHaveAttribute("href", expect.stringContaining("/admin/schedule?day=2027-05-03"))
    expect(jobs.getAllByRole("link", { name: /Person: Ryan/ }).length).toBeGreaterThan(0)
    expect(jobs.getByText("Paid, Venmo")).toBeInTheDocument()
    expect(jobs.getByText("Charged after each visit")).toBeInTheDocument()
    const first = jobs.getAllByRole("row")[1]!
    expect(first).toHaveTextContent("Season Pass 2027")
    expect(sortJobs(customerPageOf("pass-holder").jobs).map((j) => j.open)).toEqual([true, true, false, false, false])
  })

  it("is the embedded grid: no Columns control and no search, the job chip is the row's link, and a day never wraps", () => {
    render(<CustomerPage customer={customerPageOf("pass-holder")} />)
    const jobs = within(sectionOf("Jobs"))
    expect(jobs.queryByRole("button", { name: "Columns" })).toBeNull()
    expect(jobs.queryByRole("searchbox")).toBeNull()
    expect(jobs.getAllByRole("link", { name: /Job: Sprinkler repair/ })[0]).toHaveAttribute("href", expect.stringContaining("/admin/jobs?job="))
    expect(document.querySelector("[data-slot=data-grid-table] th")).not.toHaveClass("bg-stone")
  })

  it("says Paid in full or the unpaid amount in Billing, with Total, Paid, Unpaid and the card", () => {
    const { unmount } = render(<CustomerPage customer={customerPageOf("pass-holder")} />)
    const billing = within(sectionOf("Billing"))
    expect(billing.getByText("$145 unpaid")).toBeInTheDocument()
    for (const label of ["Total", "Paid", "Unpaid", "Card on file"]) expect(billing.getAllByText(label).length).toBeGreaterThan(0)
    expect(billing.getByText(/Visa ending 4242, expires 08\/28/)).toBeInTheDocument()
    expect(billing.getAllByRole("link", { name: /Open in Stripe/ }).length).toBeGreaterThan(1)
    expect(billing.getByRole("button", { name: "Update card" })).toBeInTheDocument()
    unmount()
    render(<CustomerPage customer={customerPageOf("one-off")} />)
    expect(within(sectionOf("Billing")).getByText("Paid in full")).toBeInTheDocument()
  })

  it("puts the invoices still out first and links each invoice row to the invoice", () => {
    expect(sortInvoices(customerPageOf("pass-holder").billing.invoices).map((i) => i.number)).toEqual(["INV-2026-0042", "INV-2026-0031"])
    render(<CustomerPage customer={customerPageOf("pass-holder")} />)
    expect(within(sectionOf("Billing")).getByRole("link", { name: "Invoice: INV-2026-0042" })).toHaveAttribute("href", expect.stringContaining("invoice=i1"))
  })

  it("links a renewal back to last season and last season forward to the renewal", () => {
    render(<CustomerPage customer={customerPageOf("two-seasons")} />)
    expect(screen.getByText(/Renewed from/)).toBeInTheDocument()
    const pass = within(sectionOf("Season Pass"))
    expect(pass.getAllByRole("link", { name: /Season Pass 2026, TH-2026-0003/ }).length).toBeGreaterThan(1)
    expect(pass.getByRole("link", { name: /Season Pass 2027, TH-2027-0011/ })).toBeInTheDocument()
  })

  it("sells a pass to a one-off customer", () => {
    render(<CustomerPage customer={customerPageOf("one-off")} />)
    expect(screen.getByRole("link", { name: "Get a Season Pass" })).toBeInTheDocument()
  })

  it("invites the first job when there is none", () => {
    render(<CustomerPage customer={customerPageOf("nothing-yet")} />)
    expect(within(sectionOf("Jobs")).getByRole("link", { name: "New job" })).toBeInTheDocument()
  })

  it("says the effect under the chosen way, with the dialog's own button as the confirm and no second dialog", () => {
    render(<CustomerPage customer={customerPageOf("pass-holder")} initialDialog="collect" />)
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getAllByRole("heading", { name: "How is this paid?" })).toHaveLength(1)
    expect(within(dialog).getByRole("radio", { name: /Charge the Visa ending 4242/ })).toBeChecked()
    expect(within(dialog).queryByRole("radio", { name: /Send an invoice/ })).toBeNull()
    fireEvent.click(within(dialog).getByRole("radio", { name: /Check/ }))
    expect(within(dialog).getByLabelText("Check number (optional)")).toHaveValue("")
    expect(within(dialog).getByText(/Andrea gets a receipt by text\./)).toBeInTheDocument()
    expect(within(dialog).getByText(/Invoice INV-2026-0042 is settled and its pay link stops working/)).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "Record the check" })).toBeInTheDocument()
    expect(within(dialog).queryByRole("button", { name: /More ways|without notifying/ })).toBeNull()
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
  })

  it("uses the email channel when that is the preference", () => {
    render(<CustomerPage customer={customerPageOf("two-seasons")} initialDialog="card-link" />)
    expect(screen.getByText(/by email at dale\.whitaker@example\.com/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "More ways" })).toBeNull()
  })

  it("shows the payments as the job page's table: the date, the method with its handle as a quiet line, the amount, a status and icon buttons", () => {
    render(<CustomerPage customer={customerPageOf("pass-holder")} />)
    const pay = within(document.querySelector("[data-slot=payment-table]") as HTMLElement)
    expect(pay.getByText("@andrea-d")).toBeInTheDocument()
    expect(pay.getAllByRole("link", { name: "Receipt" }).length).toBe(2)
    expect(pay.getAllByRole("link", { name: /Open in Stripe/ }).length).toBe(1)
    expect(pay.getAllByRole("link", { name: /Job:/ }).length).toBe(2)
  })

  it("holds no result message in any section", () => {
    render(<CustomerPage customer={customerPageOf("pass-holder")} />)
    expect(screen.queryByText(/Note added/)).toBeNull()
    expect(document.querySelectorAll("[role=status]:not(:empty)")).toHaveLength(0)
  })
})
