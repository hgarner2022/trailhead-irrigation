import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { NotTold } from "./NotTold"

describe("NotTold", () => {
  it("the mark is a bell named Customer not notified", () => {
    render(<NotTold />)
    expect(screen.getByRole("img", { name: "Customer not notified" })).toBeInTheDocument()
  })
  it("the notice says Customer not notified with Notify the customer and Don't notify", async () => {
    const onNotify = vi.fn()
    const onDontTell = vi.fn()
    render(<NotTold variant="notice" onNotify={onNotify} onDontTell={onDontTell} />)
    expect(screen.getByText("Customer not notified")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Notify the customer" }))
    await userEvent.click(screen.getByRole("button", { name: "Don't notify" }))
    expect(onNotify).toHaveBeenCalledOnce()
    expect(onDontTell).toHaveBeenCalledOnce()
  })
})
