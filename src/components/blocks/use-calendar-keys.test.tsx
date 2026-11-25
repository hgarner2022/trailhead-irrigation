import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useCalendarKeys } from "./use-calendar-keys"

function Probe(p: { actions: Parameters<typeof useCalendarKeys>[0] }) {
  const { helpOpen } = useCalendarKeys(p.actions)
  return <div><input aria-label="box" /><span>{helpOpen ? "help" : "closed"}</span></div>
}

describe("useCalendarKeys", () => {
  it("switches view, goes to today and steps", () => {
    const a = { onView: vi.fn(), onToday: vi.fn(), onNext: vi.fn(), onPrev: vi.fn() }
    render(<Probe actions={a} />)
    for (const k of ["d", "w", "m", "t", "j", "n", "k", "p"]) fireEvent.keyDown(window, { key: k })
    expect(a.onView.mock.calls.map((c) => c[0])).toEqual(["day", "week", "month"])
    expect(a.onToday).toHaveBeenCalledTimes(1)
    expect(a.onNext).toHaveBeenCalledTimes(2)
    expect(a.onPrev).toHaveBeenCalledTimes(2)
  })
  it("opens and closes the list with ?", () => {
    render(<Probe actions={{}} />)
    fireEvent.keyDown(window, { key: "?" })
    expect(screen.getByText("help")).toBeTruthy()
    fireEvent.keyDown(window, { key: "?" })
    expect(screen.getByText("closed")).toBeTruthy()
  })
  it("ignores typing in a field and Cmd or Ctrl chords", () => {
    const a = { onView: vi.fn() }
    render(<Probe actions={a} />)
    fireEvent.keyDown(screen.getByLabelText("box"), { key: "d" })
    fireEvent.keyDown(window, { key: "d", metaKey: true })
    fireEvent.keyDown(window, { key: "d", ctrlKey: true })
    expect(a.onView).not.toHaveBeenCalled()
  })
})
