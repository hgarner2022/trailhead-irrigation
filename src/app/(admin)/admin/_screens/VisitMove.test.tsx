import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, Visit } from "@/lib/admin/types"
import { UndoToastProvider } from "@/components/blocks/UndoToast"
import { StatusPills } from "@/components/blocks/StatusPill"
import type { VisitActions } from "./visit-actions-types"
import { VisitsScreen } from "./list-fixture"
import { visitBar } from "./visit-bar-model"

// Move (step 4 of the admin build order): one dialog with a split button, the optional line, the booked-time and must-be-home and 24-hour words,
// and the Customer confirmed clearing of Waiting on customer. Everything runs against fake actions: no text is ever sent.

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

const visit = (over: Partial<Visit> = {}): Visit => ({
  id: "a", clientId: "cx", clientName: "Dana Reed", town: "Erie", kind: "repair", status: "scheduled", isPass: false, jobberUrl: "", jobId: "jx",
  scheduledOn: "2026-11-24", startAt: "2026-11-24T15:00:00Z", price: 145, minutes: 120, personId: "person_truck-1", personName: "Ryan Garner", ...over,
})
const dataOf = (v: Visit): AdminData => ({
  ...base, visits: [v], attention: [], jobs: [],
  clients: [{ id: "cx", firstName: "Dana", lastName: "Reed", town: "Erie", address: "12 Elm St", phone: "+13035550111", jobberUrl: "", hasPass: false, app: true }],
})

const ok = { ok: true as const, data: undefined }
const actions = (over: Partial<VisitActions> = {}): VisitActions => {
  const none = vi.fn().mockResolvedValue(ok)
  return {
    move: vi.fn().mockResolvedValue({ ok: true, data: { day: "2026-11-24", personId: "person_truck-1", startTime: null, notified: true } }), confirmDay: none, putBack: none, markDone: none, undoDone: none, chargeCard: none,
    recordPayment: none, refundPayment: none, sendBill: none, remindBill: none, markNotDone: none, edit: none, addNote: none, cancel: none, sendText: none, sendOnTheWay: none,
    resendConfirmation: none, sendCardUpdateLink: none, createVisit: none, sellPass: none, updateProperty: none, ...over,
  } as VisitActions
}

const open = async (v: Visit, a: VisitActions) => {
  render(
    <UndoToastProvider>
      <VisitsScreen data={dataOf(v)} today={TODAY} actions={a} defaultVisitId={v.id} />
    </UndoToastProvider>,
  )
  await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Move" }))
  return within(screen.getAllByRole("dialog").at(-1)!)
}
const caret = (dialog: ReturnType<typeof within>) => userEvent.click(dialog.getByRole("button", { name: "More ways to move" }))

describe("the Move dialog", () => {
  it("is one dialog with the day, the time and an optional line, and 'Move and text the customer' sends the line", async () => {
    const a = actions()
    const dialog = await open(visit(), a)
    expect(dialog.getByLabelText("Day")).toBeInTheDocument()
    expect(dialog.getByLabelText("Time")).toBeInTheDocument()
    await userEvent.type(dialog.getByLabelText("A line for the text"), "Rain on Tuesday")
    await userEvent.click(dialog.getByRole("button", { name: "Move and text the customer" }))
    expect(a.move).toHaveBeenCalledWith("a", "2026-11-24", null, { notify: true, note: "Rain on Tuesday" })
    expect(await screen.findByText(/Moved to Tue, Nov 24\./)).toBeInTheDocument()
  })

  it("'Move without texting' sits under the caret and sends notify false, with no line; the toast says no text was sent", async () => {
    const a = actions()
    const dialog = await open(visit(), a)
    await caret(dialog)
    await userEvent.click(await screen.findByRole("menuitem", { name: "Move without texting" }))
    expect(a.move).toHaveBeenCalledWith("a", "2026-11-24", null, { notify: false })
    expect(await screen.findByText(/no text sent/)).toBeInTheDocument()
  })

  it("is greyed out once a line is typed, since the line goes in the text", async () => {
    const dialog = await open(visit(), actions())
    await userEvent.type(dialog.getByLabelText("A line for the text"), "Hi")
    await caret(dialog)
    expect(await screen.findByRole("menuitem", { name: "Move without texting" })).toHaveAttribute("aria-disabled", "true")
  })

  it("is greyed out for a visit with a booked time, with the reason in the dialog; the booked time is offered back", async () => {
    const a = actions()
    const dialog = await open(visit({ timeBooked: true, startTime: "09:30", startAt: "2026-11-24T16:30:00Z" }), a)
    expect(dialog.getByText("Dana was given a time, so the customer is always texted when it moves.")).toBeInTheDocument()
    expect(dialog.getByLabelText("Time")).toHaveValue("09:30")
    await caret(dialog)
    expect(await screen.findByRole("menuitem", { name: "Move without texting" })).toHaveAttribute("aria-disabled", "true")
    await userEvent.keyboard("{Escape}")
    await userEvent.click(dialog.getByRole("button", { name: "Move and text the customer" }))
    expect(a.move).toHaveBeenCalledWith("a", "2026-11-24", "09:30", { notify: true })
  })

  it("does not offer a pass visit's stacked start time back as a time: that was never promised", async () => {
    const dialog = await open(visit({ isPass: true, startTime: "08:00", startAt: "2026-11-24T15:00:00Z" }), actions())
    expect(dialog.getByLabelText("Time")).toHaveValue("")
  })

  it("says a property that must be home is asked to reply YES, and that the visit will read Waiting on customer", async () => {
    const dialog = await open(visit({ property: { mustBeHome: true } }), actions())
    expect(dialog.getByText("Dana needs to be home, so the text asks them to reply YES or pick another day. The visit reads Waiting on customer until they answer.")).toBeInTheDocument()
  })

  it("warns inside the customer's 24-hour window and still goes through", async () => {
    // today is Thursday Nov 12 (Mountain); a visit on Fri Nov 13 is past the cut-off
    const a = actions()
    const dialog = await open(visit({ scheduledOn: "2026-11-13", startAt: "2026-11-13T15:00:00Z" }), a)
    expect(dialog.getByRole("status")).toHaveTextContent("inside Dana's 24-hour window")
    await userEvent.click(dialog.getByRole("button", { name: "Move and text the customer" }))
    expect(a.move).toHaveBeenCalled()
    // a visit a week out has no warning
  })

  it("has no warning for a day a week out", async () => {
    const dialog = await open(visit(), actions())
    expect(dialog.queryByRole("status")).toBeNull()
  })

  it("shows the API's refusal in the dialog", async () => {
    const a = actions({ move: vi.fn().mockResolvedValue({ ok: false, message: "This visit has a booked time, so the customer is always texted. Move it and text them." }) })
    const dialog = await open(visit(), a)
    await userEvent.click(dialog.getByRole("button", { name: "Move and text the customer" }))
    expect(await screen.findByText(/always texted/)).toBeInTheDocument()
  })

  it("a visit with no day is given one with a plain 'Schedule' that texts the date, as before", async () => {
    const a = actions()
    render(
      <UndoToastProvider>
        <VisitsScreen data={dataOf(visit({ status: "unscheduled", scheduledOn: undefined, startAt: undefined, personId: undefined, personName: undefined }))} today={TODAY} actions={a} defaultVisitId="a" />
      </UndoToastProvider>,
    )
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Schedule" }))
    const dialog = within(screen.getAllByRole("dialog").at(-1)!)
    expect(dialog.queryByRole("button", { name: "More ways to move" })).toBeNull()
    expect(dialog.queryByLabelText("A line for the text")).toBeNull()
    await userEvent.click(dialog.getByRole("button", { name: "Schedule" }))
    expect(a.move).toHaveBeenCalledWith("a", expect.any(String), null, { notify: true })
  })
})

describe("Waiting on customer", () => {
  it("is a neutral third pill in the panel, and 'Customer confirmed' under More clears it through visits.confirm", async () => {
    const a = actions()
    render(
      <UndoToastProvider>
        <VisitsScreen data={dataOf(visit({ waiting: true }))} today={TODAY} actions={a} defaultVisitId="a" />
      </UndoToastProvider>,
    )
    const panel = within(screen.getByRole("dialog"))
    expect(panel.getByText("Waiting on customer")).toBeInTheDocument()
    await userEvent.click(panel.getByRole("button", { name: "More" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Customer confirmed" }))
    expect(a.confirmDay).toHaveBeenCalledWith("a")
  })

  it("has no Customer confirmed on a visit that is not waiting", async () => {
    render(
      <UndoToastProvider>
        <VisitsScreen data={dataOf(visit())} today={TODAY} actions={actions()} defaultVisitId="a" />
      </UndoToastProvider>,
    )
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "More" }))
    expect(screen.queryByRole("menuitem", { name: "Customer confirmed" })).toBeNull()
  })

  it("draws the pill only when asked", () => {
    const job = { work: "scheduled" } as never
    const { rerender } = render(<StatusPills job={job} />)
    expect(screen.queryByText("Waiting on customer")).toBeNull()
    rerender(<StatusPills job={job} waiting />)
    expect(screen.getByText("Waiting on customer")).toHaveAttribute("data-status", "waiting")
  })

  it("is in the footer model only for a manager of a scheduled, waiting visit", () => {
    const facts = (waiting: boolean) => ({ visit: visit({ waiting }), states: { work: "scheduled" } }) as never
    const plan = { canUndo: false } as never
    expect(visitBar(facts(true), plan, "all", "2026-11-12").more).toContain("confirmed")
    expect(visitBar(facts(false), plan, "all", "2026-11-12").more).not.toContain("confirmed")
    expect(visitBar(facts(true), plan, "collect", "2026-11-12").more).not.toContain("confirmed")
  })
})
