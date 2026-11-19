import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { FlowShell } from "./FlowShell"

describe("FlowShell", () => {
  it("shows the question, the step count and Call Ryan, and goes back and on", async () => {
    const onBack = vi.fn()
    const onNext = vi.fn()
    render(<FlowShell question="Where is the yard?" step={3} total={6} onBack={onBack} onNext={onNext}>body</FlowShell>)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Where is the yard?")
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Step 3 of 6")
    expect(screen.getByRole("link", { name: /Call Ryan/ })).toHaveAttribute("href", "tel:9706927270")
    await userEvent.click(screen.getByRole("button", { name: "Back" }))
    await userEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(onBack).toHaveBeenCalledOnce()
    expect(onNext).toHaveBeenCalledOnce()
  })
  it("turns Continue off with a hint, and has no Back on the first step or buttons when done", () => {
    const { rerender } = render(<FlowShell question="Pick your day" step={1} total={6} nextDisabled hint="Tap a start time to continue.">body</FlowShell>)
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled()
    expect(screen.getAllByText("Tap a start time to continue.").length).toBeGreaterThan(0)
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull()
    rerender(<FlowShell question="Booked" step={6} total={6} done>body</FlowShell>)
    expect(screen.queryByRole("button")).toBeNull()
  })
})
