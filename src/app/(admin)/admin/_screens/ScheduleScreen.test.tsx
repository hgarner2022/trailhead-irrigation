import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { weekOf } from "@/lib/admin/calendar"
import { longDay } from "@/lib/portal/words"
import { ScheduleScreen } from "./ScheduleScreen"
import { VISITS_TODAY, visitsData } from "./visits-fixture"
import { visitRows } from "./visits-model"
import type { VisitActions } from "./visit-actions-types"
import { UndoToastProvider } from "@/components/blocks/UndoToast"

/** The panels read only the actions a button calls; these tests press none. */
const noActions = {} as VisitActions

const data = snapshot as AdminData
const TODAY = "2026-11-12T19:56:30Z"

// Radix Select leans on pointer capture and scrollIntoView, which jsdom lacks.
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => undefined
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.scrollIntoView ??= () => undefined
  vi.spyOn(console, "info").mockImplementation(() => undefined)
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})

const cell = (person: string, day: string) => document.querySelector<HTMLElement>(`[data-slot="week-grid-cell"][data-person="${person}"][data-day="${day}"]`)!
const percy = (el: HTMLElement) => within(el).getByRole("button", { name: /Percy/ })

async function pick(user: ReturnType<typeof userEvent.setup>, trigger: string, option: string) {
  // the person is a select; the day is the one calendar in a popover (the option is "Fri 13": the weekday and the day of the month)
  if (trigger === "Move to day") {
    await user.click(screen.getByRole("button", { name: new RegExp(`^${trigger}`) }))
    const [, weekday, day] = /^(\w+) (\d+)$/.exec(option)!
    await user.click(await screen.findByRole("button", { name: new RegExp(`^${weekday}\\w*, November ${day}(,|$)`) }))
    return
  }
  await user.click(screen.getByRole("combobox", { name: trigger }))
  await user.click(await screen.findByRole("option", { name: option }))
}

describe("ScheduleScreen move control", () => {
  it("shows nothing until a visit is selected", () => {
    render(<ScheduleScreen data={data} today={TODAY} />)
    expect(screen.queryByRole("region", { name: "Move the selected visit" })).toBeNull()
    expect(screen.getByRole("status")).toHaveTextContent("")
  })

  it("moves the selected visit to another person and day and says so", async () => {
    const user = userEvent.setup()
    render(<ScheduleScreen data={data} today={TODAY} />)
    await user.click(percy(cell("person_truck-1", "2026-11-12")))
    const control = screen.getByRole("region", { name: "Move the selected visit" })
    expect(control).toHaveTextContent("Move Percy, blowout")
    await pick(user, "Move to person", "Tech Two")
    await pick(user, "Move to day", "Fri 13")
    await user.click(within(control).getByRole("button", { name: "Move" }))
    expect(screen.getByRole("status")).toHaveTextContent("Moved Percy to Friday, November 13 with Tech Two.")
    expect(percy(cell("person_truck-2", "2026-11-13"))).toBeInTheDocument()
  })

  it("announces why a move to a day the person does not work is refused", async () => {
    const user = userEvent.setup()
    render(<ScheduleScreen data={data} today={TODAY} />)
    await user.click(percy(cell("person_truck-1", "2026-11-12")))
    await pick(user, "Move to day", "Sun 15")
    await user.click(screen.getByRole("button", { name: "Move" }))
    expect(screen.getByRole("status")).toHaveTextContent("Ryan Garner does not work Sunday, so Percy stays on Thursday, November 12.")
    expect(percy(cell("person_truck-1", "2026-11-12"))).toBeInTheDocument()
  })
})

describe("ScheduleScreen Schedule all", () => {
  const trayRows = () => within(document.querySelector<HTMLElement>('[data-slot="to-schedule-tray"]')!).getAllByRole("listitem")

  it("is a quiet button above the Unscheduled list that counts the same list, and the header has no Schedule button", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined)
    render(<ScheduleScreen data={data} today={TODAY} textDelaySeconds={0} />)
    const rows = trayRows()
    expect(screen.queryByRole("button", { name: "Schedule" })).toBeNull()
    expect(screen.getByRole("heading", { name: `Unscheduled (${rows.length})` })).toBeInTheDocument()
    const all = screen.getByRole("button", { name: `Schedule all ${rows.length}` })
    expect(document.querySelector('[data-slot="page-header"]')).not.toContainElement(all)
    await userEvent.click(all)
    const dialog = within(await screen.findByRole("dialog"))
    expect(dialog.getByRole("heading", { name: /^Schedule all \d+$/ })).toBeInTheDocument()
    expect(dialog.getAllByRole("listitem").length).toBe(rows.length)
    await userEvent.click(dialog.getByRole("button", { name: /^Schedule( all)? \d+$/ }))
    expect(info).toHaveBeenCalledWith("place visit", expect.any(String), expect.any(String), expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/jobs? scheduled|is scheduled with/))
  })

  it("holds the texts for a minute under one strip, and Undo inside the minute sends nothing and puts the jobs back", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onMove = vi.fn().mockResolvedValue({ ok: true, data: undefined })
      render(<ScheduleScreen data={data} today={TODAY} onMove={onMove} />)
      const before = trayRows().length
      await userEvent.click(screen.getByRole("button", { name: `Schedule all ${before}` }))
      await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: /^Schedule( all)? \d+$/ }))
      const strip = await screen.findByText(/^Texting \d+ customers in/)
      expect(strip.closest('[data-slot="texting-strip"]')).toHaveTextContent("60 s")
      expect(document.querySelector('[data-slot="to-schedule-tray"]')).toBeNull()
      expect(onMove).not.toHaveBeenCalled()
      await userEvent.click(screen.getByRole("button", { name: "Undo" }))
      expect(trayRows()).toHaveLength(before)
      await vi.advanceTimersByTimeAsync(120_000)
      expect(onMove).not.toHaveBeenCalled()
      expect(screen.getByRole("status")).toHaveTextContent("Nothing was sent. The job is back on the list.")
    } finally {
      vi.useRealTimers()
    }
  })

  it("sends every move through the API once the minute is up, to the person first with room", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onMove = vi.fn().mockResolvedValue({ ok: true, data: undefined })
      render(<ScheduleScreen data={data} today={TODAY} onMove={onMove} />)
      const before = trayRows().length
      await userEvent.click(screen.getByRole("button", { name: `Schedule all ${before}` }))
      await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: /^Schedule( all)? \d+$/ }))
      await vi.advanceTimersByTimeAsync(60_000)
      expect(onMove.mock.calls.length).toBeGreaterThan(0)
      expect(onMove.mock.calls[0]).toEqual([expect.any(String), "person_truck-1", expect.stringMatching(/^2027-/)])
    } finally {
      vi.useRealTimers()
    }
  })

  it("says No open day, with Another day, for a job whose window nothing has room in, and keeps it on the list", async () => {
    // windows are read year-agnostic, so a past one is next year's: the window here is the next two days and nobody works them
    const closed = { ...data, settings: { ...data.settings, windows: data.settings.windows.map((w) => ({ ...w, opensOn: "2026-11-14", closesOn: "2026-11-15" })), people: data.settings.people.map((p) => ({ ...p, workingDays: [] })) } }
    render(<ScheduleScreen data={closed} today={TODAY} textDelaySeconds={0} />)
    const before = trayRows().length
    await userEvent.click(within(trayRows()[0]!).getByRole("button", { name: /^Schedule / }))
    expect(within(trayRows()[0]!).getByText(/^No open day before Nov 15\. Pick a day yourself\.$/)).toBeInTheDocument()
    expect(within(trayRows()[0]!).getByRole("button", { name: "Another day" })).toBeInTheDocument()
    expect(trayRows()).toHaveLength(before)
  })
})

describe("ScheduleScreen with actions", () => {
  it("snaps the block back and says the API's words when a move is refused", async () => {
    const user = userEvent.setup()
    const onMove = vi.fn().mockResolvedValue({ ok: false, message: "Truck 2 is full of blowout visits on 2026-11-13" })
    render(<ScheduleScreen data={data} today={TODAY} onMove={onMove} />)
    await user.click(percy(cell("person_truck-1", "2026-11-12")))
    await pick(user, "Move to person", "Tech Two")
    await pick(user, "Move to day", "Fri 13")
    await user.click(screen.getByRole("button", { name: "Move" }))
    expect(onMove).toHaveBeenCalledWith(expect.any(String), "person_truck-2", "2026-11-13")
    expect(await screen.findByText("Truck 2 is full of blowout jobs on November 13", {}, { timeout: 5000 })).toBeInTheDocument()
    expect(percy(cell("person_truck-1", "2026-11-12"))).toBeInTheDocument()
  })

  it("keeps the block where it went when the move is accepted", async () => {
    const user = userEvent.setup()
    const onMove = vi.fn().mockResolvedValue({ ok: true, data: undefined })
    render(<ScheduleScreen data={data} today={TODAY} onMove={onMove} />)
    await user.click(percy(cell("person_truck-1", "2026-11-12")))
    await pick(user, "Move to person", "Tech Two")
    await pick(user, "Move to day", "Fri 13")
    await user.click(screen.getByRole("button", { name: "Move" }))
    expect(await screen.findByText("Moved Percy to Friday, November 13 with Tech Two.", {}, { timeout: 5000 })).toBeInTheDocument()
    expect(percy(cell("person_truck-2", "2026-11-13"))).toBeInTheDocument()
  })

  it("shows a tech no Schedule, Place or Move controls", async () => {
    render(<ScheduleScreen data={data} today={TODAY} readOnly onMove={vi.fn()} />)
    expect(screen.queryByRole("button", { name: "Schedule" })).toBeNull()
    expect(screen.queryByRole("button", { name: /^Schedule / })).toBeNull()
    expect(screen.queryByRole("button", { name: /^Schedule all/ })).toBeNull()
    await userEvent.click(percy(cell("person_truck-1", "2026-11-12")))
    expect(screen.queryByRole("region", { name: "Move the selected visit" })).toBeNull()
  })
})

// The owner's words, 13 Nov 2026: the Schedule opened on an empty November week, over a tray of 32 rows that held
// visits with a day and visits of unpaid passes, and a sentence about the window leaked onto the page.
describe("ScheduleScreen opens on the work", () => {
  // The calendar holds only jobs in the spring: the first is the week of April 26, 2027.
  const spring = { ...data, visits: data.visits.slice(0, 1).map((v) => ({ ...v, id: "spring", startAt: "2027-04-27T15:00:00Z", status: "scheduled" as const, personId: "person_truck-1", stopOrder: 1 })) }

  it("opens on the first week that has a job, not on an empty November week", () => {
    render(<ScheduleScreen data={spring} today={TODAY} />)
    expect(screen.getByText(/^Week of Apr 26\. 1 visit\.$/)).toBeInTheDocument()
    expect(screen.queryByText(/Next jobs/)).toBeNull()
  })

  it("points at the next week with jobs when the week on screen is empty, and goes there", async () => {
    render(<ScheduleScreen data={spring} today={TODAY} defaultWeek="2026-11-09" />)
    expect(screen.getByText(/Nothing on the calendar/)).toBeInTheDocument()
    const line = document.querySelector<HTMLElement>('[data-slot="next-jobs"]')!
    expect(line).toHaveTextContent("Next jobs: week of Apr 26")
    await userEvent.click(within(line).getByRole("button", { name: "week of Apr 26" }))
    expect(screen.getByText(/^Week of Apr 26\. 1 visit\.$/)).toBeInTheDocument()
    expect(document.querySelector('[data-slot="next-jobs"]')).toBeNull()
  })

  it("says nothing about a next week when none has a job", () => {
    render(<ScheduleScreen data={{ ...data, visits: [] }} today={TODAY} />)
    expect(screen.getByText(/Nothing on the calendar/)).toBeInTheDocument()
    expect(document.querySelector('[data-slot="next-jobs"]')).toBeNull()
  })
})

describe("ScheduleScreen's Unscheduled list", () => {
  const rows = () => within(document.querySelector<HTMLElement>('[data-slot="to-schedule-tray"]')!).getAllByRole("listitem")
  const pending = data.passes.find((p) => p.status === "pending")!

  it("lists only jobs with no day, for active passes, worded Unscheduled, with Place on each", () => {
    render(<ScheduleScreen data={data} today={TODAY} />)
    expect(screen.getByRole("heading", { name: /^Unscheduled \(\d+\)$/ })).toBeInTheDocument()
    expect(screen.queryByText(/To schedule/)).toBeNull()
    for (const row of rows()) expect(within(row).getByRole("button", { name: /^Schedule / })).toBeInTheDocument()
    // Every row is a job of an active pass with no day; a pending pass's job is not among them.
    const active = data.passes.filter((p) => p.status === "active")
    const noDay = active.flatMap((p) => p.visits.filter((v) => !v.scheduledAt && !v.completedAt))
    expect(rows()).toHaveLength(noDay.length)
    expect(screen.queryByText(new RegExp(`${pending.firstName} ${pending.lastName}`))).toBeNull()
  })

  it("says nothing of open jobs", () => {
    render(<ScheduleScreen data={data} today={TODAY} />)
    expect(document.body).not.toHaveTextContent(/open job/i)
    expect(document.body).not.toHaveTextContent(/jobber/i)
  })

  it("counts the same list on Schedule all as it lists", () => {
    render(<ScheduleScreen data={data} today={TODAY} />)
    expect(screen.getByRole("button", { name: `Schedule all ${rows().length}` })).toBeInTheDocument()
  })

  it("leaves a job out once it has a day, and shows nothing of a pending pass's jobs on the week either", () => {
    const week = weekOf(pending.visits[0].scheduledOn!, "America/Denver")
    render(<ScheduleScreen data={data} today={TODAY} defaultWeek={week} />)
    // The pending pass holds a day for its turn-on, but the Schedule never draws it.
    expect(screen.queryByText(new RegExp(pending.firstName))).toBeNull()
  })

  it("never carries the window sentence on the page", () => {
    render(<ScheduleScreen data={data} today={TODAY} />)
    expect(document.body).not.toHaveTextContent(/must land between/)
  })

  it("shows a refused Place's sentence under that row only, in the API's words", async () => {
    const onMove = vi.fn().mockResolvedValue({ ok: false, message: "A turn-on visit must land between 2027-04-15 and 2027-05-31" })
    render(<ScheduleScreen data={data} today={TODAY} onMove={onMove} textDelaySeconds={0} />)
    const name = within(rows()[0]).getByRole("button", { name: /^Schedule / }).getAttribute("aria-label")!
    await userEvent.click(within(rows()[0]).getByRole("button", { name: /^Schedule / }))
    const problem = await within(document.querySelector<HTMLElement>('[data-slot="to-schedule-tray"]')!).findByRole("alert", {}, { timeout: 5000 })
    expect(problem).toHaveTextContent("A turn-on job must land between April 15 and May 31")
    // It sits under the row of the job that was refused.
    expect(problem.closest("li")).toContainElement(screen.getByRole("button", { name }))
    // Nowhere else: the status line is empty, and the other rows carry nothing.
    expect(screen.getByRole("status")).toHaveTextContent("")
    expect(document.querySelectorAll('[data-slot="tray-problem"]')).toHaveLength(1)
    // The job is still in the list, as it was.
    expect(screen.getByRole("button", { name })).toBeInTheDocument()
  })

  it("places the job the API accepts and takes it out of the list", async () => {
    const onMove = vi.fn().mockResolvedValue({ ok: true, data: undefined })
    render(<ScheduleScreen data={data} today={TODAY} onMove={onMove} textDelaySeconds={0} />)
    const before = rows().length
    await userEvent.click(within(rows()[0]).getByRole("button", { name: /^Schedule / }))
    expect(await screen.findByText(/is scheduled with Ryan Garner/, {}, { timeout: 5000 })).toBeInTheDocument()
    expect(rows().length).toBe(before - 1)
  })
})

describe("ScheduleScreen views and New job from a day", () => {
  beforeEach(() => window.history.replaceState(null, "", "/admin/schedule"))
  afterEach(() => window.history.replaceState(null, "", "/admin"))

  const header = () => within(document.querySelector<HTMLElement>('[data-slot="page-header"]')!)
  const filled = (root: HTMLElement) => [...root.querySelectorAll("button")].filter((b) => !/border|ghost|underline/.test(b.className) && b.getAttribute("data-variant") !== "outline" && b.getAttribute("data-variant") !== "ghost")

  it("offers Week, Day and List as one choice, Week first", async () => {
    render(<ScheduleScreen data={data} today={TODAY} />)
    const group = screen.getByRole("radiogroup", { name: "Schedule view" })
    expect(within(group).getAllByRole("radio").map((r) => r.textContent)).toEqual(["Week", "Day", "List"])
    expect(within(group).getByRole("radio", { name: "Week" })).toBeChecked()
    expect(document.querySelector('[data-slot="week-grid"]')).not.toBeNull()
    expect(screen.queryByRole("tab")).toBeNull()
  })

  it("List is the old Visits grid: the same columns and filters, and a row opens the visit in the panel", async () => {
    render(<ScheduleScreen data={visitsData} today={VISITS_TODAY} visitActions={noActions} />)
    await userEvent.click(screen.getByRole("radio", { name: "List" }))
    const list = within(document.querySelector<HTMLElement>('[data-slot="visits-list"]')!)
    expect(list.getAllByRole("columnheader", { hidden: true }).map((h) => h.textContent)).toEqual(expect.arrayContaining(["Customer", "Town", "Service", "Day", "Time", "Who", "Status", "Money"]))
    expect(list.getByRole("searchbox", { hidden: true })).toHaveAttribute("placeholder", "Search by name or street")
    for (const name of ["Status", "Money", "Service", "Who", "Town"]) expect(list.getAllByRole("button", { name: new RegExp(`^${name}`), hidden: true }).length).toBeGreaterThan(0)
    expect(document.querySelector('[data-slot="week-grid"]')).toBeNull()
    await userEvent.click(list.getAllByRole("button", { name: visitRows(visitsData, VISITS_TODAY)[0]!.name })[0]!)
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(new URLSearchParams(window.location.search).get("visit")).toBeTruthy()
    expect(new URLSearchParams(window.location.search).get("view")).toBe("list")
  })

  it("opens on the List from ?view=list, with the filters it was linked with and one job's visits from ?forJob=", () => {
    const job = visitsData.visits.find((v) => v.jobId)!.jobId!
    render(<ScheduleScreen data={visitsData} today={VISITS_TODAY} defaultTab="list" forJob={job} defaultFilters={[{ column: "money", values: ["owed"] }]} />)
    expect(screen.getByRole("radio", { name: "List" })).toBeChecked()
    expect(screen.getByRole("link", { name: "Show all" })).toHaveAttribute("href", "/admin/schedule?view=list")
  })

  it("writes the view, the day and the week into the address, as a replace", async () => {
    const length = window.history.length
    render(<ScheduleScreen data={data} today={TODAY} />)
    expect(new URLSearchParams(window.location.search).get("week")).toBeTruthy()
    await userEvent.click(screen.getByRole("radio", { name: "Day" }))
    const day = new URLSearchParams(window.location.search)
    expect(day.get("view")).toBe("day")
    expect(day.get("day")).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(day.get("week")).toBeNull()
    await userEvent.click(screen.getByRole("radio", { name: "List" }))
    expect(window.location.search).toBe("?view=list")
    await userEvent.click(screen.getByRole("radio", { name: "Week" }))
    expect(new URLSearchParams(window.location.search).get("view")).toBeNull()
    expect(window.history.length).toBe(length)
  })

  it("has New job as the one filled button in the header, and nothing else beside it", () => {
    render(<ScheduleScreen data={data} today={TODAY} />)
    expect(header().getByRole("button", { name: "New job" })).toBeInTheDocument()
    expect(filled(document.querySelector<HTMLElement>('[data-slot="page-header"]')!).map((b) => b.textContent)).toEqual(["New job"])
  })

  it("the Day view's header has New job, which opens the sheet with that day at the top and filled in", async () => {
    render(<ScheduleScreen data={data} today={TODAY} visitActions={noActions} />)
    await userEvent.click(screen.getByRole("radio", { name: "Day" }))
    const day = new URLSearchParams(window.location.search).get("day")!
    const stepper = document.querySelector<HTMLElement>('[data-slot="schedule-day"]')!
    await userEvent.click(within(stepper).getByRole("button", { name: "New job" }))
    const sheet = within(await screen.findByRole("dialog"))
    expect(sheet.getByText(new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }))).toBeInTheDocument()
    await userEvent.selectOptions(sheet.getByLabelText("What are we doing?"), "repair")
    expect(sheet.getByRole("button", { name: `Day (optional), ${longDay(day)} at any time` })).toBeInTheDocument()
  })

  it("each week column has New job with its own day filled in, and a tech gets none", async () => {
    const { unmount } = render(<ScheduleScreen data={data} today={TODAY} visitActions={noActions} />)
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-slot="week-grid-new-job"]')]
    expect(buttons).toHaveLength(7)
    expect(buttons[2]).toHaveAccessibleName(/^New job on Wed \d+$/)
    await userEvent.click(buttons[2]!)
    const sheet = within(await screen.findByRole("dialog"))
    expect(sheet.getByText(/^Wednesday, /)).toBeInTheDocument()
    unmount()
    render(<ScheduleScreen data={data} today={TODAY} readOnly />)
    expect(document.querySelector('[data-slot="week-grid-new-job"]')).toBeNull()
  })
})

describe("ScheduleScreen Day view, stops per person", () => {
  beforeEach(() => window.history.replaceState(null, "", "/admin/schedule"))
  afterEach(() => window.history.replaceState(null, "", "/admin"))
  const section = (person: string) => document.querySelector<HTMLElement>(`[data-slot="day-person"][data-person="${person}"]`)!

  it("names the day shown in the subtitle, not the week", () => {
    render(<ScheduleScreen data={data} today={TODAY} defaultTab="day" defaultDay="2026-11-12" />)
    expect(screen.getByText("Thursday, Nov 12. 4 visits.")).toBeInTheDocument()
    expect(screen.queryByText(/^Week of/)).toBeNull()
  })

  it("lists each person's stops in order with their number and time, under the day's fill", () => {
    render(<ScheduleScreen data={data} today={TODAY} defaultTab="day" defaultDay="2026-11-12" />)
    expect(screen.getAllByRole("region", { name: /^(Ryan Garner|Tech Two)$/ })).toHaveLength(2)
    const ryan = within(section("person_truck-1"))
    expect(ryan.getByRole("heading", { name: /Ryan Garner/ })).toHaveTextContent("4 visits")
    expect(ryan.getAllByRole("listitem").map((li) => li.querySelector('[data-slot="stop-number"]')?.textContent)).toEqual(["Stop 1", "Stop 2", "Stop 3", "Stop 4"])
    expect(ryan.getByText("Percy", { exact: false })).toBeInTheDocument()
    expect(within(section("person_truck-2")).getByText("No visits.")).toBeInTheDocument()
    expect(document.querySelector('[data-slot="schedule-day-view"] [data-slot="day-fill"]')?.textContent).toMatch(/^4 visits, .* open\./)
    expect(document.querySelector('[data-slot="day-map"]')).not.toBeNull()
  })

  it("moves a stop dropped on another person's list to that person on this day, through the Move path", async () => {
    const onMove = vi.fn().mockResolvedValue({ ok: true, data: undefined })
    render(<ScheduleScreen data={data} today={TODAY} defaultTab="day" defaultDay="2026-11-12" onMove={onMove} />)
    const percy = within(section("person_truck-1")).getByRole("button", { name: /Percy/ })
    const id = data.visits.find((v) => v.clientName === "Percy" && v.startAt?.startsWith("2026-11-12"))!.id
    expect(percy).toHaveAttribute("draggable", "true")
    fireEvent.drop(section("person_truck-2"), { dataTransfer: { getData: () => id } })
    expect(onMove).toHaveBeenCalledWith(id, "person_truck-2", "2026-11-12")
    expect(await screen.findByText(/^Moved Percy to Thursday, November 12 with Tech Two\.$/)).toBeInTheDocument()
    expect(within(section("person_truck-2")).getByRole("button", { name: /Percy/ })).toBeInTheDocument()
  })

  it("refuses a drop on a person's day off, and a tech cannot drag at all", () => {
    const onMove = vi.fn()
    const { unmount } = render(<ScheduleScreen data={data} today={TODAY} defaultTab="day" defaultDay="2026-11-15" onMove={onMove} />)
    const id = data.visits.find((v) => v.startAt?.startsWith("2026-11-12"))!.id
    expect(within(section("person_truck-1")).getByText("Not a working day.")).toBeInTheDocument()
    fireEvent.drop(section("person_truck-1"), { dataTransfer: { getData: () => id } })
    expect(onMove).not.toHaveBeenCalled()
    unmount()
    render(<ScheduleScreen data={data} today={TODAY} defaultTab="day" defaultDay="2026-11-12" readOnly onMove={onMove} />)
    expect(within(section("person_truck-1")).getByRole("button", { name: /Percy/ })).not.toHaveAttribute("draggable", "true")
  })

  it("makes no call for a drop on the list the stop is already in", () => {
    const onMove = vi.fn().mockResolvedValue({ ok: true, data: undefined })
    render(<ScheduleScreen data={data} today={TODAY} defaultTab="day" defaultDay="2026-11-12" onMove={onMove} />)
    const id = data.visits.find((v) => v.clientName === "Percy" && v.startAt?.startsWith("2026-11-12"))!.id
    fireEvent.drop(section("person_truck-1"), { dataTransfer: { getData: () => id } })
    expect(onMove).not.toHaveBeenCalled()
    expect(screen.getByRole("status")).toHaveTextContent("Percy is already with Ryan Garner on Thursday, November 12.")
  })
})

describe("ScheduleScreen drag of a promised time", () => {
  beforeEach(() => window.history.replaceState(null, "", "/admin/schedule"))
  afterEach(() => window.history.replaceState(null, "", "/admin"))
  const section = (person: string) => document.querySelector<HTMLElement>(`[data-slot="day-person"][data-person="${person}"]`)!
  const percyId = data.visits.find((v) => v.clientName === "Percy" && v.startAt?.startsWith("2026-11-12"))!.id
  const withBooked = (timeBooked: boolean): AdminData => ({ ...data, visits: data.visits.map((v) => (v.id === percyId ? { ...v, timeBooked } : v)) })
  const actions = (): VisitActions => ({ move: vi.fn().mockResolvedValue({ ok: true, data: { day: "2026-11-12", personId: "person_truck-1", startTime: null, notified: true } }), putBack: vi.fn() } as unknown as VisitActions)

  it("opens the Move dialog for a visit with a booked time instead of moving it, names the person, and texts through the same split button", async () => {
    const onMove = vi.fn().mockResolvedValue({ ok: true, data: undefined })
    const a = actions()
    render(
      <UndoToastProvider>
        <ScheduleScreen data={withBooked(true)} today={TODAY} defaultTab="day" defaultDay="2026-11-12" onMove={onMove} visitActions={a} />
      </UndoToastProvider>,
    )
    fireEvent.drop(section("person_truck-2"), { dataTransfer: { getData: () => percyId } })
    // no silent move: no call, and the stop is still where it was
    expect(onMove).not.toHaveBeenCalled()
    expect(within(section("person_truck-1")).getByText("Percy", { exact: false })).toBeInTheDocument()
    const dialog = within(await screen.findByRole("dialog"))
    expect(dialog.getByText("With Tech Two.")).toBeInTheDocument()
    expect(dialog.getByRole("button", { name: /^Thursday, November 12/, pressed: true })).toBeInTheDocument()
    await userEvent.click(dialog.getByRole("button", { name: "More ways to move" }))
    expect(await screen.findByRole("menuitem", { name: "Move without texting" })).toHaveAttribute("aria-disabled", "true")
    await userEvent.keyboard("{Escape}")
    await userEvent.click(dialog.getByRole("button", { name: "Move and text the customer" }))
    await waitFor(() => expect(a.move).toHaveBeenCalledWith(percyId, "2026-11-12", null, { personId: "person_truck-2", notify: true }))
  })

  it("leaves the dialog without a call when it is dismissed", async () => {
    const onMove = vi.fn()
    render(
      <UndoToastProvider>
        <ScheduleScreen data={withBooked(true)} today={TODAY} defaultTab="day" defaultDay="2026-11-12" onMove={onMove} visitActions={actions()} />
      </UndoToastProvider>,
    )
    fireEvent.drop(section("person_truck-2"), { dataTransfer: { getData: () => percyId } })
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancel" }))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(onMove).not.toHaveBeenCalled()
  })

  it("moves a visit with no promised time as it always did, with no dialog", async () => {
    const onMove = vi.fn().mockResolvedValue({ ok: true, data: undefined })
    render(
      <UndoToastProvider>
        <ScheduleScreen data={withBooked(false)} today={TODAY} defaultTab="day" defaultDay="2026-11-12" onMove={onMove} visitActions={actions()} />
      </UndoToastProvider>,
    )
    fireEvent.drop(section("person_truck-2"), { dataTransfer: { getData: () => percyId } })
    expect(onMove).toHaveBeenCalledWith(percyId, "person_truck-2", "2026-11-12")
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("draws Waiting on customer on a week block and on a day stop", () => {
    const waiting: AdminData = { ...data, visits: data.visits.map((v) => (v.id === percyId ? { ...v, waiting: true } : v)) }
    const { unmount } = render(<ScheduleScreen data={waiting} today={TODAY} />)
    expect(within(cell("person_truck-1", "2026-11-12")).getByText("Waiting on customer")).toBeInTheDocument()
    unmount()
    render(<ScheduleScreen data={waiting} today={TODAY} defaultTab="day" defaultDay="2026-11-12" />)
    expect(within(section("person_truck-1")).getByText("Waiting on customer")).toBeInTheDocument()
  })
})

describe("ScheduleScreen placements that are still inside their minute", () => {
  beforeEach(() => window.history.replaceState(null, "", "/admin/schedule"))
  const una = { id: "u1", clientId: "c-u", clientName: "Una Hall", town: "Erie" as const, kind: "repair" as const, status: "unscheduled" as const, isPass: false, jobberUrl: "", jobId: "j-u1" }
  const one: AdminData = { ...data, passes: [], visits: [una] }

  it("takes no drag of a job waiting to be texted, so it is never moved twice", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onMove = vi.fn().mockResolvedValue({ ok: true, data: undefined })
      render(<ScheduleScreen data={one} today={TODAY} defaultWeek="2026-11-09" onMove={onMove} />)
      await userEvent.click(screen.getByRole("button", { name: /^Schedule Una Hall/ }))
      await screen.findByText(/^Texting Una in/)
      expect(percyLike(cell("person_truck-1", "2026-11-13"))).toBeInTheDocument()
      fireEvent.drop(cell("person_truck-2", "2026-11-13"), { dataTransfer: { getData: () => "u1" } })
      expect(onMove).not.toHaveBeenCalled()
      expect(screen.getByText("That job is waiting to be texted. Undo it, or wait for the minute to pass.")).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it("leaves a job alone at the minute when it got a day meanwhile", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onMove = vi.fn().mockResolvedValue({ ok: true, data: undefined })
      const { rerender } = render(<ScheduleScreen data={one} today={TODAY} defaultWeek="2026-11-09" onMove={onMove} />)
      await userEvent.click(screen.getByRole("button", { name: /^Schedule Una Hall/ }))
      rerender(<ScheduleScreen data={{ ...one, visits: [{ ...una, status: "scheduled" as const, startAt: "2026-11-17T16:00:00Z", scheduledOn: "2026-11-17", personId: "person_truck-2", personName: "Tech Two" }] }} today={TODAY} defaultWeek="2026-11-09" onMove={onMove} />)
      await vi.advanceTimersByTimeAsync(60_000)
      expect(onMove).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})

const percyLike = (el: HTMLElement) => within(el).getByRole("button", { name: /Una/ })
