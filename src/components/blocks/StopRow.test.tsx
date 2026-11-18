import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { StopRow } from "./StopRow"

const base = { id: "v1", number: 2, time: "9:00 am", name: "Mia Reyes", town: "Erie", service: "Spring turn-on", areaIndex: 0, onOpen: () => {} }
const row = () => document.querySelector<HTMLElement>('[data-slot="stop-row"]')!

describe("StopRow", () => {
  it("shows its place in the route, its time, the customer, the town and the service", () => {
    render(<ul><StopRow {...base} /></ul>)
    expect(document.querySelector('[data-slot="stop-number"]')).toHaveTextContent("Stop 2")
    expect(document.querySelector('[data-slot="stop-time"]')).toHaveTextContent("9:00 am")
    expect(screen.getByRole("button")).toHaveTextContent("Mia Reyes · ErieSpring turn-on")
    expect(row()).toHaveClass("border-l-primary")
  })

  it("reads Any time for a stop with no time and locks a booked one", () => {
    const { rerender } = render(<ul><StopRow {...base} time="Any time" /></ul>)
    expect(document.querySelector('[data-slot="stop-time"]')).toHaveTextContent("Any time")
    expect(document.querySelector("svg")).toBeNull()
    rerender(<ul><StopRow {...base} booked /></ul>)
    expect(document.querySelector('[data-slot="stop-time"]')).toHaveTextContent("9:00 am, booked time")
    expect(document.querySelector('[data-slot="stop-time"] svg')).not.toBeNull()
  })

  it("marks a moved stop and a selected one", () => {
    render(<ul><StopRow {...base} moved selected /></ul>)
    expect(screen.getByRole("button")).toHaveTextContent(", moved")
    expect(row()).toHaveClass("ring-primary/50")
  })

  it("opens the visit on a press, and carries its id when dragged", async () => {
    const onOpen = vi.fn()
    render(<ul><StopRow {...base} onOpen={onOpen} draggable /></ul>)
    await userEvent.click(screen.getByRole("button"))
    expect(onOpen).toHaveBeenCalledWith("v1")
    const data = new Map<string, string>()
    fireEvent.dragStart(screen.getByRole("button"), { dataTransfer: { setData: (k: string, v: string) => data.set(k, v), effectAllowed: "" } })
    expect(data.get("text/plain")).toBe("v1")
    expect(screen.getByRole("button")).toHaveAttribute("draggable", "true")
  })

  it("is not draggable where the week is only read", () => {
    render(<ul><StopRow {...base} /></ul>)
    expect(screen.getByRole("button")).not.toHaveAttribute("draggable", "true")
  })
})
