import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { PlanStrip, type PlanStripProps } from "./PlanStrip"
import { PLAN, PLAN_ELEVEN, STALE_MOVE } from "./scheduler-panels-fixtures"

const base: PlanStripProps = { status: "ready", weekLabel: "Nov 30", moves: PLAN, savedMinutes: 94, onAccept: () => {}, onDiscard: () => {} }

describe("PlanStrip", () => {
  it("names the week and sums the plan", () => {
    render(<PlanStrip {...base} moves={PLAN_ELEVEN} />)
    expect(screen.getByRole("heading", { name: "Jev's plan, week of Nov 30" })).toBeInTheDocument()
    expect(screen.getByText("11 moves, 94 fewer driving minutes")).toBeInTheDocument()
  })
  it("reads Accept all when every row is ticked and Accept N when some are not", async () => {
    const onAccept = vi.fn()
    const { rerender } = render(<PlanStrip {...base} moves={PLAN_ELEVEN} onAccept={onAccept} />)
    await userEvent.click(screen.getByRole("button", { name: "Accept all" }))
    expect(onAccept).toHaveBeenCalledWith(PLAN_ELEVEN.map((m) => m.id))
    rerender(<PlanStrip {...base} onAccept={onAccept} />)
    expect(screen.getByRole("button", { name: "Accept 3" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("checkbox", { name: "Move Briggs St" }))
    expect(screen.getByRole("button", { name: "Accept 2" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Accept 2" }))
    expect(onAccept).toHaveBeenLastCalledWith(["m-1", "m-2"])
  })
  it("starts a customer-picked row unticked and lets it be ticked", async () => {
    render(<PlanStrip {...base} />)
    const row = screen.getByRole("checkbox", { name: "Move Ann Lee" })
    expect(row).not.toBeChecked()
    expect(screen.getByText("Customer picked Wed. Needs your call.")).toBeInTheDocument()
    await userEvent.click(row)
    expect(screen.getByRole("button", { name: "Accept all" })).toBeInTheDocument()
  })
  it("leaves a stale row unticked and disabled, and never sends it", async () => {
    const onAccept = vi.fn()
    render(<PlanStrip {...base} moves={[PLAN[0]!, STALE_MOVE]} onAccept={onAccept} />)
    const stale = screen.getByRole("checkbox", { name: "Move Ash St" })
    expect(stale).toBeDisabled()
    expect(stale).not.toBeChecked()
    expect(screen.getByText("Changed since")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Accept all" }))
    expect(onAccept).toHaveBeenCalledWith(["m-1"])
  })
  it("turns Accept off with nothing ticked and throws away on request", async () => {
    const onDiscard = vi.fn()
    render(<PlanStrip {...base} moves={[PLAN[2]!]} onDiscard={onDiscard} />)
    expect(screen.getByRole("button", { name: "Accept 0" })).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: "Throw away" }))
    expect(onDiscard).toHaveBeenCalledOnce()
  })
  it("reports the row under the pointer", async () => {
    const onHover = vi.fn()
    render(<PlanStrip {...base} onHover={onHover} />)
    const row = document.querySelector('[data-move="m-2"]')!
    await userEvent.hover(row)
    expect(onHover).toHaveBeenLastCalledWith("m-2")
    await userEvent.unhover(row)
    expect(onHover).toHaveBeenLastCalledWith(null)
  })
  it("has a drafting state with Cancel, a failed state and an empty one", async () => {
    const onCancel = vi.fn()
    const { rerender } = render(<PlanStrip {...base} status="drafting" moves={[]} onCancel={onCancel} />)
    expect(screen.getByText("Jev is working")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onCancel).toHaveBeenCalledOnce()
    rerender(<PlanStrip {...base} status="failed" moves={[]} />)
    expect(screen.getByText("Jev is resting. Try again later")).toBeInTheDocument()
    rerender(<PlanStrip {...base} status="empty" moves={[]} />)
    expect(screen.getByText("Jev found nothing to change")).toBeInTheDocument()
  })
})
