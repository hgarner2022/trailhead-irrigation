import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SaveBar } from "./SaveBar"

describe("SaveBar", () => {
  it("draws nothing when nothing changed and nothing was said", () => {
    const { container } = render(<SaveBar count={0} onSave={vi.fn()} onDiscard={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("counts the changes and calls Save and Discard", async () => {
    const onSave = vi.fn()
    const onDiscard = vi.fn()
    render(<SaveBar count={3} onSave={onSave} onDiscard={onDiscard} />)
    expect(screen.getByRole("status")).toHaveTextContent("3 unsaved changes")
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    await userEvent.click(screen.getByRole("button", { name: "Discard" }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onDiscard).toHaveBeenCalledTimes(1)
  })

  it("says one change in the singular", () => {
    render(<SaveBar count={1} onSave={vi.fn()} onDiscard={vi.fn()} />)
    expect(screen.getByRole("status")).toHaveTextContent("1 unsaved change")
    expect(screen.getByRole("status")).not.toHaveTextContent("changes")
  })

  it("lists the problems and turns Save off while there are any, or while saving", () => {
    const { rerender } = render(<SaveBar count={1} problems={["Give every person a name before saving."]} onSave={vi.fn()} onDiscard={vi.fn()} />)
    expect(screen.getByText("Give every person a name before saving.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
    rerender(<SaveBar count={1} pending onSave={vi.fn()} onDiscard={vi.fn()} />)
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
  })

  it("shows the outcome with no buttons once the changes are saved, and a refusal beside the count", () => {
    const { rerender } = render(<SaveBar count={0} message="Saved just now" onSave={vi.fn()} onDiscard={vi.fn()} />)
    expect(screen.getByRole("status")).toHaveTextContent("Saved just now")
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull()
    rerender(<SaveBar count={2} message="Keep at least one owner." failed onSave={vi.fn()} onDiscard={vi.fn()} />)
    expect(screen.getByRole("status")).toHaveTextContent("2 unsaved changes Keep at least one owner.")
  })

  it("asks before the page is left with changes waiting, and not otherwise", () => {
    const { rerender } = render(<SaveBar count={1} onSave={vi.fn()} onDiscard={vi.fn()} />)
    const leave = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(leave)
    expect(leave.defaultPrevented).toBe(true)
    rerender(<SaveBar count={0} onSave={vi.fn()} onDiscard={vi.fn()} />)
    const stay = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(stay)
    expect(stay.defaultPrevented).toBe(false)
  })
})
