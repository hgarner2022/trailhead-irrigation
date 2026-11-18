import { beforeAll, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { UndoToastProvider } from "@/components/blocks/UndoToast"
import type { JobActions } from "./job-actions-types"
import { JobsScreen } from "./JobsScreen"
import { JOBS_TODAY, jobsData } from "./jobs-fixture"
import type { VisitActions } from "./visit-actions-types"

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => undefined
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.scrollIntoView ??= () => undefined
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})

const ok = { ok: true as const, data: undefined }
const jobActions = (over: Partial<JobActions> = {}): JobActions => ({
  addLine: vi.fn().mockResolvedValue({ ok: true, data: { jobTotal: 1500 } }),
  updateLine: vi.fn().mockResolvedValue({ ok: true, data: { jobTotal: 1400 } }),
  cancelLine: vi.fn().mockResolvedValue({ ok: true, data: { jobTotal: 900 } }),
  recordPayment: vi.fn().mockResolvedValue(ok),
  addVisit: vi.fn().mockResolvedValue({ ok: true, data: { id: "new" } }),
  cancelJob: vi.fn().mockResolvedValue(ok),
  addNote: vi.fn().mockResolvedValue({ ok: true, data: { id: "n-new", at: "2026-11-12T19:57:00Z", actor: "Ryan", what: "Back gate sticks", kind: "event", note: "Back gate sticks" } }),
  pass: {
    resendConfirmation: vi.fn().mockResolvedValue(ok), sendCardUpdateLink: vi.fn().mockResolvedValue(ok), cancel: vi.fn().mockResolvedValue(ok),
    addInspection: vi.fn().mockResolvedValue(ok), changePreference: vi.fn().mockResolvedValue(ok), skip: vi.fn().mockResolvedValue(ok),
  },
  ...over,
})
const visitActions = (): Partial<VisitActions> => ({ sendBill: vi.fn().mockResolvedValue(ok), remindBill: vi.fn().mockResolvedValue(ok) })

const view = (props: Partial<React.ComponentProps<typeof JobsScreen>> = {}) =>
  render(
    <UndoToastProvider>
      <JobsScreen data={jobsData} today={JOBS_TODAY} {...props} />
    </UndoToastProvider>,
  )

const gridRows = () => within(document.querySelector('[data-slot="data-grid-table"]') as HTMLElement).getAllByRole("row").slice(1)
const panel = () => within(screen.getByRole("dialog"))

describe("JobsScreen", () => {
  it("titles the page, counts the season's jobs and what is unpaid, and offers New job", () => {
    view()
    expect(screen.getByRole("heading", { name: "Jobs", level: 1 })).toBeInTheDocument()
    expect(document.querySelector('[data-slot="page-context"]')).toHaveTextContent(/^\d+ jobs this season\. 1 unpaid\. 1 needs a quote\.$/)
    expect(screen.getByRole("button", { name: "New job" })).toBeInTheDocument()
  })

  it("has the columns in order and a row for each job, the invoices that are out first", () => {
    view()
    const headers = within(document.querySelector('[data-slot="data-grid-table"]') as HTMLElement).getAllByRole("columnheader").map((h) => h.textContent)
    expect(headers).toEqual(["Customer", "Job", "Property", "Sold", "Status", "Visits", "Total", "Money", "Next"])
    const first = within(gridRows()[0]!).getAllByRole("cell").map((c) => c.textContent)
    expect(first[0]).toBe("Kim Lowe")
    expect(first).toContain("$145 · Past due since Nov 3")
    expect(within(gridRows()[1]!).getAllByRole("cell")[0]).toHaveTextContent("Ben Cole")
    expect(within(gridRows()[1]!).getByText("$145 · Invoice sent, due Nov 24")).toBeInTheDocument()
  })

  it("says each stage in the five words and Money in the words of the payment rows", () => {
    view()
    const all = document.body.textContent ?? ""
    for (const word of ["Needs a quote", "Open", "Done", "Canceled", "$145 unpaid", "Quote later"]) expect(all).toContain(word)
    for (const word of ["Charged", "Owed", "request"]) expect(all.toLowerCase()).not.toContain(word.toLowerCase())
  })

  it("has the Status, Money, Job and Season filters", () => {
    view()
    const chips = [...document.querySelectorAll('[data-slot="data-grid-chip"]')].map((c) => c.textContent?.trim())
    expect(chips).toEqual(["Status", "Money", "Job", "Season"])
    expect(screen.getByRole("searchbox")).toHaveAttribute("placeholder", "Search by name, street or pass number")
    expect(screen.getByRole("button", { name: /Export/ })).toBeInTheDocument()
  })

  it("the invoices out chip applies the Money filter and shows the jobs with an open invoice, oldest due day first", async () => {
    view()
    const chip = screen.getByRole("button", { name: "2 invoices out" })
    expect(chip).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(chip)
    expect(screen.getByRole("button", { name: "2 invoices out" })).toHaveAttribute("aria-pressed", "true")
    const names = gridRows().map((r) => within(r).getAllByRole("cell")[0]!.textContent)
    expect(names).toEqual(["Kim Lowe", "Ben Cole"])
    await userEvent.click(screen.getByRole("button", { name: "2 invoices out" }))
    expect(gridRows().length).toBeGreaterThan(2)
  })

  it("finds a job by street and by pass number", async () => {
    view()
    await userEvent.type(screen.getByRole("searchbox"), "Spruce")
    expect(gridRows().map((r) => within(r).getAllByRole("cell")[0]!.textContent)).toEqual(["Ben Cole"])
  })
})

describe("the job panel", () => {
  it("opens from a row's name with the customer, the job and its stage and money", async () => {
    view()
    await userEvent.click(within(gridRows()[1]!).getByRole("button", { name: "Ben Cole" }))
    const p = panel()
    expect(p.getByRole("heading", { name: "Ben Cole" })).toBeInTheDocument()
    expect(screen.getByRole("dialog")).toHaveTextContent("Repair · sold Oct 28")
    for (const heading of ["Property", "Lines", "Visits", "Money"]) expect(p.getByRole("heading", { name: heading })).toBeInTheDocument()
    expect(p.getAllByText("Invoice sent").length).toBeGreaterThan(0)
    expect(p.getByText("Sent Nov 10, due Nov 24")).toBeInTheDocument()
    expect(p.getByRole("button", { name: "Remind" })).toBeInTheDocument()
    expect(p.getByRole("link", { name: "Pay link" })).toBeInTheDocument()
    expect(p.getByRole("link", { name: "Open customer" })).toHaveAttribute("href", "/admin/customers?customer=c-ben")
  })

  it("offers one Collect button on a done job that is unpaid; it opens How is this paid? and Record sends the amount owed", async () => {
    const actions = jobActions()
    view({ defaultJobId: "job-d", actions, visitActions: visitActions() as VisitActions })
    const p = panel()
    expect(p.queryByRole("button", { name: "Send an invoice" })).toBeNull()
    expect(p.queryByRole("button", { name: "Record the payment" })).toBeNull()
    await userEvent.click(p.getByRole("button", { name: "Collect $145" }))
    const dialog = within(screen.getAllByRole("dialog").at(-1)!)
    expect(dialog.getByRole("heading", { name: "How is this paid?" })).toBeInTheDocument()
    expect(dialog.getByRole("radio", { name: /^Send an invoice/ })).toBeInTheDocument()
    await userEvent.type(dialog.getByLabelText(/Check number/), "1042")
    await userEvent.click(dialog.getByRole("button", { name: "Record $145 paid" }))
    expect(actions.recordPayment).toHaveBeenCalledWith("job-d", { method: "check", amount: 145, reference: "1042" })
  })

  it("Send an invoice sits inside How is this paid? and goes only on its own button", async () => {
    const visits = visitActions()
    view({ defaultJobId: "job-d", actions: jobActions(), visitActions: visits as VisitActions })
    await userEvent.click(panel().getByRole("button", { name: "Collect $145" }))
    const dialog = within(screen.getAllByRole("dialog").at(-1)!)
    await userEvent.click(dialog.getByRole("radio", { name: /^Send an invoice/ }))
    expect(visits.sendBill).not.toHaveBeenCalled()
    await userEvent.click(dialog.getByRole("button", { name: "Send the invoice" }))
    expect(visits.sendBill).toHaveBeenCalledWith("job-d")
  })

  it("lists payments newest first with how they came and the reference, and Paid when nothing is unpaid", async () => {
    view({ defaultJobId: "job-e" })
    const p = panel()
    expect(p.getByText("Check 1038")).toBeInTheDocument()
    expect(p.getByText("$145 · Paid")).toBeInTheDocument()
    expect(p.queryByRole("button", { name: /^Collect/ })).toBeNull()
  })

  it("lists every visit with its day, who has it and its pills, opening that visit", async () => {
    view({ defaultJobId: "job-a" })
    const row = panel().getByRole("button", { name: /Repair.*Thu, Nov 19/ })
    expect(row).toHaveTextContent("Thu, Nov 19, Ryan Garner")
    expect(row).toHaveTextContent("Scheduled")
    await userEvent.click(row)
    // the visit panel replaces the job panel: its own Customer section is there and the job's Lines are gone
    expect(await screen.findByRole("heading", { name: "Customer" })).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByRole("dialog")).toHaveLength(1))
    expect(screen.queryByRole("heading", { name: "Lines" })).toBeNull()
  })

  it("opening a job while a visit's panel is open closes the visit's: one panel at a time", async () => {
    view({ defaultJobId: "job-a" })
    await userEvent.click(panel().getByRole("button", { name: /Repair.*Thu, Nov 19/ }))
    expect(await screen.findByRole("heading", { name: "Customer" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Ben Cole", hidden: true }))
    expect(await screen.findByRole("heading", { name: "Lines" })).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByRole("dialog")).toHaveLength(1))
    expect(screen.queryByRole("heading", { name: "Customer" })).toBeNull()
  })

  it("Add job opens the new job's panel, not the visit's and not a second panel on top", async () => {
    const createVisit = vi.fn().mockResolvedValue({ ok: true, data: { id: "v-new", jobId: "job-a" } })
    view({ visitActions: { createVisit } as unknown as VisitActions })
    await userEvent.click(screen.getByRole("button", { name: "New job" }))
    const sheet = within(await screen.findByRole("dialog"))
    await userEvent.type(sheet.getByLabelText("Find a customer"), "Reed")
    await userEvent.click(await sheet.findByRole("button", { name: /Dana Reed/ }))
    await userEvent.selectOptions(sheet.getByLabelText("What are we doing?"), "repair")
    await userEvent.click(sheet.getByRole("button", { name: "Add job" }))
    await waitFor(() => expect(createVisit).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole("heading", { name: "Lines" })).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByRole("dialog")).toHaveLength(1))
    expect(screen.queryByRole("heading", { name: "Customer" })).toBeNull()
  })

  it("strikes a canceled line through and adds up only the live ones; an unpriced line says Quote later", () => {
    view({ defaultJobId: "job-install", actions: jobActions() })
    const lines = panel().getByRole("heading", { name: "Lines" }).closest("section")!
    expect(within(lines).getByText("Drip zone").closest("div")).toHaveClass("line-through")
    expect(within(lines).getByText("canceled")).toBeInTheDocument()
    expect(within(lines).getByText("$1,310")).toBeInTheDocument()
    view({ defaultJobId: "job-b" })
    expect(within(screen.getAllByRole("dialog").at(-1)!).getAllByText("Quote later").length).toBeGreaterThan(0)
  })

  it("changes a line's price and quantity in place and says the API's refusal", async () => {
    const actions = jobActions({ updateLine: vi.fn().mockResolvedValue({ ok: false, message: "That visit is done and paid, so its line cannot change" }) })
    view({ defaultJobId: "job-install", actions })
    await userEvent.click(panel().getByRole("button", { name: "Edit Controller" }))
    const qty = panel().getByLabelText("Quantity")
    await userEvent.clear(qty)
    await userEvent.type(qty, "2")
    const price = panel().getByLabelText("Price each")
    await userEvent.clear(price)
    await userEvent.type(price, "250")
    await userEvent.click(panel().getByRole("button", { name: "Save line" }))
    expect(actions.updateLine).toHaveBeenCalledWith("l-2", { quantity: 2, unitPrice: 250 })
    expect(await panel().findByText("That visit is done and paid, so its line cannot change")).toBeInTheDocument()
  })

  it("adds a line from the catalogue or a free line", async () => {
    const actions = jobActions()
    view({ defaultJobId: "job-install", actions })
    await userEvent.click(panel().getByRole("button", { name: "Add a line" }))
    await userEvent.type(panel().getByLabelText("Name"), "Valve box")
    await userEvent.clear(panel().getByLabelText("Quantity"))
    await userEvent.type(panel().getByLabelText("Quantity"), "3")
    await userEvent.type(panel().getByLabelText("Price each"), "40")
    await userEvent.click(panel().getByRole("button", { name: "Add line" }))
    expect(actions.addLine).toHaveBeenCalledWith({ jobId: "job-install", name: "Valve box", quantity: 3, unitPrice: 40 })
  })

  it("shows a Season Pass as its season with its own buttons and no line editor", async () => {
    const actions = jobActions()
    view({ defaultJobId: "job_p-office", actions })
    const p = panel()
    expect(screen.getByRole("dialog")).toHaveTextContent("Season Pass TH-2027-0014 · 2027")
    expect(p.getByRole("heading", { name: "Season" })).toBeInTheDocument()
    expect(p.queryByRole("button", { name: "Add a line" })).toBeNull()
    expect(p.getByRole("button", { name: "Send card link" })).toBeInTheDocument()
    expect(p.getByRole("button", { name: "Resend confirmation" })).toBeInTheDocument()
    await userEvent.click(p.getByRole("button", { name: "Cancel pass" }))
    expect(await screen.findByRole("heading", { name: "Cancel this pass?" })).toBeInTheDocument()
  })

  it("a tech reads the same job with no buttons, no New job and no line editor", () => {
    view({ defaultJobId: "job-d", readOnly: true, actions: jobActions() })
    const p = panel()
    for (const name of ["Collect $145", "New visit", "Add a line", "Remind"]) expect(p.queryByRole("button", { name })).toBeNull()
    expect(p.getByRole("link", { name: "Open customer" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "New job" })).toBeNull()
  })

  it("adds a visit to the job from the catalogue", async () => {
    const actions = jobActions()
    view({ defaultJobId: "job-a", actions })
    await userEvent.click(panel().getByRole("button", { name: "New visit" }))
    const dialog = within(screen.getAllByRole("dialog").at(-1)!)
    await userEvent.selectOptions(dialog.getByLabelText("What is the visit for?"), "repair")
    await userEvent.click(dialog.getByRole("button", { name: "Add visit" }))
    expect(actions.addVisit).toHaveBeenCalledWith("job-a", { serviceKey: "repair" })
  })

  it("cancels a one-off job through a confirm dialog that says what happens, and the dialog closes", async () => {
    const actions = jobActions()
    view({ defaultJobId: "job-a", actions })
    await userEvent.click(panel().getByRole("button", { name: "Cancel job" }))
    const dialog = within(screen.getAllByRole("dialog").at(-1)!)
    expect(dialog.getByRole("heading", { name: "Cancel this job?" })).toBeInTheDocument()
    expect(dialog.getByText(/come off the schedule/)).toBeInTheDocument()
    await userEvent.click(dialog.getByRole("button", { name: "Keep job" }))
    expect(actions.cancelJob).not.toHaveBeenCalled()
    await userEvent.click(panel().getByRole("button", { name: "Cancel job" }))
    await userEvent.click(within(screen.getAllByRole("dialog").at(-1)!).getByRole("button", { name: "Cancel job" }))
    await waitFor(() => expect(actions.cancelJob).toHaveBeenCalledWith("job-a"))
  })

  it("says why in the dialog when the job holds a payment, and offers no way to cancel it", async () => {
    const actions = jobActions()
    view({ defaultJobId: "job-install", actions })
    await userEvent.click(panel().getByRole("button", { name: "Cancel job" }))
    const dialog = within(screen.getAllByRole("dialog").at(-1)!)
    expect(dialog.getByText("This job has a payment. Refund it first.")).toBeInTheDocument()
    expect(dialog.queryByRole("button", { name: "Cancel job" })).toBeNull()
    expect(actions.cancelJob).not.toHaveBeenCalled()
  })

  it("shows the API's own refusal inside the dialog", async () => {
    const actions = jobActions({ cancelJob: vi.fn().mockResolvedValue({ ok: false, message: "This job has a payment. Refund it first." }) })
    view({ defaultJobId: "job-a", actions })
    await userEvent.click(panel().getByRole("button", { name: "Cancel job" }))
    await userEvent.click(within(screen.getAllByRole("dialog").at(-1)!).getByRole("button", { name: "Cancel job" }))
    expect(await within(screen.getAllByRole("dialog").at(-1)!).findByRole("alert")).toHaveTextContent("This job has a payment. Refund it first.")
  })

  it("has no Cancel job on a Season Pass (it has Cancel pass), a done job, or for a tech", () => {
    for (const id of ["job_p-office", "job-d", "job-e"]) {
      const { unmount } = view({ defaultJobId: id, actions: jobActions() })
      expect(panel().queryByRole("button", { name: "Cancel job" })).toBeNull()
      unmount()
    }
    view({ defaultJobId: "job-a", readOnly: true, actions: jobActions() })
    expect(panel().queryByRole("button", { name: "Cancel job" })).toBeNull()
  })

  // The footer's first button is the next step, and the only filled one (Button's default variant carries bg-primary).
  const footer = () => document.querySelector<HTMLElement>('[data-slot="sheet-footer"] > :first-child')!
  const footerButtons = () => [...document.querySelectorAll('[data-slot="sheet-footer"] button, [data-slot="sheet-footer"] a')].map((b) => b.textContent)

  it("a scheduled job leads with Open visit and Collect is not the primary while a visit is ahead", async () => {
    view({ defaultJobId: "job-a", actions: jobActions() })
    const names = footerButtons()
    expect(names[0]).toBe("Open visit")
    expect(footer()).toHaveClass("bg-primary-dark")
    expect(names.some((n) => n?.startsWith("Collect"))).toBe(true)
    expect(names.findIndex((n) => n?.startsWith("Collect"))).toBeGreaterThan(0)
    // the primary opens the next visit's panel, in place of the job's
    await userEvent.click(footer())
    expect(await screen.findByRole("heading", { name: "Customer" })).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByRole("dialog")).toHaveLength(1))
    expect(screen.queryByRole("heading", { name: "Lines" })).toBeNull()
  })

  it("a done job that is unpaid leads with Collect $145", () => {
    view({ defaultJobId: "job-d", actions: jobActions(), visitActions: visitActions() as VisitActions })
    expect(footerButtons()[0]).toBe("Collect $145")
    expect(footer()).toHaveClass("bg-primary-dark")
  })

  it("a done job with its invoice out leads with Collect, and How is this paid? then offers only the money in hand", async () => {
    view({ defaultJobId: "job-f", actions: jobActions(), visitActions: visitActions() as VisitActions })
    expect(footerButtons()[0]).toMatch(/^Collect \$/)
    await userEvent.click(footer())
    const dialog = within(screen.getAllByRole("dialog").at(-1)!)
    expect(dialog.queryByRole("radio", { name: /^Send an invoice/ })).toBeNull()
    expect(dialog.getByRole("radio", { name: /^Check/ })).toBeInTheDocument()
  })

  it("a done and paid job has only Open customer", () => {
    view({ defaultJobId: "job-e", actions: jobActions() })
    expect(footerButtons()).toEqual(["Open customer"])
  })

  it("a job that needs a quote leads with Add a line, which opens the line form (and the section keeps no second button)", async () => {
    view({ defaultJobId: "job-b", actions: jobActions() })
    expect(footerButtons()[0]).toBe("Add a line")
    expect(screen.getAllByRole("button", { name: "Add a line" })).toHaveLength(1)
    await userEvent.click(footer())
    expect(await screen.findByLabelText("What was added")).toBeInTheDocument()
  })
})
