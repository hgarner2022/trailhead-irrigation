import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
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
  it("titles the page, counts the season's jobs and what is owed, and offers New job", () => {
    view()
    expect(screen.getByRole("heading", { name: "Jobs", level: 1 })).toBeInTheDocument()
    expect(document.querySelector('[data-slot="page-context"]')).toHaveTextContent(/^\d+ jobs this season\. 1 owed\. 1 needs a quote\.$/)
    expect(screen.getByRole("button", { name: "New job" })).toBeInTheDocument()
  })

  it("has the columns in order and a row for each job, the bills that are out first", () => {
    view()
    const headers = within(document.querySelector('[data-slot="data-grid-table"]') as HTMLElement).getAllByRole("columnheader").map((h) => h.textContent)
    expect(headers).toEqual(["Customer", "Job", "Property", "Sold", "Status", "Visits", "Total", "Money", "Next"])
    const first = within(gridRows()[0]!).getAllByRole("cell").map((c) => c.textContent)
    expect(first[0]).toBe("Kim Lowe")
    expect(first).toContain("$145 · Overdue since Nov 3")
    expect(within(gridRows()[1]!).getAllByRole("cell")[0]).toHaveTextContent("Ben Cole")
    expect(within(gridRows()[1]!).getByText("$145 · Bill sent, due Nov 24")).toBeInTheDocument()
  })

  it("says each stage in the five words and Money in the words of the payment rows", () => {
    view()
    const all = document.body.textContent ?? ""
    for (const word of ["Needs a quote", "Open", "Done", "Cancelled", "$145 owed", "Quote later"]) expect(all).toContain(word)
    for (const word of ["Charged", "Unpaid", "request"]) expect(all.toLowerCase()).not.toContain(word.toLowerCase())
  })

  it("has the Status, Money, Job and Season filters", () => {
    view()
    const chips = [...document.querySelectorAll('[data-slot="data-grid-chip"]')].map((c) => c.textContent?.trim())
    expect(chips).toEqual(["Status", "Money", "Job", "Season"])
    expect(screen.getByRole("searchbox")).toHaveAttribute("placeholder", "Search by name, street or pass number")
    expect(screen.getByRole("button", { name: /Export/ })).toBeInTheDocument()
  })

  it("the bills out chip applies the Money filter and shows the jobs with an open bill, oldest due day first", async () => {
    view()
    const chip = screen.getByRole("button", { name: "2 bills out" })
    expect(chip).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(chip)
    expect(screen.getByRole("button", { name: "2 bills out" })).toHaveAttribute("aria-pressed", "true")
    const names = gridRows().map((r) => within(r).getAllByRole("cell")[0]!.textContent)
    expect(names).toEqual(["Kim Lowe", "Ben Cole"])
    await userEvent.click(screen.getByRole("button", { name: "2 bills out" }))
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
    expect(p.getAllByText("Bill sent").length).toBeGreaterThan(0)
    expect(p.getByText("Sent Nov 10, due Nov 24")).toBeInTheDocument()
    expect(p.getByRole("button", { name: "Remind" })).toBeInTheDocument()
    expect(p.getByRole("link", { name: "Pay link" })).toBeInTheDocument()
    expect(p.getByRole("link", { name: "Open customer" })).toHaveAttribute("href", "/admin/customers?customer=c-ben")
  })

  it("offers Send a bill and Record the payment on a done job that is owed, and Record sends the amount owed", async () => {
    const actions = jobActions()
    view({ defaultJobId: "job-d", actions, visitActions: visitActions() as VisitActions })
    const p = panel()
    expect(p.getByRole("button", { name: "Send a bill" })).toBeInTheDocument()
    await userEvent.click(p.getByRole("button", { name: "Record the payment" }))
    const dialog = within(screen.getAllByRole("dialog").at(-1)!)
    await userEvent.type(dialog.getByLabelText("Check number"), "1042")
    await userEvent.click(dialog.getByRole("button", { name: "Record payment" }))
    expect(actions.recordPayment).toHaveBeenCalledWith("job-d", { method: "check", amount: 145, reference: "1042" })
  })

  it("lists payments newest first with how they came and the reference, and Paid when nothing is owed", async () => {
    view({ defaultJobId: "job-e" })
    const p = panel()
    expect(p.getByText("Check 1038")).toBeInTheDocument()
    expect(p.getByText("$145 · Paid")).toBeInTheDocument()
    expect(p.queryByRole("button", { name: "Record the payment" })).toBeNull()
    expect(p.queryByRole("button", { name: "Send a bill" })).toBeNull()
  })

  it("lists every visit with its day, who has it and its pills, opening that visit", async () => {
    view({ defaultJobId: "job-a" })
    const row = panel().getByRole("button", { name: /Repair.*Thu, Nov 19/ })
    expect(row).toHaveTextContent("Thu, Nov 19, Ryan Garner")
    expect(row).toHaveTextContent("Scheduled")
    await userEvent.click(row)
    // the visit panel opens over the job panel: its own Customer section is there
    expect(await screen.findByRole("heading", { name: "Customer" })).toBeInTheDocument()
  })

  it("strikes a cancelled line through and adds up only the live ones; an unpriced line says Quote later", () => {
    view({ defaultJobId: "job-install", actions: jobActions() })
    const lines = panel().getByRole("heading", { name: "Lines" }).closest("section")!
    expect(within(lines).getByText("Drip zone").closest("div")).toHaveClass("line-through")
    expect(within(lines).getByText("cancelled")).toBeInTheDocument()
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
    for (const name of ["Send a bill", "Record the payment", "New visit", "Add a line", "Remind"]) expect(p.queryByRole("button", { name })).toBeNull()
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
})
