import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, Visit } from "@/lib/admin/types"
import { UndoToastProvider } from "@/components/blocks/UndoToast"
import type { VisitActions } from "./visit-actions-types"
import { VisitsScreen } from "./VisitsScreen"
import { visitRows } from "./visits-model"

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
  scheduledOn: "2026-11-20", startAt: "2026-11-20T15:00:00Z", price: 145, minutes: 120, truckId: "truck-1", truckName: "Truck 1", ...over,
})

const mine: Visit[] = [
  visit({ id: "a", clientName: "Dana Reed" }),
  visit({ id: "b", clientName: "Sam Ortiz", clientId: "cs", kind: "install", status: "unscheduled", scheduledOn: undefined, startAt: undefined, truckId: undefined, truckName: undefined, price: 0 }),
  visit({ id: "c", clientName: "Lee Park", clientId: "cl", status: "completed", completedOn: "2026-11-10", scheduledOn: "2026-11-10", startAt: "2026-11-10T15:00:00Z", chargedAt: "2026-11-10T20:00:00Z", paidMethod: "check" }),
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

const ok = { ok: true as const, data: undefined }
const actions = (over: Partial<VisitActions> = {}): VisitActions => ({
  move: vi.fn().mockResolvedValue({ ok: true, data: { day: "2026-11-20", truckId: "truck-1", startTime: null } }),
  putBack: vi.fn().mockResolvedValue(ok),
  markDone: vi.fn().mockResolvedValue(ok),
  undoDone: vi.fn().mockResolvedValue(ok),
  recordPayment: vi.fn().mockResolvedValue(ok),
  markNotDone: vi.fn().mockResolvedValue({ ok: true, data: { day: "2026-11-20", truckId: "truck-1", startTime: null } }),
  edit: vi.fn().mockResolvedValue(ok),
  cancel: vi.fn().mockResolvedValue(ok),
  sendText: vi.fn().mockResolvedValue(ok),
  resendConfirmation: vi.fn().mockResolvedValue(ok),
  createVisit: vi.fn().mockResolvedValue({ ok: true, data: { id: "new" } }),
  ...over,
})

const renderScreen = (a: VisitActions | undefined, props: { readOnly?: boolean; defaultVisitId?: string } = {}) =>
  render(
    <UndoToastProvider>
      <VisitsScreen data={data} today={TODAY} actions={a} {...props} />
    </UndoToastProvider>,
  )

describe("visits-model", () => {
  it("lists the visits with the two pills, needs-a-day first, and finds one by street or phone", () => {
    const rows = visitRows(data, TODAY)
    expect(rows.map((r) => r.id)).toEqual(["b", "c", "a"])
    expect(rows[1]).toMatchObject({ work: "done", money: "paid", moneyLabel: "Paid, check", jobType: "one-off" })
    expect(rows.find((r) => r.id === "a")!.search).toContain("12 Elm St")
    expect(rows.find((r) => r.id === "a")!.search).toContain("3035550111")
  })
})

describe("VisitsScreen", () => {
  it("shows the spec's columns and a row per visit, with New visit and a link to Passes in the header", () => {
    renderScreen(actions())
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent)
    expect(headers).toEqual(expect.arrayContaining(["Customer", "Town", "Visit", "Day", "Time", "Truck", "Work", "Money", "Price", "Pass"]))
    expect(screen.getByRole("button", { name: "Dana Reed" })).toBeInTheDocument()
    expect(screen.getByText("Paid, check")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "New visit" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Passes" })).toHaveAttribute("href", "/admin/passes")
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
    const panel = within(screen.getByRole("complementary"))
    expect(panel.getByText("Moves the repair to Fri, Nov 20 and tells Dana.")).toBeInTheDocument()
    await userEvent.clear(panel.getByLabelText("Day"))
    await userEvent.type(panel.getByLabelText("Day"), "2026-11-24")
    await userEvent.selectOptions(panel.getByLabelText("Time"), "09:00")
    await userEvent.click(panel.getByRole("button", { name: "Move" }))
    expect(a.move).toHaveBeenCalledWith("a", "2026-11-24", "09:00")
    await userEvent.click(await screen.findByRole("button", { name: "Undo" }))
    expect(a.putBack).toHaveBeenCalledWith("a", { day: "2026-11-20", truckId: "truck-1", startTime: null })
  })

  it("shows the API's refusal next to the Move", async () => {
    const a = actions({ move: vi.fn().mockResolvedValue({ ok: false, message: "Truck 1 is full of repair visits on 2026-11-24" }) })
    renderScreen(a, { defaultVisitId: "a" })
    await userEvent.click(within(screen.getByRole("complementary")).getByRole("button", { name: "Move" }))
    expect(await screen.findByText("Truck 1 is full of repair visits on 2026-11-24")).toBeInTheDocument()
  })

  it("Done on a priced one-off asks how it was paid, once, and passes the choice to the action", async () => {
    const a = actions()
    renderScreen(a, { defaultVisitId: "a" })
    const panel = within(screen.getByRole("complementary"))
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
    await userEvent.click(within(screen.getByRole("complementary")).getByRole("button", { name: "Mark done" }))
    expect(a.markDone).toHaveBeenCalledWith("q", {})
  })

  it("Not done sends the reason; Cancel asks first and names the visit and the money", async () => {
    const a = actions()
    renderScreen(a, { defaultVisitId: "a" })
    const panel = within(screen.getByRole("complementary"))
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
    const panel = within(screen.getByRole("complementary"))
    expect(panel.getByRole("button", { name: "Send text" })).toBeDisabled()
    await userEvent.type(panel.getByLabelText("Text to send"), "Running late.")
    expect(panel.getByText("13/320")).toBeInTheDocument()
    await userEvent.click(panel.getByRole("button", { name: "Send text" }))
    expect(a.sendText).toHaveBeenCalledWith("cx", "a", "Running late.")
  })

  it("a done, unpaid one-off offers the payment record; a paid one does not", async () => {
    const a = actions()
    const unpaid: AdminData = { ...data, visits: [visit({ id: "u", status: "completed", completedOn: "2026-11-10", scheduledOn: "2026-11-10", startAt: "2026-11-10T15:00:00Z" })] }
    render(
      <UndoToastProvider>
        <VisitsScreen data={unpaid} today={TODAY} actions={a} defaultVisitId="u" />
      </UndoToastProvider>,
    )
    await userEvent.click(within(screen.getByRole("complementary")).getByRole("button", { name: "Record payment" }))
    expect(a.recordPayment).toHaveBeenCalledWith("u", { method: "check" })
  })

  it("hands a tech the visit read-only: no New visit and no action buttons", () => {
    renderScreen(actions(), { readOnly: true, defaultVisitId: "a" })
    expect(screen.queryByRole("button", { name: "New visit" })).toBeNull()
    const panel = within(screen.getByRole("complementary"))
    expect(panel.queryByRole("button", { name: "Move" })).toBeNull()
    expect(panel.getByText("Customer")).toBeInTheDocument()
  })
})

describe("New visit", () => {
  it("needs only a customer, a kind and a day; More details holds the defaults", async () => {
    const a = actions()
    renderScreen(a)
    await userEvent.click(screen.getByRole("button", { name: "New visit" }))
    const sheet = within(await screen.findByRole("dialog"))
    expect(sheet.getByRole("button", { name: "Add visit" })).toBeDisabled()
    await userEvent.type(sheet.getByLabelText("Find a customer"), "Elm")
    await userEvent.click(await sheet.findByRole("button", { name: /Dana Reed/ }))
    expect(sheet.getByRole("button", { name: "Add visit" })).toBeEnabled()
    expect(sheet.getByLabelText("Minutes")).toHaveValue("120")
    expect(sheet.getByLabelText("Price")).toHaveValue("145")
    await userEvent.click(sheet.getByRole("button", { name: "Add visit" }))
    expect(a.createVisit).toHaveBeenCalledWith(expect.objectContaining({ customerId: "cx", kind: "repair", scheduledOn: "2026-11-12", durationMinutes: 120, price: 145 }))
  })

  it("takes a new customer with name, street and town, and shows the API's refusal", async () => {
    const a = actions({ createVisit: vi.fn().mockResolvedValue({ ok: false, message: "Truck 1 does not work on sundays" }) })
    renderScreen(a)
    await userEvent.click(screen.getByRole("button", { name: "New visit" }))
    const sheet = within(await screen.findByRole("dialog"))
    await userEvent.click(sheet.getByRole("button", { name: "New customer" }))
    await userEvent.type(sheet.getByLabelText("First name"), "Nora")
    await userEvent.type(sheet.getByLabelText("Last name"), "Vale")
    await userEvent.type(sheet.getByLabelText("Street"), "1 Main St")
    await userEvent.click(sheet.getByRole("button", { name: "Add visit" }))
    expect(a.createVisit).toHaveBeenCalledWith(expect.objectContaining({ newCustomer: expect.objectContaining({ firstName: "Nora", lastName: "Vale", property: { address: "1 Main St", town: "Erie" } }) }))
    expect(await sheet.findByText("Truck 1 does not work on sundays")).toBeInTheDocument()
  })
})
