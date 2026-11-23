import { render, screen } from "@testing-library/react"
import { beforeAll, describe, expect, it, vi } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { AccountMenu } from "@/components/blocks/AccountMenu"
import { AccountNav } from "@/components/blocks/AccountNav"
import { SignInCard } from "@/components/blocks/SignInCard"
import { andrea, passJob, repairJob, TODAY } from "./account-fixtures"
import { DetailsScreen } from "./DetailsScreen"
import { VisitsScreen } from "./VisitsScreen"
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
    const { unmount } = render(<AccountNav firstName="Andrea" current="/account" />)
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
  it("Visits: every Receipt link", () => {
    render(<VisitsScreen customer={andrea} jobs={[passJob, repairJob]} today={TODAY} />)
    const receipts = screen.getAllByRole("link", { name: "Receipt" })
    expect(receipts.length).toBeGreaterThan(0)
    for (const r of receipts) expect(tall(r)).toBe(true)
  })
  it("a visit page: its Receipt link", () => {
    render(<VisitScreen customer={andrea} job={repairJob} visitId="v3" today={TODAY} />)
    expect(tall(screen.getByRole("link", { name: "Receipt" }))).toBe(true)
  })
  it("Details: the text us links sit in a padded hit area and the must-be-home row is one 44px label", () => {
    render(<DetailsScreen customer={andrea} />)
    for (const l of screen.getAllByRole("link", { name: "text us" })) expect(l.className).toMatch(/\bpy-3\b/)
    const row = screen.getByText("Tell Ryan someone needs to be home").closest("label")!
    expect(tall(row)).toBe(true)
    expect(row.querySelector("button[role=checkbox]")).not.toBeNull()
  })
  it("the sign-in sent page: Use a different email", () => {
    render(<SignInCard audience="customer" state="sent" email="andrea@example.com" retryHref="/account/sign-in" />)
    expect(tall(screen.getByRole("link", { name: "Use a different email" }))).toBe(true)
  })
})
