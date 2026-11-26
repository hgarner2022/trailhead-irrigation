import { act, fireEvent, render, screen } from "@testing-library/react"
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
  it("says nothing about a message that was not sent", () => {
    render(<ScheduleToast {...props} seconds={0} />)
    expect(document.querySelector('[data-slot="undo-toast"]')).not.toHaveTextContent("No message sent")
  })
  it("shows each action only when its callback is given", () => {
    const { unmount } = render(<ScheduleToast message="Now 8:00 to 8:45 am" onUndo={() => {}} onClose={() => {}} seconds={0} />)
    expect(screen.queryByRole("button", { name: "Notify the customer" })).toBeNull()
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument()
    unmount()
    render(<ScheduleToast message="Customer notified" onClose={() => {}} seconds={0} />)
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull()
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
  it("closes itself after ten seconds, four with no action, and never when seconds is 0", () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    const { unmount } = render(<ScheduleToast {...props} onClose={onClose} />)
    act(() => void vi.advanceTimersByTime(9_900))
    expect(onClose).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(200))
    expect(onClose).toHaveBeenCalledOnce()
    unmount()
    const plain = vi.fn()
    const p = render(<ScheduleToast message="Customer notified" onClose={plain} />)
    act(() => void vi.advanceTimersByTime(4_100))
    expect(plain).toHaveBeenCalledOnce()
    p.unmount()
    const never = vi.fn()
    render(<ScheduleToast {...props} onClose={never} seconds={0} />)
    act(() => void vi.advanceTimersByTime(60_000))
    expect(never).not.toHaveBeenCalled()
  })
  it("waits while the pointer is on it", () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(<ScheduleToast {...props} onClose={onClose} />)
    const bar = document.querySelector('[data-slot="undo-toast"]')!
    act(() => void vi.advanceTimersByTime(8_000))
    fireEvent.pointerEnter(bar.parentElement!)
    act(() => void vi.advanceTimersByTime(30_000))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.pointerLeave(bar.parentElement!)
    act(() => void vi.advanceTimersByTime(10_100))
    expect(onClose).toHaveBeenCalledOnce()
  })
  beforeEach(() => vi.useRealTimers())
  afterEach(() => vi.useRealTimers())
})
