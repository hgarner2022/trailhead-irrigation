import { describe, it, expect, vi } from "vitest"
import { render, screen, within, fireEvent } from "@testing-library/react"
import type { Pass } from "@/lib/admin/types"
import { DoneStep, passPageHref } from "./checkout-done"
import { nextLines } from "./checkout-next"

vi.mock("@/lib/analytics", () => ({ fireSeasonPassPurchase: vi.fn() }))

const pass = {
  id: "p-1",
  number: "TH-2027-0042",
  season: 2027,
  clientId: "c1",
  firstName: "Andrea",
  town: "Erie",
  zones: 8,
  turnOnPreference: "earlier",
  blowoutPreference: "recommended",
  status: "active",
  visits: [
    { kind: "turn-on", window: "May", amount: 145 },
    { kind: "blowout", window: "October", amount: 95 },
  ],
  stripeUrl: "",
  jobberUrl: "",
} as Pass

describe("nextLines", () => {
  it("gives each visit its window and the text-ahead promise, then what is charged with the pass's own amounts", () => {
    expect(nextLines(pass)).toEqual([
      { key: "turn-on", lead: "Early May", text: "Spring turn-on. We text you the day two weeks before." },
      { key: "blowout", lead: "Mid October", text: "Fall blowout. We text you the day two weeks before." },
      { key: "charge", lead: "After each visit", text: "Nothing is charged until each visit is done: $145 after the spring turn-on, then $95 after the fall blowout." },
    ])
  })
  it("adds July when the inspection is on the pass and drops a visit the pass does not hold", () => {
    const withJuly = { ...pass, visits: [pass.visits[0], { kind: "inspection", window: "July", amount: 145 }, pass.visits[1]] } as Pass
    expect(nextLines(withJuly).map((l) => l.lead)).toEqual(["Early May", "July", "Mid October", "After each visit"])
    const late = { ...pass, visits: [pass.visits[1]] } as Pass
    expect(nextLines(late).map((l) => l.key)).toEqual(["blowout", "charge"])
    expect(nextLines(late)[1].text).toBe("Nothing is charged until each visit is done: $95 after the fall blowout.")
  })
})

describe("DoneStep", () => {
  it("shows the pass, what happens next, the email line with a pre-filled sign-in link, and the two actions", () => {
    const onDone = vi.fn()
    const onSaveImage = vi.fn()
    render(<DoneStep pass={pass} email="andrea+pass@example.com" onSaveImage={onSaveImage} onDone={onDone} />)
    const next = screen.getByRole("region", { name: "What happens next" })
    expect(within(next).getAllByRole("listitem")).toHaveLength(3)
    expect(within(next).getByText("Mid October")).toBeInTheDocument()
    const link = screen.getByRole("link", { name: "your pass page" })
    expect(link).toHaveAttribute("href", "/account/sign-in?email=andrea%2Bpass%40example.com")
    expect(link.closest("p")).toHaveTextContent("We emailed your pass and a link to your pass page to andrea+pass@example.com.")
    fireEvent.click(screen.getByRole("button", { name: "Save as image" }))
    fireEvent.click(screen.getByRole("button", { name: "Done" }))
    expect(onSaveImage).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(passPageHref("a@b.co")).toBe("/account/sign-in?email=a%40b.co")
  })
})
