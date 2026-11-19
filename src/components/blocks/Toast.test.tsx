import { describe, it, expect, vi } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { ToastProvider, useToast } from "./Toast"

function Demo() {
  const toast = useToast()
  return <button onClick={() => toast("Invoice sent to Andrea")}>go</button>
}

describe("Toast", () => {
  it("shows the line and removes it by itself", () => {
    vi.useFakeTimers()
    render(<ToastProvider seconds={2}><Demo /></ToastProvider>)
    fireEvent.click(screen.getByText("go"))
    expect(screen.getByRole("status")).toHaveTextContent("Invoice sent to Andrea")
    act(() => void vi.advanceTimersByTime(2100))
    expect(screen.queryByRole("status")).toBeNull()
    vi.useRealTimers()
  })

  it("is a no-op outside the provider", () => {
    render(<Demo />)
    fireEvent.click(screen.getByText("go"))
    expect(screen.queryByRole("status")).toBeNull()
  })
})
