import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CancelPassDialog } from "./CancelPassDialog"

describe("CancelPassDialog", () => {
  it("opens from the link, keeps the pass on the outline button", () => {
    const onConfirm = vi.fn()
    render(<CancelPassDialog onConfirm={onConfirm} />)
    const link = screen.getByRole("button", { name: "Cancel my pass" })
    expect(link).toHaveClass("py-2")
    fireEvent.click(link)
    expect(screen.getByRole("dialog", { name: "Cancel your Season Pass?" })).toHaveTextContent("Nothing further is charged. Your remaining visits come off the schedule.")
    fireEvent.click(screen.getByRole("button", { name: "Keep my pass" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("confirms once and swaps the body to the answer", () => {
    const onConfirm = vi.fn()
    render(<CancelPassDialog onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole("button", { name: "Cancel my pass" }))
    fireEvent.click(screen.getByRole("button", { name: "Cancel my pass" }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("dialog", { name: "Your pass is cancelled." })).toHaveTextContent("Nothing further is charged.")
    expect(screen.queryByRole("button", { name: "Keep my pass" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Cancel my pass" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Back to my pass" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
