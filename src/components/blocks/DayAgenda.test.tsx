import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { DayAgenda, agendaItems } from "./DayAgenda"
import type { GridBlock } from "./time-grid-model"

const b = (id: string, title: string, start: number | null, personId = "p1", extra: Partial<GridBlock> = {}): GridBlock => ({ id, day: "2026-11-18", personId, start, minutes: 60, title, name: "Mia", kind: "repair", town: "Erie", service: "Repair", ...extra })
const people = [{ id: "p1", name: "Ryan Garner", first: "Ryan", colour: 0 }]

describe("DayAgenda", () => {
  it("lists Any time visits first, numbered, then the timed visits in order", () => {
    const rows = agendaItems([b("c", "Cedar St", 600), b("a", "Aspen Dr", null), b("d", "Dale Rd", 540)], [], "p1", "2026-11-18")
    expect(rows.map((r) => (r.kind === "visit" ? r.block.title : "off"))).toEqual(["Aspen Dr", "Dale Rd", "Cedar St"])
    expect(rows[0]).toMatchObject({ number: 1 })
  })
  it("draws the drive between rows, time off as a row and the now line", () => {
    render(<DayAgenda day="2026-11-18" people={people} blocks={[b("a", "Aspen Dr", 540), b("c", "Cedar St", 660)]} timeOff={[{ id: "o1", personId: "p1", day: "2026-11-18", start: 780, end: 840 }]} drives={new Map([["c", 12]])} now={{ day: "2026-11-18", minutes: 600 }} />)
    expect(screen.getByText("12 min drive")).toBeInTheDocument()
    expect(screen.getByText(/Ryan off/)).toBeInTheDocument()
    expect(document.querySelector('[data-slot="now-line"]')).not.toBeNull()
  })
  it("names each person only when two or more are shown, and opens a visit from its row", async () => {
    const onSelect = vi.fn()
    const { rerender } = render(<DayAgenda day="2026-11-18" people={people} blocks={[b("a", "Aspen Dr", 540)]} onSelect={onSelect} />)
    expect(document.querySelector('[data-slot="agenda-person"]')).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: /^Aspen Dr/ }))
    expect(onSelect).toHaveBeenCalledWith("a")
    rerender(<DayAgenda day="2026-11-18" people={[...people, { id: "p2", name: "Hannah Garner", first: "Hannah", colour: 1 }]} blocks={[b("a", "Aspen Dr", 540), b("h", "Hill Rd", 540, "p2")]} stats={{ p2: { open: "5 h open", driving: "1 h" } }} />)
    expect(within(screen.getByRole("region", { name: "Hannah Garner" })).getByText("5 h open, 1 h driving")).toBeInTheDocument()
  })
})
