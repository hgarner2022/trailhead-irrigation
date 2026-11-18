import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { AccountNav, placeOf } from "./AccountNav"

describe("AccountNav", () => {
  it("shows the five places for a pass holder and marks the current one", () => {
    render(<AccountNav firstName="Andrea" hasPass current="/account/jobs/abc" />)
    const names = screen.getAllByRole("link").map((l) => l.textContent)
    for (const place of ["Home", "Visits", "Jobs", "Season Pass", "Details"]) expect(names).toContain(place)
    expect(screen.getByRole("link", { name: "Jobs" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current")
  })

  it("hides Season Pass for someone who has never held one", () => {
    render(<AccountNav firstName="Dana" current="/account" />)
    expect(screen.queryByRole("link", { name: "Season Pass" })).toBeNull()
  })

  it("shows only a quiet Sign in when nobody is signed in", () => {
    render(<AccountNav current="/account/sign-in" />)
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/account/sign-in")
    expect(screen.queryByRole("navigation")).toBeNull()
  })

  it("reads Home only for /account itself", () => {
    expect(placeOf("/account")).toBe("/account")
    expect(placeOf("/account/pass/card-updated")).toBe("/account/pass")
    expect(placeOf("/account/jobs/x")).toBe("/account/jobs")
  })

  it("makes the greeting a menu with Sign out, pinned to the far right of the header", async () => {
    const onSignOut = vi.fn()
    render(<AccountNav firstName="Andrea" hasPass current="/account" onSignOut={onSignOut} />)
    const trigger = screen.getByRole("button", { name: "Hi, Andrea" })
    expect(trigger).toHaveAttribute("aria-haspopup", "menu")
    // the menu is the last thing in the header's row and pushes itself to the right edge; the row is not held to a centred column
    expect(trigger.closest("[data-slot=account-menu]")).toHaveClass("ml-auto")
    expect(document.querySelector("[data-slot=account-nav] > div")).not.toHaveClass("max-w-5xl")
    await userEvent.click(trigger)
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["Sign out"])
    await userEvent.click(screen.getByRole("menuitem", { name: "Sign out" }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it("shows the greeting once, not beside the logo as well", () => {
    render(<AccountNav firstName="Andrea" current="/account" onSignOut={() => {}} />)
    expect(screen.getAllByText("Hi, Andrea")).toHaveLength(1)
  })
})
