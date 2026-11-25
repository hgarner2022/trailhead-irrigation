import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { MarketingSwitches } from "./MarketingSwitches"

describe("MarketingSwitches", () => {
  it("is one switch, Tips and offers by email, and there is no text switch because there are no marketing texts", async () => {
    const onEmail = vi.fn()
    render(<MarketingSwitches email onEmail={onEmail} />)
    expect(screen.getAllByRole("switch")).toHaveLength(1)
    const toggle = screen.getByRole("switch", { name: "Tips and offers by email" })
    expect(toggle).toHaveAttribute("aria-checked", "true")
    expect(screen.queryByText(/text/i)).toBeNull()
    // turning it off is the withdrawal
    await userEvent.click(toggle)
    expect(onEmail).toHaveBeenCalledWith(false)
  })
})
