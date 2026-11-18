import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, Visit } from "@/lib/admin/types"
import { UndoToastProvider } from "@/components/blocks/UndoToast"
import type { VisitActions } from "./visit-actions-types"
import { VisitsScreen } from "./VisitsScreen"
import { moneyText, visitRows, visitsContext } from "./visits-model"
import { VISITS_TODAY, noCardVisitId, passVisitId, visitsData } from "./visits-fixture"

const base = snapshot as AdminData
const TODAY = "2026-11-12T19:56:30Z"

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => undefined
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.scrollIntoView ??= () => undefined
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})

const visit = (over: Partial<Visit>): Visit => ({
  id: "x", clientId: "cx", clientName: "Dana Reed", town: "Erie", kind: "repair", status: "scheduled", isPass: false, jobberUrl: "", jobId: "jx",
  scheduledOn: "2026-11-20", startAt: "2026-11-20T15:00:00Z", price: 145, minutes: 120, personId: "person_truck-1", personName: "Ryan Garner", ...over,
})

const mine: Visit[] = [
  visit({ id: "a", clientName: "Dana Reed" }),
  visit({ id: "b", clientName: "Sam Ortiz", clientId: "cs", kind: "install", status: "unscheduled", scheduledOn: undefined, startAt: undefined, personId: undefined, personName: undefined, price: 0 }),
  visit({ id: "c", clientName: "Lee Park", clientId: "cl", status: "completed", completedOn: "2026-11-10", scheduledOn: "2026-11-10", startAt: "2026-11-10T15:00:00Z", payments: [{ id: "pay-c", visitId: "c", amount: 145, method: "check", status: "succeeded", paidOn: "2026-11-10" }] }),
]
const data: AdminData = {
  ...base,
  visits: mine,
  attention: [],
  clients: [
    { id: "cx", firstName: "Dana", lastName: "Reed", town: "Erie", address: "12 Elm St", phone: "+13035550111", jobberUrl: "", hasPass: false, app: true },
    { id: "cs", firstName: "Sam", lastName: "Ortiz", town: "Louisville", address: "9 Oak St", phone: "+13035550122", jobberUrl: "", hasPass: false, app: true },
    { id: "cl", firstName: "Lee", lastName: "Park", town: "Erie", address: "4 Pine Ct", jobberUrl: "", hasPass: false, app: true },
  ],
}

// Dana's repair was sold at $160 although the visit row still says 145: the line is the truth. A second, cancelled line shows struck through.
const TURN_ON_TEXT = "Check every zone, program the controller, adjust heads and report anything that needs a repair."
const withLines: AdminData = {
  ...data,
  jobs: [
    {
      id: "jx", customerId: "cx", kind: "repair", status: "open", source: "office", visitIds: ["a", "c"], total: 160,
      lines: [
        { id: "l1", name: "Spring turn-on, 8 zones", description: TURN_ON_TEXT, quantity: 1, unitPrice: 160, taxable: false, visitId: "a" },
        { id: "l2", name: "Extra head", quantity: 2, unitPrice: 20, taxable: false, cancelledAt: "2026-11-11T10:00:00Z" },
      ],
    },
  ],
}

const ok = { ok: true as const, data: undefined }
const actions = (over: Partial<VisitActions> = {}): VisitActions => ({
  move: vi.fn().mockResolvedValue({ ok: true, data: { day: "2026-11-20", personId: "person_truck-1", startTime: null } }),
  putBack: vi.fn().mockResolvedValue(ok),
  markDone: vi.fn().mockResolvedValue(ok),
  undoDone: vi.fn().mockResolvedValue(ok),
  recordPayment: vi.fn().mockResolvedValue(ok),
  sendBill: vi.fn().mockResolvedValue(ok),
  remindBill: vi.fn().mockResolvedValue(ok),
  markNotDone: vi.fn().mockResolvedValue({ ok: true, data: { day: "2026-11-20", personId: "person_truck-1", startTime: null } }),
  edit: vi.fn().mockResolvedValue(ok),
  addNote: vi.fn().mockResolvedValue({ ok: true, data: { id: "n1", at: "2026-11-12T19:00:00Z", actor: "Ryan", what: "Gate sticks", kind: "event", note: "Gate sticks" } }),
  cancel: vi.fn().mockResolvedValue(ok),
  sendText: vi.fn().mockResolvedValue(ok),
  resendConfirmation: vi.fn().mockResolvedValue(ok),
  sendCardUpdateLink: vi.fn().mockResolvedValue(ok),
  createVisit: vi.fn().mockResolvedValue({ ok: true, data: { id: "new", jobId: "jnew" } }),
  sellPass: vi.fn().mockResolvedValue({ ok: true, data: { id: "p-new", number: "TH-2027-0014", firstName: "Maya" } }),
  updateProperty: vi.fn().mockResolvedValue(ok),
  ...over,
})

const renderScreen = (a: VisitActions | undefined, props: { readOnly?: boolean; defaultVisitId?: string; data?: AdminData } = {}) =>
  render(
    <UndoToastProvider>
      <VisitsScreen data={props.data ?? data} today={TODAY} actions={a} {...props} />
    </UndoToastProvider>,
  )

describe("visits-model", () => {
  it("lists the visits with the two pills, needs-a-day first, and finds one by street or phone", () => {
    const rows = visitRows(data, TODAY)
    expect(rows.map((r) => r.id)).toEqual(["b", "c", "a"])
    expect(rows[1]).toMatchObject({ work: "done", money: "paid", moneyLabel: "Paid, check" })
    expect(rows.find((r) => r.id === "a")!.search).toContain("12 Elm St")
    expect(rows.find((r) => r.id === "a")!.search).toContain("3035550111")
  })

  it("words the money pill only once a visit is done, and the header in two short sentences", () => {
    const rows = visitRows({ ...data, visits: [...mine, visit({ id: "d", clientName: "Ana Ruiz", clientId: "cl", status: "completed", completedOn: "2026-11-10", scheduledOn: "2026-11-10", startAt: "2026-11-10T15:00:00Z" })] }, TODAY)
    expect(rows.find((r) => r.id === "a")!.moneyLabel).toBe("")
    expect(rows.find((r) => r.id === "b")!.workLabel).toBe("Unscheduled")
    expect(rows.find((r) => r.id === "d")!.moneyLabel).toBe("Unpaid")
    expect(visitsContext(rows)).toBe("4 visits this season. 1 unscheduled. 1 done and unpaid.")
    expect(visitsContext(visitRows({ ...data, visits: [mine[0]!] }, TODAY))).toBe("1 visit this season.")
  })
})

describe("moneyText", () => {
  const row = (over: Partial<Parameters<typeof moneyText>[0]>) => ({ work: "scheduled" as const, money: "not-yet" as const, moneyLabel: "", price: 95, ...over })
  it("is the price until the visit is Done", () => {
    expect(moneyText(row({}))).toBe("$95")
    expect(moneyText(row({ price: 1450 }))).toBe("$1,450")
  })
  it("says what happened to the money after Done", () => {
    expect(moneyText(row({ work: "done", money: "paid", moneyLabel: "Paid, Venmo" }))).toBe("$95 · Paid, Venmo")
    expect(moneyText(row({ work: "done", money: "paid", moneyLabel: "Paid, card" }))).toBe("$95 · Paid, card")
    expect(moneyText(row({ work: "done", money: "owed", moneyLabel: "Unpaid" }))).toBe("$95 unpaid")
    expect(moneyText(row({ work: "done", money: "bill-sent", moneyLabel: "Invoice sent" }))).toBe("$95 · Invoice sent")
    expect(moneyText(row({ work: "done", money: "failed", moneyLabel: "Failed" }))).toBe("$95 · Failed")
  })
  it("reads Canceled for a canceled visit with nothing held and Quote later for an unpriced one", () => {
    expect(moneyText(row({ work: "cancelled" }))).toBe("Canceled")
    expect(moneyText(row({ price: 0 }))).toBe("Quote later")
  })
})

describe("visits read the job's lines", () => {
  it("prices a row from its line, and from the visit when the job has none", () => {
    expect(visitRows(withLines, TODAY).find((r) => r.id === "a")).toMatchObject({ price: 160, moneyText: "$160" })
    expect(visitRows(data, TODAY).find((r) => r.id === "a")).toMatchObject({ price: 145, moneyText: "$145" })
  })
})

describe("VisitsScreen", () => {
  it("shows the line's price in the Money column", () => {
    renderScreen(actions(), { data: withLines })
    expect(screen.getAllByRole("cell").some((c) => c.textContent === "$160")).toBe(true)
    expect(screen.getAllByRole("cell").some((c) => c.textContent === "$145 · Paid, check")).toBe(true)
    expect(screen.getAllByRole("cell").some((c) => c.textContent === "Quote later")).toBe(true)
  })

  it("lists the job's lines in the panel, strikes the canceled one, and shows what's included", () => {
    renderScreen(actions(), { data: withLines, defaultVisitId: "a" })
    const panel = within(screen.getByRole("dialog"))
    const lines = within(panel.getByRole("list", { name: "What was sold" })).getAllByRole("listitem")
    expect(lines.map((l) => l.textContent)).toEqual(["Spring turn-on, 8 zones · $160", "Extra head · canceled"])
    expect(lines[1]).toHaveClass("line-through")
    expect(panel.getByRole("heading", { name: "What's included" })).toBeInTheDocument()
    expect(panel.getByText(TURN_ON_TEXT)).toBeInTheDocument()
  })

  it("has no What's included block when the visit's line has no description", () => {
    renderScreen(actions(), { data, defaultVisitId: "a" })
    expect(screen.queryByRole("heading", { name: "What's included" })).toBeNull()
  })

  it("shows the spec's columns and a row per visit, with New job in the header and no Passes button", () => {
    renderScreen(actions())
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent)
    expect(headers.filter(Boolean)).toEqual(["Customer", "Town", "Service", "Day", "Time", "Who", "Status", "Money"])
    expect(headers).not.toContain("Truck")
    expect(screen.getByRole("button", { name: "Dana Reed" })).toBeInTheDocument()
    expect(screen.getAllByRole("cell").some((c) => c.textContent === "Ryan Garner")).toBe(true)
    expect(screen.getByText(/Paid, check/)).toBeInTheDocument()
    expect(screen.queryByText("Not yet")).toBeNull()
    expect(screen.queryByText("None")).toBeNull()
    expect(screen.getAllByText("Unscheduled").length).toBeGreaterThan(0)
    expect(screen.getByRole("button", { name: "New job" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Passes" })).toBeNull()
  })

  it("searches by street and by phone", async () => {
    renderScreen(actions())
    const search = screen.getByRole("searchbox")
    await userEvent.type(search, "Oak St")
    expect(screen.queryByRole("button", { name: "Dana Reed" })).toBeNull()
    expect(screen.getByRole("button", { name: "Sam Ortiz" })).toBeInTheDocument()
  })

  it("Move picks a day and a time, acts at once, and offers Undo that puts it back", async () => {
    const a = actions()
    renderScreen(a, { defaultVisitId: "a" })
    const panel = within(screen.getByRole("dialog"))
    expect(panel.getByText("Moves the repair to Fri, Nov 20 and tells Dana.")).toBeInTheDocument()
    await userEvent.clear(panel.getByLabelText("Day"))
    await userEvent.type(panel.getByLabelText("Day"), "2026-11-24")
    await userEvent.selectOptions(panel.getByLabelText("Time"), "09:00")
    await userEvent.click(panel.getByRole("button", { name: "Move" }))
    expect(a.move).toHaveBeenCalledWith("a", "2026-11-24", "09:00")
    await userEvent.click(await screen.findByRole("button", { name: "Undo" }))
    expect(a.putBack).toHaveBeenCalledWith("a", { day: "2026-11-20", personId: "person_truck-1", startTime: null })
  })

  it("shows the API's refusal next to the Move", async () => {
    const a = actions({ move: vi.fn().mockResolvedValue({ ok: false, message: "Truck 1 is full of repair visits on 2026-11-24" }) })
    renderScreen(a, { defaultVisitId: "a" })
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Move" }))
    expect(await screen.findByText("Truck 1 is full of repair visits on 2026-11-24")).toBeInTheDocument()
  })

  it("Done on a priced one-off asks how it was paid, once, and passes the choice to the action", async () => {
    const a = actions()
    renderScreen(a, { defaultVisitId: "a" })
    const panel = within(screen.getByRole("dialog"))
    await userEvent.click(panel.getByLabelText("Venmo"))
    await userEvent.type(panel.getByLabelText("Reference (optional)"), "@dana")
    await userEvent.click(panel.getByRole("button", { name: "Mark done and record payment" }))
    expect(a.markDone).toHaveBeenCalledWith("a", { paidBy: { method: "venmo", reference: "@dana" } })
  })

  it("Done on a visit with no price needs no question", async () => {
    const a = actions()
    const withDay: AdminData = { ...data, visits: [visit({ id: "q", clientName: "Quinn Vale", clientId: "cx", price: 0 })] }
    render(
      <UndoToastProvider>
        <VisitsScreen data={withDay} today={TODAY} actions={a} defaultVisitId="q" />
      </UndoToastProvider>,
    )
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Mark done" }))
    expect(a.markDone).toHaveBeenCalledWith("q", {})
  })

  it("Not done sends the reason; Cancel asks first and names the visit and the money", async () => {
    const a = actions()
    renderScreen(a, { defaultVisitId: "a" })
    const panel = within(screen.getByRole("dialog"))
    await userEvent.selectOptions(panel.getByLabelText("Why"), "no-water")
    await userEvent.click(panel.getByRole("button", { name: "Mark not done" }))
    expect(a.markNotDone).toHaveBeenCalledWith("a", "no-water", undefined)
    await userEvent.click(panel.getByRole("button", { name: "Cancel this visit" }))
    const dialog = within(await screen.findByRole("dialog"))
    expect(dialog.getByText(/Cancel Dana Reed's repair on Fri, Nov 20\?/)).toBeInTheDocument()
    expect(dialog.getByText(/\$145 will not be charged/)).toBeInTheDocument()
    expect(a.cancel).not.toHaveBeenCalled()
    await userEvent.click(dialog.getByRole("button", { name: "Cancel visit" }))
    expect(a.cancel).toHaveBeenCalledWith("a")
  })

  it("Send a text calls its action with the words and refuses an empty one", async () => {
    const a = actions()
    renderScreen(a, { defaultVisitId: "a" })
    const panel = within(screen.getByRole("dialog"))
    expect(panel.getByRole("button", { name: "Send text" })).toBeDisabled()
    await userEvent.type(panel.getByLabelText("Text to send"), "Running late.")
    expect(panel.getByText("13/320")).toBeInTheDocument()
    await userEvent.click(panel.getByRole("button", { name: "Send text" }))
    expect(a.sendText).toHaveBeenCalledWith("cx", "a", "Running late.")
  })

  it("a done and unpaid one-off offers the payment record", async () => {
    const a = actions()
    const owed: AdminData = { ...data, visits: [visit({ id: "u", status: "completed", completedOn: "2026-11-10", scheduledOn: "2026-11-10", startAt: "2026-11-10T15:00:00Z" })] }
    render(
      <UndoToastProvider>
        <VisitsScreen data={owed} today={TODAY} actions={a} defaultVisitId="u" />
      </UndoToastProvider>,
    )
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Record payment" }))
    expect(a.recordPayment).toHaveBeenCalledWith("u", { method: "check" })
  })

  it("Done offers Send an invoice as the last choice, with its hint, and sends it as the way it was paid", async () => {
    const a = actions()
    renderScreen(a, { defaultVisitId: "a" })
    const panel = within(screen.getByRole("dialog"))
    const choices = panel.getAllByRole("radio").map((r) => (r as HTMLInputElement).value)
    expect(choices).toEqual(["check", "venmo", "cash", "bill"])
    expect(panel.queryByText("Texts a pay link, or emails it when there is no mobile.", { selector: "p.mt-2" })).toBeNull()
    await userEvent.click(panel.getByLabelText("Send an invoice"))
    expect(panel.getByText("Texts a pay link, or emails it when there is no mobile.", { selector: "p.mt-2" })).toBeInTheDocument()
    expect(panel.queryByLabelText("Reference (optional)")).toBeNull()
    await userEvent.click(panel.getByRole("button", { name: "Mark done and send an invoice" }))
    expect(a.markDone).toHaveBeenCalledWith("a", { paidBy: { method: "bill" } })
    expect(await screen.findByText(/Marked done\. Invoice sent\./)).toBeInTheDocument()
  })

  it("Record the payment never offers Send an invoice", () => {
    const owed: AdminData = { ...data, visits: [visit({ id: "u", status: "completed", completedOn: "2026-11-10", scheduledOn: "2026-11-10", startAt: "2026-11-10T15:00:00Z" })] }
    render(
      <UndoToastProvider>
        <VisitsScreen data={owed} today={TODAY} actions={actions()} defaultVisitId="u" />
      </UndoToastProvider>,
    )
    expect(within(screen.getByRole("dialog")).queryByLabelText("Send an invoice")).toBeNull()
  })

  it("a done and unpaid job offers Send an invoice, and once sent reads Invoice sent with the dates, Remind and the pay link", async () => {
    const a = actions()
    const done = visit({ id: "u", jobId: "ju", status: "completed", completedOn: "2026-11-10", scheduledOn: "2026-11-10", startAt: "2026-11-10T15:00:00Z" })
    const job = { id: "ju", customerId: "cx", kind: "repair" as const, status: "open" as const, source: "office" as const, visitIds: ["u"], total: 145, payments: [], money: { paid: 0, total: 145, owed: 145, words: "$145 unpaid" } }
    const owed: AdminData = { ...data, visits: [done], jobs: [job] }
    const { unmount } = render(
      <UndoToastProvider>
        <VisitsScreen data={owed} today={TODAY} actions={a} defaultVisitId="u" />
      </UndoToastProvider>,
    )
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Send an invoice" }))
    expect(a.sendBill).toHaveBeenCalledWith("ju")
    unmount()

    const invoice = { id: "inv1", jobId: "ju", number: "INV-2026-0001", amount: 145, tax: 0, total: 145, sentOn: "2026-11-17", dueOn: "2026-12-01", status: "sent" as const, visitIds: ["u"], payUrl: "https://site.test/pay/inv1?token=t" }
    const billed: AdminData = { ...data, visits: [{ ...done, invoice }], jobs: [{ ...job, invoice, money: { ...job.money, words: "Invoice sent", billSent: true } }] }
    render(
      <UndoToastProvider>
        <VisitsScreen data={billed} today={TODAY} actions={a} defaultVisitId="u" />
      </UndoToastProvider>,
    )
    const panel = within(screen.getByRole("dialog"))
    expect(panel.getByText("Invoice sent Nov 17, due Dec 1")).toBeInTheDocument()
    expect(panel.getByText(/Invoice sent\. \$145 unpaid|\. Invoice sent\./)).toBeInTheDocument()
    expect(panel.queryByRole("button", { name: "Send an invoice" })).toBeNull()
    expect(panel.getByRole("link", { name: "Pay link" })).toHaveAttribute("href", "https://site.test/pay/inv1?token=t")
    await userEvent.click(panel.getByRole("button", { name: "Remind" }))
    expect(a.remindBill).toHaveBeenCalledWith("inv1")
    expect(await panel.findByText("Reminder sent.")).toBeInTheDocument()
  })

  it("shows a tech the invoice's words and neither button nor pay link", () => {
    const invoice = { id: "inv1", jobId: "ju", number: "INV-2026-0001", amount: 145, tax: 0, total: 145, sentOn: "2026-11-17", dueOn: "2026-12-01", status: "sent" as const, visitIds: ["u"] }
    const done = visit({ id: "u", jobId: "ju", status: "completed", completedOn: "2026-11-10", scheduledOn: "2026-11-10", startAt: "2026-11-10T15:00:00Z", invoice })
    const job = { id: "ju", customerId: "cx", kind: "repair" as const, status: "open" as const, source: "office" as const, visitIds: ["u"], total: 145, payments: [], invoice, money: { paid: 0, total: 145, owed: 145, words: "Invoice sent", billSent: true } }
    renderScreen(actions(), { readOnly: true, defaultVisitId: "u", data: { ...data, visits: [done], jobs: [job] } })
    const panel = within(screen.getByRole("dialog"))
    expect(panel.queryByRole("button", { name: "Remind" })).toBeNull()
    expect(panel.queryByRole("link", { name: "Pay link" })).toBeNull()
    // the pill and the job's money still say it
    expect(panel.getAllByText(/Invoice sent/).length).toBeGreaterThan(0)
  })

  it("hands a tech the visit read-only: no New job and no action buttons", () => {
    renderScreen(actions(), { readOnly: true, defaultVisitId: "a" })
    expect(screen.queryByRole("button", { name: "New job" })).toBeNull()
    const panel = within(screen.getByRole("dialog"))
    expect(panel.queryByRole("button", { name: "Move" })).toBeNull()
    expect(panel.getByText("Customer")).toBeInTheDocument()
  })
})

describe("New job", () => {
  it("needs only a customer and a service; the day is optional and More details holds the defaults", async () => {
    const a = actions()
    renderScreen(a)
    await userEvent.click(screen.getByRole("button", { name: "New job" }))
    const sheet = within(await screen.findByRole("dialog"))
    expect(sheet.queryByRole("button", { name: "Add job" })).toBeNull()
    await userEvent.type(sheet.getByLabelText("Find a customer"), "Elm")
    await userEvent.click(await sheet.findByRole("button", { name: /Dana Reed/ }))
    await userEvent.selectOptions(sheet.getByLabelText("What are we doing?"), "repair")
    expect(sheet.getByRole("button", { name: "Add job" })).toBeEnabled()
    expect(sheet.getByLabelText("Minutes")).toHaveValue("120")
    expect(sheet.getByLabelText("Price")).toHaveValue("145")
    await userEvent.click(sheet.getByRole("button", { name: "Add job" }))
    expect(a.createVisit).toHaveBeenCalledWith(expect.objectContaining({ customerId: "cx", serviceKey: "repair", durationMinutes: 120, price: 145 }))
    expect(a.createVisit.mock.calls[0]![0]).not.toHaveProperty("scheduledOn")
  })

  it("takes a new customer with name, street and town, and shows the API's refusal", async () => {
    const a = actions({ createVisit: vi.fn().mockResolvedValue({ ok: false, message: "Truck 1 does not work on sundays" }) })
    renderScreen(a)
    await userEvent.click(screen.getByRole("button", { name: "New job" }))
    const sheet = within(await screen.findByRole("dialog"))
    await userEvent.click(sheet.getByRole("button", { name: "New customer" }))
    await userEvent.type(sheet.getByLabelText("First name"), "Nora")
    await userEvent.type(sheet.getByLabelText("Last name"), "Vale")
    await userEvent.type(sheet.getByLabelText("Street"), "1 Main St")
    await userEvent.selectOptions(sheet.getByLabelText("What are we doing?"), "repair")
    await userEvent.click(sheet.getByRole("button", { name: "Add job" }))
    expect(a.createVisit).toHaveBeenCalledWith(expect.objectContaining({ newCustomer: expect.objectContaining({ firstName: "Nora", lastName: "Vale", property: { address: "1 Main St", town: "Erie" } }) }))
    expect(await sheet.findByText("Truck 1 does not work on sundays")).toBeInTheDocument()
  })
})

// A pass visit that is Done and Unpaid, with the customer's card and without: both must show how to take the money.
describe("Done and Owed on a pass visit", () => {
  const owedPass = (id: string): AdminData => ({
    ...visitsData,
    visits: visitsData.visits.map((v) => (v.id === id ? { ...v, status: "completed" as const, completedOn: "2026-11-10", scheduledOn: "2026-11-10", startAt: "2026-11-10T15:00:00Z", payments: [] } : v)),
  })
  const open = (id: string, d: AdminData) =>
    render(
      <UndoToastProvider>
        <VisitsScreen data={d} today={VISITS_TODAY} actions={actions()} defaultVisitId={id} />
      </UndoToastProvider>,
    )

  it("offers Record the payment when the customer has no card, and the row says there is no card", () => {
    const d = owedPass(noCardVisitId)
    open(noCardVisitId, d)
    const panel = within(screen.getByRole("dialog"))
    expect(panel.getByRole("heading", { name: "Record the payment" })).toBeInTheDocument()
    expect(panel.getByRole("button", { name: "Record payment" })).toBeInTheDocument()
    expect(visitRows(d, VISITS_TODAY).find((r) => r.id === noCardVisitId)!.moneyText).toMatch(/ unpaid · no card$/)
  })

  it("offers Record the payment when the customer has a card too, since a charge that never went through must not leave it stuck", () => {
    open(passVisitId, owedPass(passVisitId))
    expect(within(screen.getByRole("dialog")).getByRole("heading", { name: "Record the payment" })).toBeInTheDocument()
  })

  it("says it charges the card on Done and keeps Paid another way, which asks how", async () => {
    // The fixture's pass visit, booked and not yet done, on a pass whose customer has a card.
    const booked: AdminData = { ...visitsData, visits: visitsData.visits.map((v) => (v.id === passVisitId ? { ...v, status: "scheduled" as const, completedOn: undefined, payments: [] } : v)) }
    open(passVisitId, booked)
    const panel = within(screen.getByRole("dialog"))
    expect(panel.getByText(/Charges the card ending \d{4} after this visit/)).toBeInTheDocument()
    expect(panel.queryByRole("button", { name: "Mark done and record payment" })).toBeNull()
    await userEvent.click(panel.getByRole("button", { name: "Paid another way" }))
    expect(panel.getByRole("button", { name: "Mark done and record payment" })).toBeInTheDocument()
  })

  it("asks how it was paid on Done when the customer has no card", () => {
    open(noCardVisitId, visitsData)
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Mark done and record payment" })).toBeInTheDocument()
  })
})

describe("Visits filtered to a job (?job=)", () => {
  it("shows only that job's visits, says which job in the header, and links back to every visit", () => {
    const job = visitsData.visits.find((v) => v.id === noCardVisitId)!.jobId!
    const mine = visitRows(visitsData, VISITS_TODAY).filter((r) => r.jobId === job)
    render(
      <UndoToastProvider>
        <VisitsScreen data={visitsData} today={VISITS_TODAY} actions={actions()} jobId={job} />
      </UndoToastProvider>,
    )
    expect(screen.getAllByRole("row")).toHaveLength(mine.length + 1)
    expect(document.querySelector('[data-slot="page-context"]')).toHaveTextContent(`${mine[0]!.jobLabel}: ${mine.length} visit`)
    expect(screen.getByRole("link", { name: "Show all visits" })).toHaveAttribute("href", "/admin/visits")
  })

  it("the grid has no Job column or filter; the panel names the job on one line under the pill and links to that job on Jobs", () => {
    const job = visitsData.visits.find((v) => v.id === noCardVisitId)!.jobId!
    render(
      <UndoToastProvider>
        <VisitsScreen data={visitsData} today={VISITS_TODAY} actions={actions()} defaultVisitId={noCardVisitId} />
      </UndoToastProvider>,
    )
    expect(screen.queryAllByRole("columnheader", { hidden: true }).map((h) => h.textContent)).not.toContain("Job")
    expect(screen.queryByRole("button", { name: "Job", hidden: true })).toBeNull()
    expect(screen.getByRole("searchbox", { hidden: true })).toHaveAttribute("placeholder", "Search by name or street")
    const panel = within(screen.getByRole("dialog"))
    const line = panel.getByText(/^Season Pass TH-.* · \d{4}$/)
    expect(line.closest("a")).toHaveAttribute("href", `/admin/jobs?job=${job}`)
    expect(panel.getByRole("link", { name: "Open job" })).toHaveAttribute("href", `/admin/jobs?job=${job}`)
    expect(screen.queryAllByRole("link", { hidden: true }).some((l) => (l.getAttribute("href") ?? "").startsWith("/admin/passes"))).toBe(false)
  })
})
