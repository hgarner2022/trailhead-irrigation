import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { TrayItem } from "@/app/(admin)/admin/_screens/schedule-model"
import { ToScheduleTray } from "./ToScheduleTray"

const item = (id: string, over: Partial<TrayItem> = {}): TrayItem => ({ id, clientId: id, clientName: `Customer ${id}`, town: "Erie", kind: "repair", window: "", sortKey: "0", ...over })

describe("ToScheduleTray", () => {
  it("says every job has a day when the list is empty, and draws no Schedule all", () => {
    render(<ToScheduleTray items={[]} onPlaceAll={() => {}} />)
    expect(screen.getByText("Every job has a day.")).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("Place on a row places that job, and a quiet Schedule all counts the jobs a customer is not picking", async () => {
    const onPlace = vi.fn()
    const onPlaceAll = vi.fn()
    const items = [item("a"), item("b"), item("w", { awaitingPick: true })]
    render(<ToScheduleTray items={items} onPlace={onPlace} onPlaceAll={onPlaceAll} />)
    await userEvent.click(screen.getByRole("button", { name: "Schedule Customer b, repair" }))
    expect(onPlace).toHaveBeenCalledWith(items[1])
    await userEvent.click(screen.getByRole("button", { name: "Schedule all 2" }))
    expect(onPlaceAll).toHaveBeenCalledOnce()
    // Schedule all is an outline button, not a text link
    expect(screen.getByRole("button", { name: "Schedule all 2" })).toHaveClass("border", "border-border")
    expect(screen.getByText("Customer picks the day")).toBeInTheDocument()
  })

  it("shows no Schedule or Schedule all to a tech", () => {
    render(<ToScheduleTray items={[item("a")]} onPlace={() => {}} onPlaceAll={() => {}} readOnly />)
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("says why a job has no day, with Another day, under that row only", async () => {
    const onAnotherDay = vi.fn()
    const items = [item("a"), item("b")]
    render(<ToScheduleTray items={items} noRoom={{ b: "No open day before May 31. Pick a day yourself." }} onAnotherDay={onAnotherDay} />)
    const rows = screen.getAllByRole("listitem")
    expect(within(rows[0]!).queryByText(/No open day/)).toBeNull()
    expect(within(rows[1]!).getByText("No open day before May 31. Pick a day yourself.")).toBeInTheDocument()
    await userEvent.click(within(rows[1]!).getByRole("button", { name: "Another day" }))
    expect(onAnotherDay).toHaveBeenCalledWith(items[1])
  })

  it("shows a refused Place's sentence in the API's words", () => {
    render(<ToScheduleTray items={[item("a")]} problems={{ a: "Ryan Garner is full of repair visits on 2026-11-13" }} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Ryan Garner is full of repair visits on 2026-11-13")
  })
})
