import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DayHeader } from "./DayHeader"

const base = { label: "Tue 24", day: "2026-11-24", fill: "5 visits, 3 h open", towns: "Erie 3, Lafayette 2" }

describe("DayHeader", () => {
  it("names the day, how full it is and the towns already in it", () => {
    render(<DayHeader {...base} />)
    expect(screen.getByText("Tue 24")).toBeInTheDocument()
    expect(document.querySelector('[data-slot="day-fill"]')).toHaveTextContent("5 visits, 3 h open")
    expect(document.querySelector('[data-slot="day-towns"]')).toHaveTextContent("Erie 3, Lafayette 2")
  })

  it("marks today for a reader and leaves the towns line off an empty day", () => {
    render(<DayHeader {...base} today towns="" fill="No visits" />)
    expect(screen.getByText(", today")).toHaveClass("sr-only")
    expect(document.querySelector('[data-slot="day-towns"]')).toBeNull()
  })

  it("opens New job on its day, and has no button where the week is only read", async () => {
    const onNewJob = vi.fn()
    const { rerender } = render(<DayHeader {...base} onNewJob={onNewJob} />)
    await userEvent.click(screen.getByRole("button", { name: "New job on Tue 24" }))
    expect(onNewJob).toHaveBeenCalledWith("2026-11-24")
    rerender(<DayHeader {...base} />)
    expect(screen.queryByRole("button")).toBeNull()
  })
})
