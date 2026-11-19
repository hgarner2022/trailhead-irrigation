import { beforeAll, describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { JobPage } from "./JobPage"
import { JobPagePass, JobPageReturnTrip } from "./JobPageTrips"
import { JOB_STATES, jobPageOf } from "./job-fixtures"
import { PASS_STATES, passPageOf, returnTripOf } from "./trip-fixtures"

// The design screens render in every state, with one primary action where the design says there is one.

const primaries = (el: HTMLElement) => el.querySelectorAll("[data-slot=record-footer] button[data-slot=button]:not([class*=border]):not([class*=ghost])").length

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})

describe("job page, one trip", () => {
  const PRIMARY: Record<string, string | null> = { unscheduled: "Schedule", scheduled: "Move", today: "On my way", late: "Mark done", "done-unpaid": "Collect payment", refunded: "Collect payment", "invoice-sent": "Send a payment reminder", "past-due": "Send a payment reminder", "on-the-way": "Mark done", active: "Mark done", "done-paid": null, canceled: null }
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

  it("opens How is this paid? from the one Collect payment button, card first, and holds no result card in Billing", () => {
    render(<JobPage job={jobPageOf("done-unpaid")} />)
    expect(screen.queryByText(/How is this paid/i)).toBeNull()
    expect(document.querySelector("[data-slot=settled-line]")).toHaveTextContent("$145 unpaid. No invoice yet.")
    expect(screen.queryByRole("button", { name: "Record the payment" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Collect payment" }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getAllByText(/How is this paid/i).length).toBeGreaterThan(0)
    expect(within(dialog).getByRole("radio", { name: /Visa ending 4242/ })).toBeChecked()
    expect(within(dialog).getByRole("button", { name: "Charge $145 to the Visa ending 4242" })).toBeInTheDocument()
  })

  it("keeps Collect payment beside the reminder on an invoice that is out, with no Record the payment header button", () => {
    render(<JobPage job={jobPageOf("invoice-sent")} />)
    expect(screen.getByRole("button", { name: "Collect payment" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Record the payment" })).toBeNull()
    expect(document.querySelector("[data-slot=settled-line]")).toHaveTextContent(/\$145 unpaid\. Invoice Invoice: INV-2026-0001 sent Nov 18, due Dec 2\./)
    const table = document.querySelector("[data-slot=invoice-table]") as HTMLElement
    expect(within(table).getByText("INV-2026-0001")).toBeInTheDocument()
    expect(within(table).getByText("Invoice sent")).toBeInTheDocument()
    expect(within(table).getByRole("button", { name: "Remind" })).toBeInTheDocument()
    expect(within(table).getByRole("link", { name: /Open invoice/ })).toBeInTheDocument()
  })

  it("says Paid in full in green with how, when and who, then the facts and a Payments table", () => {
    render(<JobPage job={jobPageOf("paid-check")} />)
    const line = document.querySelector("[data-slot=settled-line]") as HTMLElement
    expect(line).toHaveAttribute("data-tone", "paid")
    expect(line).toHaveTextContent("Paid in full. $145 paid by check #1042 on Nov 18, recorded by Ryan")
    const table = document.querySelector("[data-slot=payment-table]") as HTMLElement
    expect(within(table).getByText("Check #1042")).toBeInTheDocument()
    expect(within(table).getByRole("link", { name: /Receipt/ })).toBeInTheDocument()
    expect(within(table).queryByText(/Open in Stripe/)).toBeNull()
    expect(within(table).getByRole("button", { name: /More for the \$145 payment/ })).toBeInTheDocument()
  })

  it("offers Open in Stripe on a card payment", () => {
    render(<JobPage job={jobPageOf("paid-card")} />)
    const link = within(document.querySelector("[data-slot=payment-table]") as HTMLElement).getByRole("link", { name: /Open in Stripe/ })
    expect(link).toHaveAttribute("target", "_blank")
  })

  it("shows a refund as its own negative grey row and keeps the payment", () => {
    render(<JobPage job={jobPageOf("refunded")} />)
    const table = document.querySelector("[data-slot=payment-table]") as HTMLElement
    expect(within(table).getByText("-$145")).toBeInTheDocument()
    expect(within(table).getByText("Refunded")).toBeInTheDocument()
    expect(within(table).getByText("$145")).toBeInTheDocument()
    expect(document.querySelector("[data-slot=settled-line]")).toHaveAttribute("data-tone", "refunded")
  })

  it("opens the reminder with a non-editable preview, an Add a line box counted to 140 and no without-notifying caret", () => {
    render(<JobPage job={jobPageOf("invoice-sent")} />)
    fireEvent.click(screen.getAllByRole("button", { name: "Send a payment reminder" })[0]!)
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText(/Edit the wording in Settings/)).toBeInTheDocument()
    expect(within(dialog).queryByRole("button", { name: /without notifying|More ways/i })).toBeNull()
    fireEvent.change(within(dialog).getByLabelText(/Add a line/), { target: { value: "Thank you!" } })
    expect(within(dialog).getByText(/Thank you! Pay here: trailheadirrigation.com\/pay\/1042/)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/Add a line/)).toHaveAttribute("maxlength", "140")
  })

  it("draws no toolbar element above the Messages table", () => {
    render(<JobPage job={jobPageOf("scheduled")} />)
    expect(document.querySelector("[aria-labelledby=messages-h] [data-slot=data-grid-toolbar]")).toBeNull()
  })

  it("links the invoice number to its page as a chip and keeps the visit-report note", () => {
    render(<JobPage job={jobPageOf("invoice-sent")} />)
    const chip = document.querySelector("[data-slot=invoice-table] [data-slot=record-chip]") as HTMLElement
    expect(chip).toHaveAttribute("href", "/admin/invoices?invoice=inv-1")
    expect(chip).toHaveTextContent("INV-2026-0001")
    expect(screen.getByText("Includes the visit report")).toBeInTheDocument()
    expect(document.body.textContent).not.toContain("trailheadirrigation.com/pay/1042 ")
  })

  it("groups Photos as From Andrea above Ours, with the booking photo marked and no box or Remove on the customer's", () => {
    render(<JobPage job={jobPageOf("scheduled")} />)
    const heads = Array.from(document.querySelectorAll("[aria-labelledby=photos-h] h3")).map((h) => h.textContent)
    expect(heads).toEqual(["From Andrea", "Ours"])
    expect(screen.getByText("Andrea · Added when booked")).toBeInTheDocument()
    const theirs = document.querySelector("[aria-labelledby=photos-h] [data-slot=photos]") as HTMLElement
    expect(within(theirs).queryByRole("checkbox")).toBeNull()
    expect(within(theirs).queryByRole("button", { name: "Remove" })).toBeNull()
  })

  it("names the job and the person in Past visits as chips that link", () => {
    render(<JobPage job={jobPageOf("scheduled")} />)
    const past = screen.getAllByText("Fall blowout").map((e) => e.closest("[data-slot=record-chip]")).find(Boolean) as HTMLElement
    expect(past).toHaveAttribute("data-kind", "job")
    expect(past).toHaveAttribute("href", expect.stringContaining("/admin/jobs/"))
    expect(document.querySelectorAll("[data-slot=past-visit] [data-kind=person]").length).toBeGreaterThan(0)
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
