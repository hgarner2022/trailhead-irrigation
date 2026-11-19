import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { AccountMenu } from "./AccountMenu"

describe("AccountMenu", () => {
  it("is the first name with no greeting, and opens Sign out (Details is a tab, so the menu never repeats it)", async () => {
    const onSignOut = vi.fn()
    render(<AccountMenu firstName="Andrea" onSignOut={onSignOut} />)
    const trigger = screen.getByRole("button", { name: "Andrea" })
    expect(screen.queryByText(/^Hi,/)).toBeNull()
    await userEvent.click(trigger)
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["Sign out"])
    await userEvent.click(screen.getByRole("menuitem", { name: "Sign out" }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it("adds Open the admin for staff", async () => {
    render(<AccountMenu firstName="Hannah" isStaff />)
    await userEvent.click(screen.getByRole("button", { name: "Hannah" }))
    expect(screen.getByRole("menuitem", { name: "Open the admin" })).toHaveAttribute("href", "/admin")
  })
})
