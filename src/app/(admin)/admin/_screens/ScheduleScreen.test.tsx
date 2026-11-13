import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
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
  it("schedules every tray visit that is not waiting for its customer, and says so", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined)
    render(<ScheduleScreen data={data} today={TODAY} />)
    const button = screen.getByRole("button", { name: /^Schedule \d+ visits$/ })
    expect(button).toBeEnabled()
    await userEvent.click(button)
    expect(info).toHaveBeenCalledWith("schedule", "2026-11-09", expect.any(Array))
    expect(screen.getByRole("status")).toHaveTextContent(/visits scheduled on the week of November 9\. The customers get their dates\. \d+ customers pick their own days and stay in the list\./)
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
