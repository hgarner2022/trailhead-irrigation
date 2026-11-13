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

const dated = {
  ...pass,
  cardLast4: "4242",
  visits: [
    { kind: "turn-on", window: "May", amount: 145, scheduledOn: "2027-05-04", scheduledAt: "2027-05-04T14:00:00Z", startTime: "08:00", calendarUrl: "https://site.test/cal/1.ics" },
    { kind: "blowout", window: "October", amount: 95, scheduledOn: "2027-10-05", scheduledAt: "2027-10-05T14:00:00Z", startTime: "08:00" },
  ],
} as Pass

describe("nextLines", () => {
  it("gives each visit its day, window and what Ryan does, then the confirmation timeline and the money line with the card", () => {
    const lines = nextLines(dated)
    expect(lines.map((l) => [l.key, l.lead])).toEqual([["turn-on", "Tuesday, May 4"], ["blowout", "Tuesday, October 5"], ["confirm", "Before each visit"], ["charge", "What you pay"]])
    expect(lines[0]!.text).toBe("Spring turn-on, between 8 and 10 am. Ryan turns the water on, runs every zone and checks the heads.")
    expect(lines[0]!.calendar?.google).toMatch(/^https:\/\/calendar\.google\.com\//)
    expect(lines[0]!.calendar?.ics).toBe("https://site.test/cal/1.ics")
    expect(lines[1]!.calendar?.ics).toBeUndefined()
    expect(lines[2]!.text).toBe("We confirm it by text two weeks before and remind you the day before. If it has to move, we tell you first and you can pick another day.")
    expect(lines[3]!.text).toBe("You pay $0 today. We charge $145 after the spring turn-on and $95 after the fall blowout to the card ending 4242.")
  })
  it("never says a visit has a day when it has none: Ryan sets it", () => {
    const lines = nextLines(pass)
    expect(lines[0]).toEqual({ key: "turn-on", lead: "May", text: "Spring turn-on. Ryan sets the day and we text it to you." })
    expect(lines.some((l) => l.calendar)).toBe(false)
    expect(JSON.stringify(lines)).not.toMatch(/days are set|reserved in July|on our way/)
  })
  it("says so in one line when the day picked filled up", () => {
    const lines = nextLines(dated, [{ kind: "turn-on", day: "2027-05-04" }, { kind: "blowout", day: "2027-10-01" }])
    expect(lines[0]!.note).toBeUndefined()
    expect(lines[1]!.note).toBe("Your first choice, Friday, October 1, filled up, so we put it on Tuesday, October 5.")
  })
  it("adds July when the inspection is on the pass and drops a visit the pass does not hold", () => {
    const withJuly = { ...pass, visits: [pass.visits[0], { kind: "inspection", window: "July", amount: 145 }, pass.visits[1]] } as Pass
    expect(nextLines(withJuly).map((l) => l.lead)).toEqual(["May", "July", "October", "Before each visit", "What you pay"])
    const late = { ...pass, visits: [pass.visits[1]] } as Pass
    expect(nextLines(late).map((l) => l.key)).toEqual(["blowout", "confirm", "charge"])
    expect(nextLines(late)[2].text).toBe("You pay $0 today. We charge $95 after the fall blowout.")
  })
})

describe("DoneStep", () => {
  it("shows the pass, what happens next, the email line with a pre-filled sign-in link, and the two actions", () => {
    const onDone = vi.fn()
    const onSaveImage = vi.fn()
    render(<DoneStep pass={dated} email="andrea+pass@example.com" onSaveImage={onSaveImage} onDone={onDone} />)
    const next = screen.getByRole("region", { name: "What happens next" })
    expect(within(next).getAllByRole("listitem")).toHaveLength(4)
    expect(within(next).getByText("Tuesday, October 5")).toBeInTheDocument()
    expect(within(next).getAllByRole("link", { name: "Add to Google Calendar" })).toHaveLength(2)
    expect(within(next).getByRole("link", { name: "Add to Apple or Outlook calendar" })).toHaveAttribute("href", "https://site.test/cal/1.ics")
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
