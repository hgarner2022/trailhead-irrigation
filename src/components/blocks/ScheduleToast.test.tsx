import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ScheduleToast } from "./ScheduleToast"

const props = { message: "Moved to Thu, Nov 26, 9:00 am", onNotify: () => {}, onUndo: () => {}, onClose: () => {} }

describe("ScheduleToast", () => {
  it("says where it moved with Notify the customer, Undo and a close, at the bottom of the screen", () => {
    render(<ScheduleToast {...props} seconds={0} />)
    const bar = document.querySelector('[data-slot="undo-toast"]')!
    expect(bar).toHaveTextContent("Moved to Thu, Nov 26, 9:00 am")
    expect(bar.className).toMatch(/\bbottom-/)
    expect(screen.getByRole("button", { name: "Notify the customer" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument()
  })
  it("says in words that no message was sent until the customer is notified", () => {
    const { unmount } = render(<ScheduleToast {...props} seconds={0} />)
    expect(document.querySelector('[data-slot="undo-toast"]')).toHaveTextContent("Moved to Thu, Nov 26, 9:00 am. No message sent.")
    unmount()
    render(<ScheduleToast {...props} notified seconds={0} />)
    expect(document.querySelector('[data-slot="undo-toast"]')).not.toHaveTextContent("No message sent")
  })
  it("offers Undo alone when the customer was already notified", () => {
    render(<ScheduleToast {...props} notified seconds={0} />)
    expect(screen.queryByRole("button", { name: "Notify the customer" })).toBeNull()
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument()
  })
  it("runs Notify the customer or Undo and then closes", async () => {
    const onNotify = vi.fn()
    const onUndo = vi.fn()
    const onClose = vi.fn()
    render(<ScheduleToast {...props} onNotify={onNotify} onUndo={onUndo} onClose={onClose} seconds={0} />)
    await userEvent.click(screen.getByRole("button", { name: "Notify the customer" }))
    expect(onNotify).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole("button", { name: "Undo" }))
    expect(onUndo).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledTimes(2)
  })
  it("closes itself after ten seconds, and never when seconds is 0", () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    const { unmount } = render(<ScheduleToast {...props} onClose={onClose} />)
    act(() => void vi.advanceTimersByTime(9_900))
    expect(onClose).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(200))
    expect(onClose).toHaveBeenCalledOnce()
    unmount()
    const never = vi.fn()
    render(<ScheduleToast {...props} onClose={never} seconds={0} />)
    act(() => void vi.advanceTimersByTime(60_000))
    expect(never).not.toHaveBeenCalled()
  })
  beforeEach(() => vi.useRealTimers())
  afterEach(() => vi.useRealTimers())
})
