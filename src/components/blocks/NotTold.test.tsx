import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { NotTold } from "./NotTold"

describe("NotTold", () => {
  it("the mark is a bell named Customer not told", () => {
    render(<NotTold />)
    expect(screen.getByRole("img", { name: "Customer not told" })).toBeInTheDocument()
  })
  it("the notice says Customer not told with Notify and Don't tell", async () => {
    const onNotify = vi.fn()
    const onDontTell = vi.fn()
    render(<NotTold variant="notice" onNotify={onNotify} onDontTell={onDontTell} />)
    expect(screen.getByText("Customer not told")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Notify" }))
    await userEvent.click(screen.getByRole("button", { name: "Don't tell" }))
    expect(onNotify).toHaveBeenCalledOnce()
    expect(onDontTell).toHaveBeenCalledOnce()
  })
})
