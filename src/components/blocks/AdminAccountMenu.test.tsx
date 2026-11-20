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

  it("in the rail shows the first name, opens upward from the footer, and Escape closes it and returns focus", async () => {
    render(<AdminAccountMenu placement="rail" user={user} profileHref="/p" />)
    const trigger = screen.getByRole("button", { name: "Account, Hannah" })
    expect(trigger).toHaveAttribute("aria-haspopup", "menu")
    expect(trigger).toHaveTextContent("Hannah")
    trigger.focus()
    await userEvent.keyboard("{Enter}")
    const menu = await screen.findByRole("menu")
    expect(menu).toHaveAttribute("data-side", "top")
    await userEvent.keyboard("{Escape}")
    expect(screen.queryByRole("menu")).toBeNull()
    expect(trigger).toHaveFocus()
  })
})
