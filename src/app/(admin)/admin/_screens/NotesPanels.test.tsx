import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { UndoToastProvider } from "@/components/blocks/UndoToast"
import { CustomersScreen } from "./CustomersScreen"
import { JobsScreen } from "./JobsScreen"
import { VisitsScreen } from "./VisitsScreen"
import { ANDREA_EVENTS, ANDREA_MESSAGES, JOE_EVENTS, JOE_MESSAGES, PASS_EVENTS, storyOf, withTimeline } from "./notes-fixture"
import type { JobActions } from "./job-actions-types"
import { JOBS_TODAY, jobsData } from "./jobs-fixture"
import type { VisitActions } from "./visit-actions-types"
import { VISITS_TODAY, visitsData } from "./visits-fixture"

// The Notes and history block in the visit, customer and pass panels: the story of the record that is open, an Add note that
// calls the panel's addNote with that record, and the same block for a tech. The block's own behaviour is in its test.

beforeAll(() => {
  // The fixtures are dated 2026; a line shows its year only when it is not this year, so the clock is pinned (Date only).
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date("2026-11-18T19:00:00Z"))
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => undefined
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.scrollIntoView ??= () => undefined
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})

afterAll(() => vi.useRealTimers())

const TODAY = "2026-11-12T19:56:30Z"
const added = { id: "n-new", at: "2026-11-12T19:57:00Z", actor: "Ryan", what: "Back gate sticks", kind: "event" as const, note: "Back gate sticks" }
const addNote = () => vi.fn().mockResolvedValue({ ok: true, data: added })

const ok = { ok: true as const, data: undefined }
const visitActions = (): VisitActions => ({
  move: vi.fn(), putBack: vi.fn(), markDone: vi.fn(), undoDone: vi.fn(), recordPayment: vi.fn(), sendBill: vi.fn(), remindBill: vi.fn(), markNotDone: vi.fn(), edit: vi.fn().mockResolvedValue(ok),
  addNote: addNote(), cancel: vi.fn(), updateProperty: vi.fn(), sendText: vi.fn(), resendConfirmation: vi.fn(), sendCardUpdateLink: vi.fn(), createVisit: vi.fn(), sellPass: vi.fn(),
})

const visitsWithStory = (tech = false): AdminData => ({ ...visitsData, visits: withTimeline(visitsData.visits, "office-paid", storyOf(JOE_EVENTS, JOE_MESSAGES, tech)) })
const renderVisit = (data: AdminData, actions: VisitActions | undefined, readOnly = false) =>
  render(
    <UndoToastProvider>
      <VisitsScreen data={data} today={VISITS_TODAY} defaultVisitId="office-paid" readOnly={readOnly} actions={actions} />
    </UndoToastProvider>,
  )
const block = () => within(screen.getByRole("dialog")).getByRole("region", { name: "Notes and history" })
const lines = () => within(block()).getAllByRole("listitem").map((li) => li.textContent)

describe("the visit panel", () => {
  it("reads the visit's story in place of a Notes row, with the Edit form no longer editing notes", () => {
    renderVisit(visitsWithStory(), visitActions())
    expect(lines()).toEqual([
      "Nov 9 · Trailhead · Email sent: receipt",
      "Nov 9 · Ryan · $145 paid by check, Repair",
      "Nov 9 · Ryan · Repair marked done, paid by check",
      "Nov 6 · Ryan · Joe works nights, so text instead of calling.\nThe valve box is by the mailbox.",
      "Nov 5 · Ryan · Repair scheduled for Nov 9",
      "Nov 5 · Ryan · Repair added by the office",
    ])
    expect(screen.queryByText("Notes", { selector: "dt" })).toBeNull()
  })

  it("adds a note about this visit and shows it at the top", async () => {
    const actions = visitActions()
    renderVisit(visitsWithStory(), actions)
    await userEvent.type(within(block()).getByLabelText("Add a note"), "Back gate sticks")
    await userEvent.click(within(block()).getByRole("button", { name: "Add note" }))
    expect(actions.addNote).toHaveBeenCalledWith("visit", "office-paid", "Back gate sticks")
    await waitFor(() => expect(lines()[0]).toBe("Nov 12 · Ryan · Back gate sticks"))
  })

  it("gives a tech the story without the money and the same box to add a note", async () => {
    const actions = visitActions()
    renderVisit(visitsWithStory(true), actions, true)
    expect(lines().join("\n")).not.toMatch(/\$145 paid/)
    expect(lines()).toHaveLength(5)
    await userEvent.type(within(block()).getByLabelText("Add a note"), "Back gate sticks")
    await userEvent.click(within(block()).getByRole("button", { name: "Add note" }))
    expect(actions.addNote).toHaveBeenCalledWith("visit", "office-paid", "Back gate sticks")
  })

  it("keeps the plain Notes row for a visit that carries no story, and shows no block", () => {
    const data = { ...visitsData, visits: visitsData.visits.map((v) => (v.id === "office-paid" ? { ...v, notes: "Gate code on the fence" } : v)) }
    renderVisit(data, undefined)
    expect(screen.getByText("Gate code on the fence")).toBeInTheDocument()
    expect(screen.queryByRole("region", { name: "Notes and history" })).toBeNull()
  })

  it("only logs when there are no actions, as the catalog does", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined)
    renderVisit(visitsWithStory(), undefined)
    await userEvent.type(within(block()).getByLabelText("Add a note"), "Back gate sticks")
    await userEvent.click(within(block()).getByRole("button", { name: "Add note" }))
    expect(log).toHaveBeenCalledWith("add note", "visit", "office-paid", "Back gate sticks")
    log.mockRestore()
  })
})

describe("the customer panel", () => {
  const base = snapshot as AdminData
  const data: AdminData = { ...base, clients: withTimeline(base.clients, "c100", storyOf(ANDREA_EVENTS, ANDREA_MESSAGES)) }

  it("reads the customer's story with the messages merged in, after the property", () => {
    render(<CustomersScreen data={data} today={TODAY} defaultSelectedId="c100" visitActions={visitActions()} />)
    const text = lines().join("\n")
    expect(text).toContain("Nov 3 · Trailhead · Text sent: date set")
    expect(text).toContain("Nov 2 · Trailhead · Email sent: purchase confirmation")
    expect(text).toContain("Nov 2 · the customer · Season Pass TH-2027-0001 bought online")
    expect(lines()).toHaveLength(ANDREA_EVENTS.length + ANDREA_MESSAGES.length)
  })

  it("adds a note about the customer", async () => {
    const actions = visitActions()
    render(<CustomersScreen data={data} today={TODAY} defaultSelectedId="c100" visitActions={actions} />)
    await userEvent.type(within(block()).getByLabelText("Add a note"), "Back gate sticks")
    await userEvent.click(within(block()).getByRole("button", { name: "Add note" }))
    expect(actions.addNote).toHaveBeenCalledWith("customer", "c100", "Back gate sticks")
  })

  it("gives a tech the block and its add box", () => {
    render(<CustomersScreen data={{ ...base, clients: withTimeline(base.clients, "c100", storyOf(ANDREA_EVENTS, ANDREA_MESSAGES, true)) }} today={TODAY} defaultSelectedId="c100" readOnly visitActions={visitActions()} />)
    expect(lines().join("\n")).not.toMatch(/Consent recorded|Card saved|Customer details/)
    expect(within(block()).getByRole("button", { name: "Add note" })).toBeInTheDocument()
  })
})

describe("the job panel", () => {
  // Dana's pass, a job of the Jobs screen, carrying the story of Andrea's pass (the events are the catalog's).
  const data = (timeline = true): AdminData => ({ ...jobsData, jobs: jobsData.jobs!.map((j) => (j.id === "job_p-office" && timeline ? { ...j, timeline: storyOf(PASS_EVENTS) } : j)) })
  const actions = (): JobActions => ({ addLine: vi.fn(), updateLine: vi.fn(), cancelLine: vi.fn(), recordPayment: vi.fn(), addVisit: vi.fn(), addNote: addNote() })

  it("reads the story of the job after Change the pass", () => {
    render(<JobsScreen data={data()} today={JOBS_TODAY} defaultJobId="job_p-office" actions={actions()} />)
    expect(lines()[0]).toBe("Nov 10 · Ryan · Andrea would like the first Monday in May if it can be done.")
    expect(lines()).toContain("Nov 8 · the customer · Spring turn-on timing changed from mid May to early May")
    const change = screen.getByRole("heading", { name: "Change the pass" })
    expect(change.compareDocumentPosition(block()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("adds a note about the job, for a tech too", async () => {
    const a = actions()
    render(<JobsScreen data={data()} today={JOBS_TODAY} defaultJobId="job_p-office" readOnly actions={a} />)
    await userEvent.type(within(block()).getByLabelText("Add a note"), "Back gate sticks")
    await userEvent.click(within(block()).getByRole("button", { name: "Add note" }))
    expect(a.addNote).toHaveBeenCalledWith("job", "job_p-office", "Back gate sticks")
  })

  it("reads the story of a one-off job too, and keeps the plain note for a job with no story", () => {
    const oneOff: AdminData = { ...jobsData, jobs: jobsData.jobs!.map((j) => (j.id === "job-install" ? { ...j, timeline: storyOf(JOE_EVENTS, JOE_MESSAGES) } : j)) }
    const { unmount } = render(<JobsScreen data={oneOff} today={JOBS_TODAY} defaultJobId="job-install" actions={actions()} />)
    expect(lines().join("\n")).toContain("Repair marked done, paid by check")
    expect(screen.queryByText("Front yard first, then the strip along the fence.", { selector: "p" })).toBeNull()
    unmount()
    render(<JobsScreen data={jobsData} today={JOBS_TODAY} defaultJobId="job-install" actions={actions()} />)
    expect(screen.getByText("Front yard first, then the strip along the fence.")).toBeInTheDocument()
    expect(screen.queryByRole("region", { name: "Notes and history" })).toBeNull()
  })

  it("shows no block for a job whose story is not loaded", () => {
    render(<JobsScreen data={data(false)} today={JOBS_TODAY} defaultJobId="job_p-office" actions={actions()} />)
    expect(screen.queryByRole("region", { name: "Notes and history" })).toBeNull()
  })
})
