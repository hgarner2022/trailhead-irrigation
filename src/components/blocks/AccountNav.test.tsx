import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { AccountNav, placeOf } from "./AccountNav"

describe("AccountNav", () => {
  it("shows the four places for a pass holder and marks the current one; a visit page is under Visits and there is no Jobs place", () => {
    render(<AccountNav firstName="Andrea" hasPass current="/account/visits/abc" />)
    const names = screen.getAllByRole("link").map((l) => l.textContent)
    for (const place of ["Home", "Visits", "Season Pass", "Details"]) expect(names).toContain(place)
    expect(names).not.toContain("Jobs")
    expect(screen.getByRole("link", { name: "Visits" })).toHaveAttribute("aria-current", "page")
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
    expect(placeOf("/account/visits/x")).toBe("/account/visits")
  })

  it("makes the first name a menu with Details and Sign out, pinned to the far right of the header", async () => {
    const onSignOut = vi.fn()
    render(<AccountNav firstName="Andrea" hasPass current="/account" onSignOut={onSignOut} />)
    const trigger = screen.getByRole("button", { name: "Andrea" })
    expect(trigger).toHaveAttribute("aria-haspopup", "menu")
    // the menu is the last thing in the header's row and pushes itself to the right edge; the row is not held to a centred column
    expect(trigger.closest("[data-slot=account-menu]")).toHaveClass("ml-auto")
    expect(document.querySelector("[data-slot=account-nav] > div")).not.toHaveClass("max-w-5xl")
    await userEvent.click(trigger)
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["Details", "Sign out"])
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
