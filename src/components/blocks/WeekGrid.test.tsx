import { describe, it, expect, vi, beforeAll } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { TIME_ZONE } from "@/lib/admin/format"
import { WeekGrid, type WeekGridProps } from "./WeekGrid"

const data = snapshot as AdminData
const TODAY = "2026-11-12"
const WEEK = "2026-11-09"

// jsdom has none of these; the Radix select reads them.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.scrollIntoView = () => {}
})

const base: WeekGridProps = {
  trucks: data.settings.trucks,
  areas: data.settings.areas,
  visits: data.visits,
  weekStart: WEEK,
  today: TODAY,
  timeZone: TIME_ZONE,
  onSelect: () => {},
  onMove: () => {},
  onWeekChange: () => {},
}
const table = () => screen.getByRole("table")
const cell = (truck: string, day: string) => document.querySelector<HTMLElement>(`[data-slot="week-grid-cell"][data-truck="${truck}"][data-day="${day}"]`) as HTMLElement
const blocksIn = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLElement>('[data-slot="week-grid-visit"]'))

describe("WeekGrid", () => {
  it("lays the week out with a row per truck, the seven days across and today marked", () => {
    render(<WeekGrid {...base} />)
    const headers = within(table()).getAllByRole("columnheader").map((h) => h.textContent)
    expect(headers).toEqual(["Truck", "Mon 9", "Tue 10", "Wed 11", "Thu 12, today", "Fri 13", "Sat 14", "Sun 15"])
    expect(within(table()).getByRole("columnheader", { name: /Thu 12/ })).toHaveAttribute("aria-current", "date")
    expect(within(table()).getAllByRole("rowheader").map((h) => h.textContent)).toEqual(["Truck 1", "Truck 2"])
    expect(blocksIn(cell("truck-1", "2026-11-09"))).toHaveLength(5)
    expect(blocksIn(cell("truck-1", "2026-11-13")).map((b) => b.textContent)).toEqual([
      "DavidFirestone · blowout, proposed",
      "RickyFirestone · blowout, proposed",
      "JoelLafayette · blowout, proposed",
      "BrianErie · blowout, proposed",
    ])
    expect(blocksIn(cell("truck-2", "2026-11-13"))).toHaveLength(0)
  })

  it("colours a block by its area, dashes a proposal and marks a Jobber move", () => {
    render(<WeekGrid {...base} />)
    const [josh] = blocksIn(cell("truck-1", "2026-11-10")) // Broomfield, moved in Jobber
    expect(josh).toHaveClass("border-l-positive")
    expect(josh).not.toHaveClass("border-dashed")
    expect(josh).toHaveTextContent("moved in Jobber")
    expect(josh.querySelector("svg")).not.toBeNull()
    const [percy] = blocksIn(cell("truck-1", "2026-11-12")) // Erie, proposed
    expect(percy).toHaveClass("border-l-primary", "border-dashed", "bg-stone")
    expect(percy).toHaveAttribute("data-proposed", "true")
    const [john] = blocksIn(cell("truck-1", "2026-11-09")) // Lafayette
    expect(john).toHaveClass("border-l-positive")
  })

  it("shades the days a truck does not work and names them for a reader", () => {
    render(<WeekGrid {...base} />)
    expect(cell("truck-1", "2026-11-14")).toHaveClass("bg-stone")
    expect(cell("truck-1", "2026-11-14")).toHaveTextContent("Not a working day")
    expect(cell("truck-2", "2026-11-14")).not.toHaveClass("bg-stone")
    expect(cell("truck-2", "2026-11-15")).toHaveClass("bg-stone")
  })

  it("selects a block on click and reports it, pressed", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const { rerender } = render(<WeekGrid {...base} onSelect={onSelect} />)
    const [percy] = blocksIn(cell("truck-1", "2026-11-12"))
    expect(percy).toHaveAttribute("aria-pressed", "false")
    await user.click(percy)
    expect(onSelect).toHaveBeenCalledWith("v477")
    rerender(<WeekGrid {...base} onSelect={onSelect} selectedId="v477" />)
    expect(blocksIn(cell("truck-1", "2026-11-12"))[0]).toHaveAttribute("aria-pressed", "true")
    await user.click(blocksIn(cell("truck-1", "2026-11-12"))[0])
    expect(onSelect).toHaveBeenLastCalledWith(undefined)
  })

  it("moves a dragged block onto a working cell and refuses a day off", () => {
    const onMove = vi.fn()
    render(<WeekGrid {...base} onMove={onMove} />)
    const [percy] = blocksIn(cell("truck-1", "2026-11-12"))
    const store: Record<string, string> = {}
    const dataTransfer = { setData: (k: string, v: string) => { store[k] = v }, getData: (k: string) => store[k], effectAllowed: "" }
    fireEvent.dragStart(percy, { dataTransfer })
    const friday = cell("truck-2", "2026-11-14")
    fireEvent.dragOver(friday, { dataTransfer })
    fireEvent.drop(friday, { dataTransfer })
    expect(onMove).toHaveBeenCalledWith("v477", "truck-2", "2026-11-14")
    fireEvent.drop(cell("truck-1", "2026-11-14"), { dataTransfer })
    expect(onMove).toHaveBeenCalledTimes(1)
  })

  it("steps the week and jumps to today's week", async () => {
    const user = userEvent.setup()
    const onWeekChange = vi.fn()
    render(<WeekGrid {...base} weekStart="2026-10-05" onWeekChange={onWeekChange} />)
    const [prev, today, next] = screen.getAllByRole("button", { name: /Previous week|^Today$|Next week/ })
    await user.click(next)
    expect(onWeekChange).toHaveBeenCalledWith("2026-10-12")
    await user.click(prev)
    expect(onWeekChange).toHaveBeenCalledWith("2026-09-28")
    await user.click(today)
    expect(onWeekChange).toHaveBeenCalledWith(WEEK)
  })

  it("filters by truck and by area", async () => {
    const user = userEvent.setup()
    render(<WeekGrid {...base} />)
    const [truck, area] = screen.getAllByRole("combobox", { name: /Truck|Area/ })
    await user.click(truck)
    await user.click(screen.getByRole("option", { name: "Truck 2" }))
    expect(within(table()).getAllByRole("rowheader").map((h) => h.textContent)).toEqual(["Truck 2"])
    await user.click(truck)
    await user.click(screen.getByRole("option", { name: "All trucks" }))
    await user.click(area)
    await user.click(screen.getByRole("option", { name: "Longmont" }))
    expect(blocksIn(table())).toHaveLength(0)
    await user.click(area)
    await user.click(screen.getByRole("option", { name: "Erie and Firestone" }))
    expect(blocksIn(cell("truck-1", "2026-11-09"))).toHaveLength(4)
  })

  it("renders the phone's day view beside the table, on today, with the trucks stacked", async () => {
    const user = userEvent.setup()
    const onWeekChange = vi.fn()
    render(<WeekGrid {...base} onWeekChange={onWeekChange} />)
    const day = document.querySelector<HTMLElement>('[data-slot="week-grid-day"]') as HTMLElement
    expect(within(day).getByRole("heading", { level: 2 })).toHaveTextContent("Thu 12 · today")
    expect(within(day).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Truck 1", "Truck 2"])
    expect(blocksIn(day)).toHaveLength(4)
    expect(blocksIn(day)[0]).not.toHaveAttribute("draggable", "true")
    await user.click(within(day).getByRole("button", { name: "Next day" }))
    expect(within(day).getByRole("heading", { level: 2 })).toHaveTextContent("Fri 13")
    expect(onWeekChange).not.toHaveBeenCalled()
    await user.click(within(day).getByRole("button", { name: "Next day" }))
    await user.click(within(day).getByRole("button", { name: "Next day" }))
    await user.click(within(day).getByRole("button", { name: "Next day" }))
    expect(onWeekChange).toHaveBeenCalledWith("2026-11-16")
  })

  it("lists the legend and shows the empty state with no trucks", () => {
    const { unmount } = render(<WeekGrid {...base} />)
    const legend = document.querySelector('[data-slot="week-grid-legend"]')
    expect(legend).toHaveTextContent("Erie and Firestone")
    expect(legend).toHaveTextContent("Proposed, waiting for approval")
    expect(legend).toHaveTextContent("Moved in Jobber")
    unmount()
    render(<WeekGrid {...base} trucks={[]} />)
    expect(screen.queryByRole("table")).toBeNull()
    expect(document.querySelector('[data-slot="empty-state"]')).toHaveTextContent("No trucks yet")
  })
})
