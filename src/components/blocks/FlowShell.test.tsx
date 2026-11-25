import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { FlowShell } from "./FlowShell"

describe("FlowShell", () => {
  it("shows the question, the step count and a Close, and goes back and on", async () => {
    const onBack = vi.fn()
    const onNext = vi.fn()
    render(<FlowShell question="Where is the yard?" step={3} total={6} onBack={onBack} onNext={onNext}>body</FlowShell>)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Where is the yard?")
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Step 3 of 6")
    expect(screen.getByRole("link", { name: /back to the website/ })).toHaveAttribute("href", "/")
    expect(screen.getByRole("link", { name: "Close the booking form" })).toHaveAttribute("href", "/")
    expect(screen.queryByText(/Call Ryan/)).toBeNull()
    expect(screen.getByText("Step 3 of 6")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Back" }))
    await userEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(onBack).toHaveBeenCalledOnce()
    expect(onNext).toHaveBeenCalledOnce()
  })
  it("makes Close a button that asks first when the flow gives it onClose", async () => {
    const onClose = vi.fn()
    render(<FlowShell question="Q" step={2} total={6} onClose={onClose}>body</FlowShell>)
    await userEvent.click(screen.getByRole("button", { name: "Close the booking form" }))
    expect(onClose).toHaveBeenCalledOnce()
  })
  it("never turns Continue off for a missing answer and shows no hint, has an optional legal line above the pair, no Back on the first step and no buttons when done", () => {
    const { rerender } = render(<FlowShell question="Pick your day" step={1} total={6} legal={<p>By continuing, you agree.</p>}>body</FlowShell>)
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled()
    expect(screen.getByText("By continuing, you agree.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull()
    rerender(<FlowShell question="Booked" step={6} total={6} done>body</FlowShell>)
    expect(screen.queryByRole("button")).toBeNull()
  })
})
