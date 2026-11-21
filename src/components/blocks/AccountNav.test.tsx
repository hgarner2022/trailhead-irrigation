import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { AccountNav, placeOf } from "./AccountNav"

describe("AccountNav", () => {
  it("shows four tabs, Details once as a tab and not in the menu, and marks the current one; a visit page is under Visits and there is no Jobs place", () => {
    render(<AccountNav firstName="Andrea" current="/account/visits/abc" />)
    const names = screen.getAllByRole("link").map((l) => l.textContent)
    for (const place of ["Home", "Visits", "Season Pass", "Details"]) expect(names).toContain(place)
    expect(names).not.toContain("Jobs")
    expect(screen.getByRole("link", { name: "Visits" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current")
  })

  it("shows Season Pass to everyone: a customer with no pass lands on the sell card", () => {
    render(<AccountNav firstName="Dana" current="/account" />)
    expect(screen.getByRole("link", { name: "Season Pass" })).toHaveAttribute("href", "/account/pass")
  })

  it("shows only a quiet Sign in when nobody is signed in", () => {
    render(<AccountNav current="/account/sign-in" />)
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/account/sign-in")
    expect(screen.queryByRole("navigation")).toBeNull()
  })

  it("reads Home only for /account itself", () => {
    expect(placeOf("/account")).toBe("/account")
    expect(placeOf("/account/pass/card-updated")).toBe("/account/pass")
    expect(placeOf("/account/visits/x")).toBe("/account/visits")
    // a receipt is a visit's: Visits stays lit (it used to light no tab)
    expect(placeOf("/account/receipts/pay_9")).toBe("/account/visits")
  })

  it("makes the first name a menu with Sign out, pinned to the far right of the header row", async () => {
    const onSignOut = vi.fn()
    render(<AccountNav firstName="Andrea" current="/account" onSignOut={onSignOut} />)
    const trigger = screen.getByRole("button", { name: "Andrea" })
    expect(trigger).toHaveAttribute("aria-haspopup", "menu")
    // the menu is the last thing in the header's row and pushes itself to the right edge of the same column the page content sits in
    expect(trigger.closest("[data-slot=account-menu]")).toHaveClass("ml-auto")
    expect(document.querySelector("[data-slot=account-nav] > div")).toHaveClass("max-w-5xl")
    await userEvent.click(trigger)
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["Sign out"])
    await userEvent.click(screen.getByRole("menuitem", { name: "Sign out" }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it("offers Open the admin to staff", async () => {
    render(<AccountNav firstName="Hannah" current="/account" isStaff />)
    await userEvent.click(screen.getByRole("button", { name: "Hannah" }))
    expect(screen.getByRole("menuitem", { name: "Open the admin" })).toHaveAttribute("href", "/admin")
  })

  it("never says Hi, anywhere", () => {
    render(<AccountNav firstName="Andrea" current="/account" onSignOut={() => {}} />)
    expect(screen.queryByText(/Hi,/)).toBeNull()
    expect(screen.getAllByText("Andrea")).toHaveLength(1)
  })
})
