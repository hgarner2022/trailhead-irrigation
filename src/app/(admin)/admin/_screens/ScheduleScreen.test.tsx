import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { weekOf } from "@/lib/admin/calendar"
import { ScheduleScreen } from "./ScheduleScreen"

const data = snapshot as AdminData
const TODAY = "2026-11-12T19:56:30Z"

// Radix Select leans on pointer capture and scrollIntoView, which jsdom lacks.
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => undefined
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.scrollIntoView ??= () => undefined
  vi.spyOn(console, "info").mockImplementation(() => undefined)
})

const cell = (truck: string, day: string) => document.querySelector<HTMLElement>(`[data-slot="week-grid-cell"][data-truck="${truck}"][data-day="${day}"]`)!
const percy = (el: HTMLElement) => within(el).getByRole("button", { name: /^Percy/ })

async function pick(user: ReturnType<typeof userEvent.setup>, trigger: string, option: string) {
  await user.click(screen.getByRole("combobox", { name: trigger }))
  await user.click(await screen.findByRole("option", { name: option }))
}

describe("ScheduleScreen move control", () => {
  it("shows nothing until a visit is selected", () => {
    render(<ScheduleScreen data={data} today={TODAY} />)
    expect(screen.queryByRole("region", { name: "Move the selected visit" })).toBeNull()
    expect(screen.getByRole("status")).toHaveTextContent("")
  })

  it("moves the selected visit to another truck and day and says so", async () => {
    const user = userEvent.setup()
    render(<ScheduleScreen data={data} today={TODAY} />)
    await user.click(percy(cell("truck-1", "2026-11-12")))
    const control = screen.getByRole("region", { name: "Move the selected visit" })
    expect(control).toHaveTextContent("Move Percy, blowout")
    await pick(user, "Move to truck", "Truck 2")
    await pick(user, "Move to day", "Fri 13")
    await user.click(within(control).getByRole("button", { name: "Move" }))
    expect(screen.getByRole("status")).toHaveTextContent("Moved Percy to Truck 2 on Friday, November 13.")
    expect(percy(cell("truck-2", "2026-11-13"))).toBeInTheDocument()
  })

  it("announces why a move to a day the truck does not work is refused", async () => {
    const user = userEvent.setup()
    render(<ScheduleScreen data={data} today={TODAY} />)
    await user.click(percy(cell("truck-1", "2026-11-12")))
    await pick(user, "Move to day", "Sun 15")
    await user.click(screen.getByRole("button", { name: "Move" }))
    expect(screen.getByRole("status")).toHaveTextContent("Truck 1 does not work Sunday, so Percy stays on Thursday, November 12.")
    expect(percy(cell("truck-1", "2026-11-12"))).toBeInTheDocument()
  })
})

describe("ScheduleScreen Schedule", () => {
  it("schedules every visit in the Needs a day list, counting the same list, and says so", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined)
    render(<ScheduleScreen data={data} today={TODAY} />)
    const rows = within(document.querySelector<HTMLElement>('[data-slot="to-schedule-tray"]')!).getAllByRole("listitem")
    const button = screen.getByRole("button", { name: /^Schedule \d+ visits$/ })
    expect(button).toHaveTextContent(`Schedule ${rows.length} visits`)
    expect(screen.getByRole("heading", { name: `Needs a day (${rows.length})` })).toBeInTheDocument()
    await userEvent.click(button)
    expect(info).toHaveBeenCalledWith("schedule", "2026-11-09", expect.any(Array))
    expect(screen.getByRole("status")).toHaveTextContent(`${rows.length} visits scheduled on the week of November 9. The customers get their dates.`)
    expect(screen.getByRole("button", { name: "Schedule" })).toBeDisabled()
  })
})

describe("ScheduleScreen with actions", () => {
  it("snaps the block back and says the API's words when a move is refused", async () => {
    const user = userEvent.setup()
    const onMove = vi.fn().mockResolvedValue({ ok: false, message: "Truck 2 is full of blowout visits on 2026-11-13" })
    render(<ScheduleScreen data={data} today={TODAY} onMove={onMove} />)
    await user.click(percy(cell("truck-1", "2026-11-12")))
    await pick(user, "Move to truck", "Truck 2")
    await pick(user, "Move to day", "Fri 13")
    await user.click(screen.getByRole("button", { name: "Move" }))
    expect(onMove).toHaveBeenCalledWith(expect.any(String), "truck-2", "2026-11-13")
    expect(await screen.findByText("Truck 2 is full of blowout visits on 2026-11-13", {}, { timeout: 5000 })).toBeInTheDocument()
    expect(percy(cell("truck-1", "2026-11-12"))).toBeInTheDocument()
  })

  it("keeps the block where it went when the move is accepted", async () => {
    const user = userEvent.setup()
    const onMove = vi.fn().mockResolvedValue({ ok: true, data: undefined })
    render(<ScheduleScreen data={data} today={TODAY} onMove={onMove} />)
    await user.click(percy(cell("truck-1", "2026-11-12")))
    await pick(user, "Move to truck", "Truck 2")
    await pick(user, "Move to day", "Fri 13")
    await user.click(screen.getByRole("button", { name: "Move" }))
    expect(await screen.findByText("Moved Percy to Truck 2 on Friday, November 13.", {}, { timeout: 5000 })).toBeInTheDocument()
    expect(percy(cell("truck-2", "2026-11-13"))).toBeInTheDocument()
  })

  it("runs the scheduler once per window in the tray and adds up what it placed", async () => {
    const onSchedule = vi.fn().mockResolvedValue({ ok: true, data: { placed: 2, unplaced: 1 } })
    render(<ScheduleScreen data={data} today={TODAY} onSchedule={onSchedule} />)
    await userEvent.click(screen.getByRole("button", { name: /^Schedule \d+ visits$/ }))
    const windows = onSchedule.mock.calls.map((c) => c[0])
    expect(new Set(windows).size).toBe(windows.length)
    expect(windows.every((w) => ["turn-on", "inspection", "blowout"].includes(w))).toBe(true)
    expect(await screen.findByText(/visits? scheduled\. The customers get their dates\. \d+ couldn't be placed\. Home lists them\./, {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it("shows a tech no Schedule, Place or Move controls", async () => {
    render(<ScheduleScreen data={data} today={TODAY} readOnly onMove={vi.fn()} />)
    expect(screen.queryByRole("button", { name: /^Schedule/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /^Place / })).toBeNull()
    await userEvent.click(percy(cell("truck-1", "2026-11-12")))
    expect(screen.queryByRole("region", { name: "Move the selected visit" })).toBeNull()
  })
})

// The owner's words, 13 Nov 2026: the Schedule opened on an empty November week, over a tray of 32 rows that held
// visits with a day and visits of unpaid passes, and a sentence about the window leaked onto the page.
describe("ScheduleScreen opens on the work", () => {
  // The calendar holds only jobs in the spring: the first is the week of April 26, 2027.
  const spring = { ...data, visits: data.visits.slice(0, 1).map((v) => ({ ...v, id: "spring", startAt: "2027-04-27T15:00:00Z", status: "scheduled" as const, truckId: "truck-1", stopOrder: 1 })) }

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

describe("ScheduleScreen's Needs a day list", () => {
  const rows = () => within(document.querySelector<HTMLElement>('[data-slot="to-schedule-tray"]')!).getAllByRole("listitem")
  const pending = data.passes.find((p) => p.status === "pending")!

  it("lists only jobs with no day, for active passes, worded Needs a day, with Place on each", () => {
    render(<ScheduleScreen data={data} today={TODAY} />)
    expect(screen.getByRole("heading", { name: /^Needs a day \(\d+\)$/ })).toBeInTheDocument()
    expect(screen.queryByText(/To schedule/)).toBeNull()
    for (const row of rows()) expect(within(row).getByRole("button", { name: /^Place / })).toBeInTheDocument()
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

  it("counts the same list on the Schedule button as it lists", () => {
    render(<ScheduleScreen data={data} today={TODAY} />)
    expect(screen.getByRole("button", { name: `Schedule ${rows().length} visits` })).toBeInTheDocument()
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
    const onMove = vi.fn().mockResolvedValue({ ok: false, message: "A turn-on visit must land between 2027-04-26 and 2027-05-31" })
    render(<ScheduleScreen data={data} today={TODAY} onMove={onMove} />)
    const name = within(rows()[0]).getByRole("button", { name: /^Place / }).getAttribute("aria-label")!
    await userEvent.click(within(rows()[0]).getByRole("button", { name: /^Place / }))
    const problem = await within(document.querySelector<HTMLElement>('[data-slot="to-schedule-tray"]')!).findByRole("alert", {}, { timeout: 5000 })
    expect(problem).toHaveTextContent("A turn-on visit must land between 2027-04-26 and 2027-05-31")
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
    render(<ScheduleScreen data={data} today={TODAY} onMove={onMove} />)
    const before = rows().length
    await userEvent.click(within(rows()[0]).getByRole("button", { name: /^Place / }))
    expect(await screen.findByText(/is scheduled on Truck 1/, {}, { timeout: 5000 })).toBeInTheDocument()
    expect(rows().length).toBe(before - 1)
  })
})
