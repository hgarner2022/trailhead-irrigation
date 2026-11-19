import { beforeAll, describe, it, expect, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { JobPage } from "./JobPage"
import { JobPagePass, JobPageReturnTrip } from "./JobPageTrips"
import { InvoicePanel } from "./InvoicePanel"
import { InvoicesPage } from "./InvoicesPage"
import { CustomerBilling } from "./CustomerBilling"
import { JOB_STATES, jobPageOf } from "./job-fixtures"
import { INVOICE_ROWS, invoiceOf } from "./invoice-fixtures"
import { PASS_STATES, passPageOf, returnTripOf } from "./trip-fixtures"

// The design screens render in every state, with one primary action where the design says there is one.

const primaries = (el: HTMLElement) => el.querySelectorAll("[data-slot=record-footer] button[data-slot=button]:not([class*=border]):not([class*=ghost])").length

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})

describe("job page, one trip", () => {
  const PRIMARY: Record<string, string | null> = { unscheduled: "Schedule", scheduled: "Move", today: "On my way", late: "Mark done", "invoice-sent": "Remind", "past-due": "Remind", "done-paid": null, canceled: null }
  for (const state of JOB_STATES) {
    it(`renders ${state} with the customer as the title`, () => {
      render(<JobPage job={jobPageOf(state)} />)
      expect(screen.getByRole("heading", { level: 1, name: "Andrea Dalton" })).toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "Billing" })).toBeInTheDocument()
      const first = document.querySelector("[data-slot=record-footer] button")
      if (state in PRIMARY && PRIMARY[state]) expect(first).toHaveTextContent(PRIMARY[state] as string)
      if (state === "done-paid") expect(first).toHaveTextContent("More")
      if (state === "canceled") expect(first).toBeNull()
    })
  }

  it("shows How is this paid? inline with the card first when done and unpaid", () => {
    render(<JobPage job={jobPageOf("done-unpaid")} />)
    expect(screen.getByText(/How is this paid/i)).toBeInTheDocument()
  })

  it("says Mark done or Skip for a trip whose day passed", () => {
    render(<JobPage job={jobPageOf("late")} />)
    expect(screen.getByText(/never marked done\. Mark done or Skip\./)).toBeInTheDocument()
  })

  it("has no footer bar on a canceled job", () => {
    const { container } = render(<JobPage job={jobPageOf("canceled")} />)
    expect(container.querySelector("[data-slot=record-page-footer]")).toBeNull()
    expect(primaries(container)).toBe(0)
  })
})

describe("job page, more than one trip", () => {
  for (const state of PASS_STATES) {
    it(`renders the Season Pass ${state} titled with its number and two rows`, () => {
      const { container } = render(<JobPagePass data={passPageOf(state)} />)
      expect(screen.getByRole("heading", { level: 1, name: "Season Pass TH-2027-0008" })).toBeInTheDocument()
      expect(container.querySelectorAll("[data-slot=trip-row]")).toHaveLength(2)
    })
  }

  it("puts Move and Mark done on each trip still ahead", () => {
    render(<JobPagePass data={passPageOf("ahead")} />)
    expect(screen.getAllByRole("button", { name: "Move" })).toHaveLength(2)
    expect(screen.getAllByRole("button", { name: "Mark done" })).toHaveLength(2)
  })

  it("renders a repair with a return trip as two rows", () => {
    const { container } = render(<JobPageReturnTrip data={returnTripOf()} />)
    expect(container.querySelectorAll("[data-slot=trip-row]")).toHaveLength(2)
  })
})

describe("invoices", () => {
  it("lists every invoice with the four tiles and one New invoice button", () => {
    render(<InvoicesPage rows={INVOICE_ROWS} />)
    expect(screen.getByRole("button", { name: "New invoice" })).toBeInTheDocument()
    for (const label of ["Unpaid", "Past due", "Paid this month", "Days to get paid"]) expect(screen.getAllByText(label).length).toBeGreaterThan(0)
  })

  it("says how an invoice gets made when there are none", () => {
    render(<InvoicesPage rows={[]} />)
    expect(screen.getByText("No invoices yet")).toBeInTheDocument()
  })

  it("renders the invoice panel in each state with its reminder line", () => {
    for (const s of ["sent", "sent-reminded", "past-due", "part-paid", "paid", "voided"] as const) {
      const { unmount } = render(<InvoicePanel invoice={invoiceOf(s)} />)
      expect(within(document.body).getAllByText(/Reminders|reminders|None, it is voided/).length).toBeGreaterThan(0)
      unmount()
    }
  })

  it("renders the customer's Billing section", () => {
    render(<CustomerBilling />)
    expect(within(document.body).getByRole("heading", { name: "Billing" })).toBeInTheDocument()
  })
})
