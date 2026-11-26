import { beforeAll, describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { JobPage } from "./JobPage"
import { ReminderDialog } from "./ReminderDialog"
import { PassFlow } from "./PassFlow"
import { ScheduleDialog } from "./ScheduleDialog"
import { JobPagePass, JobPageReturnTrip } from "./JobPageTrips"
import { JOB_STATES, jobPageOf } from "./job-fixtures"
import { FALL, PASS_STATES, SPRING, passPageBoughtOf, passPageOf, returnTripOf, tripOf } from "./trip-fixtures"

// The design screens render in every state, with one primary action where the design says there is one.

const primaries = (el: HTMLElement) => el.querySelectorAll("[data-slot=record-footer] button[data-slot=button]:not([class*=border]):not([class*=ghost])").length

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})

describe("job page, one trip", () => {
  const PRIMARY: Record<string, string | null> = { unscheduled: "Schedule", scheduled: "Move", today: "On my way", late: "Mark done", "done-unpaid": "Collect payment", "invoice-sent": "Send a payment reminder", "past-due": "Send a payment reminder", "on-the-way": "Mark done", active: "Mark done", "done-paid": null, canceled: null }
  for (const state of JOB_STATES) {
    it(`renders ${state} titled with the service, the customer under it`, () => {
      render(<JobPage job={jobPageOf(state)} />)
      expect(screen.getByRole("heading", { level: 1, name: "Sprinkler repair" })).toBeInTheDocument()
      expect(screen.getByText("for Andrea Dalton · Added Nov 18")).toBeInTheDocument()
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
    expect(document.querySelector("[data-slot=settled-line]")).toHaveTextContent(/\$145 unpaid\. Invoice INV-2026-0001 sent Nov 18, due Dec 2\./)
    const table = document.querySelector("[data-slot=invoice-table]") as HTMLElement
    expect(within(table).getByText("INV-2026-0001")).toBeInTheDocument()
    expect(within(table).getByText("Invoice sent")).toBeInTheDocument()
    expect(within(table).getByRole("button", { name: "Remind" })).toBeInTheDocument()
    // the invoice is linked once on the page: its number in its row (not the Total tile, not the status line, no "Open invoice" button)
    expect(document.querySelectorAll("a[href*='/admin/invoices?invoice=']")).toHaveLength(1)
    expect(within(table).getByRole("link", { name: "Invoice: INV-2026-0001" })).toBeInTheDocument()
  })

  it("says Paid in full in green and nothing else, with the one payment in a Payments table (a check has no invoice)", () => {
    render(<JobPage job={jobPageOf("paid-check")} />)
    const line = document.querySelector("[data-slot=settled-line]") as HTMLElement
    expect(line).toHaveAttribute("data-tone", "paid")
    expect(line).toHaveTextContent(/^Paid in full$/)
    expect(document.querySelector("[data-slot=billing-figures]")).toBeNull()
    expect(screen.queryByText("Card on file")).toBeNull()
    const table = document.querySelector("[data-slot=payment-table]") as HTMLElement
    expect(within(table).getByText("Check #1042")).toBeInTheDocument()
    expect(within(table).getByRole("link", { name: "View receipt" })).toBeInTheDocument()
    expect(within(table).queryByText(/Open in Stripe/)).toBeNull()
    expect(within(table).getByRole("button", { name: /More for the \$145 payment/ })).toBeInTheDocument()
  })

  it("shows a card payment that settled an invoice as ONE row, with View receipt and the rest under its More", () => {
    render(<JobPage job={jobPageOf("paid-card")} />)
    const table = document.querySelector("[data-slot=invoice-table]") as HTMLElement
    expect(document.querySelector("[data-slot=payment-table]")).toBeNull()
    expect(within(table).getAllByRole("row")).toHaveLength(2)
    expect(within(table).getByText("INV-2026-0001")).toBeInTheDocument()
    expect(within(table).getByText("Paid by Visa ending 4242 on Nov 18 · Ryan")).toBeInTheDocument()
    expect(within(table).getByRole("link", { name: "View receipt" })).toBeInTheDocument()
    expect(within(table).getByRole("button", { name: /More for the \$145 payment/ })).toBeInTheDocument()
    expect(document.querySelector("[data-slot=billing-figures]")).toBeNull()
    expect(screen.queryByText("Card on file")).toBeNull()
  })

  it("says the unpaid amount once and shows the card on file only while it is unpaid", () => {
    render(<JobPage job={jobPageOf("done-unpaid")} />)
    expect(document.querySelector("[data-slot=billing-figures]")).toBeNull()
    expect(screen.getByText("Card on file")).toBeInTheDocument()
  })

  it("shows a deposit as a payment with no invoice and the final invoice that credits it as one row, with the three figures", () => {
    render(<JobPage job={jobPageOf("paid-deposit")} />)
    const pay = within(document.querySelector("[data-slot=payment-table]") as HTMLElement)
    expect(pay.getByText("$50")).toBeInTheDocument()
    const inv = within(document.querySelector("[data-slot=invoice-table]") as HTMLElement)
    expect(inv.getByText("$145 less the $50 deposit")).toBeInTheDocument()
    expect(inv.getByText("$95")).toBeInTheDocument()
    expect(document.querySelector("[data-slot=billing-figures]")).toHaveTextContent("Total$145Paid$145Unpaid$0")
    expect(screen.queryByText("Card on file")).toBeNull()
  })

  it("puts a refund under its payment: in the invoice's row when the payment settled one, else in Payments", () => {
    render(<JobPage job={jobPageOf("part-refunded")} />)
    const rows = within(document.querySelector("[data-slot=payment-table]") as HTMLElement).getAllByRole("row")
    expect(rows).toHaveLength(3)
    expect(within(rows[1]!).getByText("$145")).toBeInTheDocument()
    expect(within(rows[2]!).getByText("-$50")).toBeInTheDocument()
  })

  it("titles each list one step under the card title with 24px above and 8px below", () => {
    render(<JobPage job={jobPageOf("paid-deposit")} />)
    for (const name of ["Invoices and payments", "Payments"]) {
      const h = screen.getByRole("heading", { name })
      expect(h).toHaveAttribute("data-size", "sub")
      expect(h.className).toMatch(/type-admin-section/)
      expect(h.className).toMatch(/mb-2/)
      expect(h.closest("section")?.className).toMatch(/mt-6/)
    }
  })

  it("shows a refund as its own negative grey row and keeps the payment", () => {
    render(<JobPage job={jobPageOf("refunded")} />)
    expect(screen.getByRole("heading", { level: 1, name: "Sprinkler repair" })).toBeInTheDocument()
    expect(screen.getAllByText("Refunded").length).toBeGreaterThan(0)
    expect(screen.queryByText("Unpaid", { selector: "[data-slot=status-pill]" })).toBeNull()
    const head = document.querySelector("[data-slot=record-page-actions]") as HTMLElement
    expect(within(head).queryByRole("button", { name: "Collect payment" })).toBeNull()
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
    expect(within(dialog).getByText(/Thank you! Pay here: trailheadirrigation.com\/pay\/INV-2026-0001/)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/Add a line/)).toHaveAttribute("maxlength", "140")
  })

  it("draws no toolbar element above the Messages table", () => {
    render(<JobPage job={jobPageOf("scheduled")} />)
    expect(document.querySelector("[aria-labelledby=messages-h] [data-slot=data-grid-toolbar]")).toBeNull()
  })

  it("links the invoice number to its page as the row's one link and keeps the visit-report note", () => {
    render(<JobPage job={jobPageOf("invoice-sent")} />)
    const chip = document.querySelector("[data-slot=invoice-table] a[data-grid-name]") as HTMLElement
    expect(chip).toHaveAttribute("href", "/admin/invoices?invoice=inv-1")
    expect(chip).toHaveTextContent("INV-2026-0001")
    expect(screen.getByText("Includes the visit report")).toBeInTheDocument()
    expect(document.body.textContent).not.toContain("trailheadirrigation.com/pay/INV-2026-0001 ")
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

  it("lets the reminder go by text, email or both, with the subject and the invoice's own pay link, and greys a channel with no address", () => {
    render(<ReminderDialog who={{ first: "Marcus", channel: "text", phone: "(970) 555-0123", email: "" }} invoice={{ number: "INV-2026-0035", amount: "$145", service: "sprinkler repair", dueOn: "Nov 12" }} onClose={() => undefined} onSend={() => undefined} />)
    const email = screen.getByRole("radio", { name: "Email" })
    expect(email).toHaveAttribute("aria-disabled", "true")
    expect(screen.getByRole("radio", { name: "Text" })).toHaveAttribute("aria-checked", "true")
    expect(document.querySelector("[data-channel=text]")).toHaveTextContent("trailheadirrigation.com/pay/INV-2026-0035")
    expect(document.querySelector("[data-channel=email]")).toBeNull()
  })

  it("shows the email's subject over its first lines when Email is chosen", () => {
    render(<ReminderDialog who={{ first: "Marcus", channel: "email", phone: "(970) 555-0123", email: "marcus@example.com" }} invoice={{ number: "INV-2026-0035", amount: "$145", service: "sprinkler repair", dueOn: "Nov 12" }} onClose={() => undefined} onSend={() => undefined} />)
    expect(screen.getByText("Reminder: $145 invoice for your sprinkler repair, due Nov 12")).toBeInTheDocument()
    expect(document.body.textContent).toContain("by email at marcus@example.com")
    fireEvent.click(screen.getByRole("radio", { name: "Both" }))
    expect(document.body.textContent).toContain("by text and email")
    expect(document.querySelector("[data-channel=text]")).not.toBeNull()
    expect(document.querySelector("[data-channel=email]")).not.toBeNull()
    expect(document.body.textContent).not.toContain("1042")
  })

  it("gives a past visit ONE link, the job, with the day and the person as text, and See all to the customer's own page", () => {
    render(<JobPage job={jobPageOf("scheduled")} />)
    const visits = document.querySelectorAll<HTMLElement>("[data-slot=past-visit]")
    expect(visits.length).toBeGreaterThan(0)
    for (const v of visits) expect(v.querySelectorAll("a")).toHaveLength(1)
    expect(visits[0]!.querySelector("a")).toHaveAttribute("href", expect.stringContaining("/admin/jobs?job="))
    expect(visits[0]).toHaveTextContent("Fall blowout · Oct 14, 2026 · Ryan")
    expect(document.querySelectorAll("[data-slot=past-visit] [data-slot=record-chip]")).toHaveLength(0)
    expect(screen.getByRole("link", { name: "See all 7" })).toHaveAttribute("href", "/admin/customers?customer=c-1#jobs-h")
  })

  it("links the customer once, in the one Customer card, and never to the Customers list, Settings or a property anchor", () => {
    render(<JobPage job={jobPageOf("scheduled")} />)
    const hrefs = Array.from(document.querySelectorAll("a[href]")).map((a) => a.getAttribute("href")!)
    expect(hrefs.filter((h) => h === "/admin/customers")).toHaveLength(0)
    expect(hrefs.filter((h) => h.includes("/admin/settings") || h.includes("#property-h"))).toHaveLength(0)
    expect(within(screen.getByRole("region", { name: "Customer" })).getByRole("link", { name: "Customer: Andrea Dalton" })).toHaveAttribute("href", "/admin/customers?customer=c-1")
    // the band: When opens the Schedule on that day, Total scrolls to Billing, Who and Where are plain
    const band = document.querySelector("[data-slot=summary-band]") as HTMLElement
    expect(band.querySelectorAll("a")).toHaveLength(1)
    expect(band.querySelector("a")).toHaveAttribute("href", expect.stringContaining("/admin/schedule?day="))
    for (const label of ["Who", "Where"]) expect(Array.from(band.querySelectorAll("[data-slot=summary-cell]")).find((c) => c.textContent?.startsWith(label))).not.toHaveAttribute("data-link")
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
    it(`renders the Season Pass ${state} titled with its season and two rows`, () => {
      const { container } = render(<JobPagePass data={passPageOf(state)} />)
      expect(screen.getByRole("heading", { level: 1, name: "Season Pass 2027" })).toBeInTheDocument()
      expect(screen.getByText(/^for Andrea Dalton · Sold /)).toBeInTheDocument()
      expect(container.querySelectorAll("[data-slot=trip-row]")).toHaveLength(2)
    })
  }

  it("shows a visit that has only a preference as the preference with no day, and Schedule on the row", () => {
    render(<JobPagePass data={passPageBoughtOf("april")} />)
    const rows = document.querySelectorAll<HTMLElement>("[data-slot=trip-row]")
    expect(within(rows[0]!).getByText(/Thu, Apr 29 · Ryan · 10:30 am/)).toBeInTheDocument()
    expect(within(rows[1]!).getByText("Preference: Early October · No day yet")).toBeInTheDocument()
    expect(within(rows[1]!).getByRole("button", { name: "Schedule" })).toBeInTheDocument()
    expect(rows[1]!.querySelector("[data-slot=trip-body]")).toBeNull()
  })

  it("reads the next visit as the preference when no visit has a day", () => {
    render(<JobPagePass data={passPageBoughtOf("january")} />)
    const band = document.querySelector("[data-slot=summary-band]") as HTMLElement
    expect(within(band).getByText("Preference: Early May")).toBeInTheDocument()
    expect(within(band).getByText("No day yet")).toBeInTheDocument()
  })

  it("opens one trip at a time, the next ahead first, into its checklist, photos, notes and actions", () => {
    render(<JobPagePass data={passPageOf("ahead")} />)
    const rows = document.querySelectorAll<HTMLElement>("[data-slot=trip-row]")
    expect(rows[0]).toHaveAttribute("data-open", "true")
    expect(rows[1]).toHaveAttribute("data-open", "false")
    const body = rows[0]!.querySelector("[data-slot=trip-body]") as HTMLElement
    for (const step of ["Pressure test", "Run every zone", "Set the controller", "Note broken heads"]) expect(within(body).getByText(step)).toBeInTheDocument()
    expect(within(body).getByText("From Andrea")).toBeInTheDocument()
    expect(within(body).getByText("Ours")).toBeInTheDocument()
    expect(within(body).getByText("Notes and history")).toBeInTheDocument()
    expect(within(body).getByRole("button", { name: "Move" })).toBeInTheDocument()
    // who is on the visit is text: a person is never a link
    expect(within(body).getByText("Ryan Garner").closest("a")).toBeNull()
    expect(body.querySelectorAll("[data-slot=record-chip]")).toHaveLength(0)
    fireEvent.click(within(rows[1]!).getByRole("button", { name: /Fall blowout/ }))
    expect(rows[0]).toHaveAttribute("data-open", "false")
    expect(rows[1]).toHaveAttribute("data-open", "true")
    expect(within(rows[1]!).getByText("Drain the backflow")).toBeInTheDocument()
  })

  it("says Charged after this visit before and Paid, card after, with one Payments row per charged trip", () => {
    const { unmount } = render(<JobPagePass data={passPageOf("ahead")} />)
    expect(screen.getAllByText("Charged after this visit").length).toBeGreaterThan(0)
    expect(document.querySelector("[data-slot=payment-table]")).toBeNull()
    unmount()
    render(<JobPagePass data={passPageOf("one-done")} defaultOpen="t1" />)
    expect(document.querySelectorAll("[data-slot=payment-table] tbody tr")).toHaveLength(1)
    expect(screen.getAllByText("Paid, card").length).toBeGreaterThan(0)
  })

  it("asks How is this paid? on a done trip with the card as agreed chosen", () => {
    render(<JobPagePass data={{ ...passPageOf("ahead"), trips: [tripOf(SPRING, "t1", "done"), tripOf(FALL, "t2", "scheduled")] }} />)
    fireEvent.click(screen.getByRole("button", { name: "Collect payment" }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByRole("radio", { name: /Charge the card as agreed/ })).toBeChecked()
  })

  it("keeps the pass's own actions in the header", () => {
    render(<JobPagePass data={passPageOf("ahead")} />)
    const head = document.querySelector("[data-slot=record-page-actions]") as HTMLElement
    expect(within(head).getByRole("button", { name: "Change the pass" })).toBeInTheDocument()
    expect(within(head).getByRole("button", { name: "Add July" })).toBeInTheDocument()
  })

  it("renders a repair with a return trip as two rows", () => {
    const { container } = render(<JobPageReturnTrip data={returnTripOf()} />)
    expect(container.querySelectorAll("[data-slot=trip-row]")).toHaveLength(2)
  })
})

describe("Season Pass flow", () => {
  it("takes trip 1 from Scheduled to Charged, then opens trip 2", async () => {
    render(<PassFlow />)
    const press = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }))
    const confirm = async (name: string | RegExp) => fireEvent.click(await within(await screen.findByRole("dialog")).findByRole("button", { name }))
    press("Move")
    await confirm(/Move and notify the customer/)
    await waitFor(() => expect(document.querySelector("[data-slot=trip-row]")).toHaveTextContent("Today"))
    await screen.findByRole("button", { name: "On my way" })
    press("On my way")
    await confirm("Send and start")
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Mark done" }).length).toBeGreaterThan(0))
    press("Mark done")
    await confirm("Mark done")
    await screen.findAllByText(/How is this paid/i)
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText(/Andrea gets a receipt by text\./)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: /^Charge \$145/ }))
    await waitFor(() => expect(document.querySelector("[data-slot=toast]")).toHaveTextContent("Charged $145"))
    const rows = document.querySelectorAll("[data-slot=trip-row]")
    expect(rows[0]).toHaveTextContent("Paid, card")
    expect(rows[1]).toHaveAttribute("data-open", "true")
  }, 20000)
})

describe("Schedule dialog crew options", () => {
  const dlg = (extra: Partial<React.ComponentProps<typeof ScheduleDialog>> = {}) => render(<ScheduleDialog verb="Schedule" first="Andrea" address="480 Briggs St" service="Sprinkler repair" onClose={() => undefined} onConfirm={() => undefined} {...extra} />)

  it("has no crew-text box when Ryan assigns himself", () => {
    dlg()
    expect(screen.queryByRole("checkbox", { name: /that it's assigned/ })).toBeNull()
    expect(document.querySelector("[data-slot=schedule-sentence]")).toHaveTextContent("Andrea gets a text with the day and time.")
  })

  it("offers the box off by default for a tech, shows the exact text and names both notices once it is on", () => {
    dlg({ initialPeople: ["Tech Two"] })
    const box = screen.getByRole("checkbox", { name: "Text Tech Two that it's assigned" })
    expect(box).not.toBeChecked()
    expect(document.querySelector("[data-slot=crew-text]")).toHaveTextContent("Trailhead: you're on 480 Briggs St, Tue Nov 24, Sprinkler repair.")
    fireEvent.click(box)
    expect(document.querySelector("[data-slot=schedule-sentence]")).toHaveTextContent("Andrea gets a text with the day and time. Tech Two gets a text that it's assigned.")
    fireEvent.change(screen.getByLabelText(/Instructions for the crew/), { target: { value: "Gate code is 4417." } })
    expect(document.querySelector("[data-slot=crew-text]")).toHaveTextContent("Sprinkler repair. Gate code is 4417.")
    expect(screen.getByLabelText(/Instructions for the crew/)).toHaveAttribute("maxlength", "140")
    expect(screen.queryByLabelText("Remind the crew the morning of")).toBeNull()
  })

  it("lets Who take two people and tells the customer about the first", () => {
    dlg()
    fireEvent.click(screen.getByRole("checkbox", { name: "Tech Two" }))
    expect(screen.getByText(/The customer is told Ryan is coming/)).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "Text Tech Two that it's assigned" })).toBeInTheDocument()
  })
})
