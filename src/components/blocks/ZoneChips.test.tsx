import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ZoneChips } from "./ZoneChips"

describe("ZoneChips", () => {
  it("has a chip for each count from six to sixteen, names the first 'Up to 6' and reports a tap", async () => {
    const onChange = vi.fn()
    render(<ZoneChips value={8} onChange={onChange} />)
    expect(screen.getAllByRole("button")).toHaveLength(11)
    expect(screen.getByRole("button", { name: "Up to 6 zones" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "8 zones" })).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(screen.getByRole("button", { name: "10 zones" }))
    expect(onChange).toHaveBeenCalledWith(10)
  })
})
