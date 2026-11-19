import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AdminAccountMenu } from "./AdminAccountMenu"

const user = { initials: "HG", name: "Hannah" }

describe("AdminAccountMenu", () => {
  it("opens with Profile, Help, Open as customer and Sign out, in that order", async () => {
    render(<AdminAccountMenu user={user} profileHref="/p" helpHref="/h" customerHref="/account" />)
    await userEvent.click(screen.getByRole("button", { name: "Account, Hannah" }))
    const items = await screen.findAllByRole("menuitem")
    expect(items.map((i) => i.textContent)).toEqual(["Profile", "Help", "Open as customer", "Sign out"])
    expect(items[2]).toHaveAttribute("href", "/account")
  })

  it("draws only the rows it has an address for", async () => {
    render(<AdminAccountMenu user={user} />)
    await userEvent.click(screen.getByRole("button", { name: "Account, Hannah" }))
    expect((await screen.findAllByRole("menuitem")).map((i) => i.textContent)).toEqual(["Sign out"])
  })

  it("shows only the initials when compact and signs out through the action", async () => {
    const onSignOut = vi.fn()
    render(<AdminAccountMenu user={user} compact onSignOut={onSignOut} />)
    expect(screen.queryByText("Hannah")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Account, Hannah" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Sign out" }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })
})
