import { beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
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
      for (const name of ["Jobs", "Billing", "Messages", "Notes and history", "Contact", "Property", "Consent"]) expect(screen.getByRole("heading", { name })).toBeInTheDocument()
      // a Season Pass block only for a customer who has a pass
      expect(screen.queryByRole("heading", { name: "Season Pass" }) !== null).toBe(customerPageOf(state).area.kind === "pass")
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

  it("has no Unpaid pill and offers Collect payment beside Send a message", () => {
    render(<CustomerPage customer={customerPageOf("pass-holder")} />)
    expect(screen.queryByText("Unpaid $145", { selector: "[data-slot=status-pill]" })).toBeNull()
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

  it("has no Season Pass card or sales pitch for a customer without a pass, and sells one from More", () => {
    render(<CustomerPage customer={customerPageOf("one-off")} />)
    expect(screen.queryByRole("heading", { name: "Season Pass" })).toBeNull()
    expect(screen.queryByText("Get a Season Pass")).toBeNull()
    fireEvent.pointerDown(within(document.querySelector("[data-slot=record-footer]") as HTMLElement).getByRole("button", { name: "More" }), { button: 0, ctrlKey: false })
    expect(screen.getByText("Sell a Season Pass")).toBeInTheDocument()
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

  it("shows refunds in the words of the job page: Refunded in Jobs, the negative grey row, no Unpaid, no Collect payment", () => {
    render(<CustomerPage customer={customerPageOf("refunded")} />)
    expect(within(sectionOf("Jobs")).getByText("Refunded")).toBeInTheDocument()
    const billing = within(sectionOf("Billing"))
    expect(billing.getByText("$145 refunded to the card on Nov 19, by Ryan")).toBeInTheDocument()
    expect(billing.getByText("-$145")).toBeInTheDocument()
    expect(billing.queryByText("Unpaid")).toBeNull()
    expect(screen.getByText("Nothing unpaid")).toBeInTheDocument()
    expect(within(document.querySelector("[data-slot=record-footer]") as HTMLElement).queryByRole("button", { name: "Collect payment" })).toBeNull()
  })

  it("reads Paid, $50 refunded in green after a partial refund", () => {
    render(<CustomerPage customer={customerPageOf("part-refunded")} />)
    expect(within(sectionOf("Jobs")).getByText("Paid, $50 refunded")).toBeInTheDocument()
    const line = document.querySelector("[data-slot=billing-state]") as HTMLElement
    expect(line.dataset.tone).toBe("paid")
    expect(line).toHaveTextContent("$95 stays paid by card, Visa ending 4242. $50 was refunded to the card on Nov 19, by Ryan.")
  })

  it("keeps transactional consent apart from marketing, off by default, and turns a channel on only through a dialog with a source and a note", async () => {
    render(<CustomerPage customer={customerPageOf("one-off")} />)
    const consent = within(sectionOf("Consent"))
    expect(consent.getByText("Texts and email about your visits and billing")).toBeInTheDocument()
    expect(consent.getByText("Allowed")).toBeInTheDocument()
    expect(consent.getByText("Not in marketing")).toBeInTheDocument()
    expect(consent.getByRole("switch", { name: "Marketing email" })).toHaveAttribute("aria-checked", "false")
    fireEvent.click(consent.getByRole("switch", { name: "Marketing email" }))
    const dialog = screen.getByRole("dialog")
    const confirm = within(dialog).getByRole("button", { name: "Opt in to email" })
    expect(confirm).toBeDisabled()
    fireEvent.change(within(dialog).getByLabelText("How did they say yes?"), { target: { value: "In person" } })
    fireEvent.change(within(dialog).getByLabelText(/^Note/), { target: { value: "Said yes at the door" } })
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(consent.getByRole("switch", { name: "Marketing email" })).toHaveAttribute("aria-checked", "true"))
    expect(consent.queryByText("Not in marketing")).toBeNull()
  })

  it("turns a channel off at once and writes a consent row", () => {
    render(<CustomerPage customer={customerPageOf("pass-holder")} />)
    const consent = within(sectionOf("Consent"))
    expect(consent.getByText("Opted in Nov 2 by the customer on the website")).toBeInTheDocument()
    fireEvent.click(consent.getByRole("switch", { name: "Marketing email" }))
    expect(consent.getByRole("switch", { name: "Marketing email" })).toHaveAttribute("aria-checked", "false")
    expect(consent.getByText("Not in marketing")).toBeInTheDocument()
    fireEvent.click(consent.getByRole("button", { name: "Consent history" }))
    expect(within(screen.getByRole("dialog")).getByText("Opted out of marketing email")).toBeInTheDocument()
  })

  it("says a STOP reply sends every text as an email, in neutral words", () => {
    render(<CustomerPage customer={customerPageOf("two-seasons")} />)
    const consent = within(sectionOf("Consent"))
    expect(consent.getByText("Stopped by reply STOP on Oct 3. Every text goes as an email.")).toBeInTheDocument()
    expect(consent.getByLabelText("Contact by")).toHaveValue("email")
  })

  it("shows the status pill, the pass pill and no money pill in the header, with the status read from the facts", () => {
    const words: [Parameters<typeof customerPageOf>[0], string][] = [["nothing-yet", "New"], ["pass-holder", "Active"], ["active-recent", "Active"], ["past-customer", "Past customer"], ["archived", "Archived"]]
    for (const [state, word] of words) {
      const { unmount } = render(<CustomerPage customer={customerPageOf(state)} />)
      const badges = within(document.querySelector("[data-slot=record-page-badges]") as HTMLElement)
      expect(badges.getByText(word, { selector: "[data-slot=status-pill]" })).toBeInTheDocument()
      expect(badges.queryByText(/Unpaid \$|Past due \$/)).toBeNull()
      unmount()
    }
    render(<CustomerPage customer={customerPageOf("pass-holder")} />)
    expect(within(document.querySelector("[data-slot=record-page-badges]") as HTMLElement).getByText("Season Pass 2027")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Unpaid/ })).toBeInTheDocument()
  })

  it("marks Do not service with a red tag and edits it from a checkbox with an optional reason that goes to the history", async () => {
    render(<CustomerPage customer={customerPageOf("past-customer")} />)
    expect(within(document.querySelector("[data-slot=record-page-badges]") as HTMLElement).getByText("Do not service")).toBeInTheDocument()
    cleanup()
    render(<CustomerPage customer={customerPageOf("one-off")} initialDialog="edit" />)
    const dialog = screen.getByRole("dialog")
    fireEvent.click(within(dialog).getByLabelText("Do not service this customer"))
    fireEvent.change(within(dialog).getByLabelText(/Reason/), { target: { value: "Gate stays locked" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Save details" }))
    await waitFor(() => expect(within(document.querySelector("[data-slot=record-page-badges]") as HTMLElement).getByText("Do not service")).toBeInTheDocument())
    expect(screen.getByText("Marked Do not service: Gate stays locked")).toBeInTheDocument()
    expect(screen.getAllByText(/Gate stays locked/).length).toBeGreaterThan(0)
  })

  it("refuses to archive while a job is open, naming it", () => {
    render(<CustomerPage customer={customerPageOf("pass-holder")} initialDialog="archive" />)
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText("Open jobs: Season Pass 2027, Sprinkler repair. Finish or cancel them first.")).toBeInTheDocument()
    expect(within(dialog).queryByRole("button", { name: "Archive customer" })).toBeNull()
  })

  it("confirms an archive with the balance in the destructive colour, then shows the banner and Unarchive", async () => {
    render(<CustomerPage customer={customerPageOf("active-recent")} initialDialog="archive" />)
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText("Hal Reed owes $145. Archive anyway? The invoice stays open and shows on Reports.")).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Archive customer" }))
    await waitFor(() => expect(document.querySelector("[data-slot=archived-banner]")).not.toBeNull())
    expect(screen.getByText("Archived Nov 20. New work brings them back.")).toBeInTheDocument()
    expect(within(document.querySelector("[data-slot=record-page-badges]") as HTMLElement).getByText("Archived")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Unarchive" }))
    expect(document.querySelector("[data-slot=archived-banner]")).toBeNull()
    expect(within(document.querySelector("[data-slot=record-page-badges]") as HTMLElement).getByText("Active")).toBeInTheDocument()
  })

  it("holds no result message in any section", () => {
    render(<CustomerPage customer={customerPageOf("pass-holder")} />)
    expect(screen.queryByText(/Note added/)).toBeNull()
    expect(document.querySelectorAll("[role=status]:not(:empty)")).toHaveLength(0)
  })
})
