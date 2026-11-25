import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MovedToast } from "./MovedToast"

const props = { title: "Visit moved", detail: "Briggs St to Thu, Apr 30, 9:00 am", onNotify: () => {}, onUndo: () => {}, onClose: () => {} }

describe("MovedToast", () => {
  it("says what happened with Notify, Undo and a close, at the bottom of the screen", () => {
    render(<MovedToast {...props} seconds={0} />)
    const bar = document.querySelector('[data-slot="undo-toast"]')!
    expect(bar).toHaveTextContent("Visit moved. Briggs St to Thu, Apr 30, 9:00 am")
    expect(bar.className).toMatch(/\bbottom-/)
    expect(screen.getByRole("button", { name: "Notify" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument()
  })
  it("says Notify all after a plan", () => {
    render(<MovedToast {...props} title="11 visits moved" detail={undefined} many seconds={0} />)
    expect(screen.getByRole("button", { name: "Notify all" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Notify" })).toBeNull()
  })
  it("runs Notify or Undo and then closes", async () => {
    const onNotify = vi.fn()
    const onUndo = vi.fn()
    const onClose = vi.fn()
    render(<MovedToast {...props} onNotify={onNotify} onUndo={onUndo} onClose={onClose} seconds={0} />)
    await userEvent.click(screen.getByRole("button", { name: "Notify" }))
    expect(onNotify).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole("button", { name: "Undo" }))
    expect(onUndo).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledTimes(2)
  })
  it("closes itself after ten seconds, and never when seconds is 0", () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    const { unmount } = render(<MovedToast {...props} onClose={onClose} />)
    act(() => void vi.advanceTimersByTime(9_900))
    expect(onClose).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(200))
    expect(onClose).toHaveBeenCalledOnce()
    unmount()
    const never = vi.fn()
    render(<MovedToast {...props} onClose={never} seconds={0} />)
    act(() => void vi.advanceTimersByTime(60_000))
    expect(never).not.toHaveBeenCalled()
  })
  beforeEach(() => vi.useRealTimers())
  afterEach(() => vi.useRealTimers())
})
