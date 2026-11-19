import { render, screen } from "@testing-library/react"
import { beforeAll, describe, expect, it, vi } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { AccountMenu } from "@/components/blocks/AccountMenu"
import { AccountNav } from "@/components/blocks/AccountNav"
import { SignInCard } from "@/components/blocks/SignInCard"
import { Footer } from "@/components/sections/Footer"
import { andrea, passJob, repairJob, TODAY } from "./account-fixtures"
import { DetailsScreen } from "./DetailsScreen"
import { HomeScreen } from "./HomeScreen"
import { VisitScreen } from "./VisitScreen"

// UX audit rows 15 and 16: every link and control a customer taps on the account pages is 44px tall (`min-h-11`, or the `py-3` of an inline link in a sentence), and the
// marketing footer's links are 44px below md. A phone has no hover, so the box of the tap is the only target.
const pass = snapshot.passes[0] as Pass
beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})

const tall = (el: HTMLElement) => /\bmin-h-11\b/.test(el.className)

describe("44px tap targets on the account", () => {
  it("the header: the logo, every place and the signed-out Sign in link", () => {
    const { unmount } = render(<AccountNav firstName="Andrea" hasPass current="/account" />)
    expect(tall(screen.getByRole("link", { name: /Trailhead Lawn & Irrigation, your account/ }))).toBe(true)
    for (const name of ["Home", "Visits", "Season Pass", "Details"]) expect(tall(screen.getByRole("link", { name }))).toBe(true)
    unmount()
    render(<AccountNav />)
    expect(tall(screen.getByRole("link", { name: "Sign in" }))).toBe(true)
  })
  it("the account menu's trigger", () => {
    render(<AccountMenu firstName="Andrea" />)
    expect(tall(screen.getByRole("button", { name: /Andrea/ }))).toBe(true)
  })
  it("Home: See all visits and every Receipt link", () => {
    render(<HomeScreen customer={andrea} jobs={[passJob, repairJob]} today={TODAY} pass={pass} />)
    expect(tall(screen.getByRole("link", { name: "See all visits" }))).toBe(true)
    const receipts = screen.getAllByRole("link", { name: "Receipt" })
    expect(receipts.length).toBeGreaterThan(0)
    for (const r of receipts) expect(tall(r)).toBe(true)
  })
  it("a visit page: the back link and its Receipt link", () => {
    render(<VisitScreen customer={andrea} job={repairJob} visitId="v3" today={TODAY} />)
    expect(tall(screen.getByRole("link", { name: "Visits" }))).toBe(true)
    expect(tall(screen.getByRole("link", { name: "Receipt" }))).toBe(true)
  })
  it("Details: the text us links sit in a padded hit area and the must-be-home row is one 44px label", () => {
    render(<DetailsScreen customer={andrea} />)
    for (const l of screen.getAllByRole("link", { name: "text us" })) expect(l.className).toMatch(/\bpy-3\b/)
    const row = screen.getByText("Someone must be home for our visits").closest("label")!
    expect(tall(row)).toBe(true)
    expect(row.querySelector("button[role=checkbox]")).not.toBeNull()
  })
  it("the sign-in sent page: Use a different email", () => {
    render(<SignInCard state="sent" email="andrea@example.com" retryHref="/account/sign-in" />)
    expect(tall(screen.getByRole("link", { name: "Use a different email" }))).toBe(true)
  })
  it("the marketing footer's links are 44px below md and back to compact from md", () => {
    render(<Footer />)
    const nav = screen.getByRole("navigation", { name: "Company" })
    const links = nav.querySelectorAll("a")
    expect(links.length).toBeGreaterThan(0)
    for (const l of links) {
      expect(l.className).toContain("min-h-11")
      expect(l.className).toContain("md:min-h-0")
    }
    for (const name of ["Privacy Policy", "Terms & Conditions"]) expect(screen.getByRole("link", { name }).className).toContain("min-h-11")
  })
})
