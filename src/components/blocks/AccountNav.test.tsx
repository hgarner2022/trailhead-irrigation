import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
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
})
