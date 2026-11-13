import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import type { PassVisit } from "@/lib/admin/types"
import { SeasonLine } from "./SeasonLine"

const bars = [
  { month: 4, committed: 1695, charged: 290 },
  { month: 7, committed: 1695, charged: 0 },
  { month: 10, committed: 1305, charged: 0 },
]

const visits: PassVisit[] = [
  { kind: "turn-on", window: "April to May", amount: 145, scheduledAt: "2027-04-20T16:00:00Z", completedAt: "2027-04-20T17:10:00Z", chargedAt: "2027-04-20T17:12:00Z" },
  { kind: "inspection", window: "July", amount: 145, scheduledAt: "2027-07-14T15:00:00Z" },
  { kind: "blowout", window: "October, week of the 11th", amount: 115 },
]

const slots = (el: HTMLElement, slot: string) => Array.from(el.querySelectorAll<HTMLElement>(`[data-slot="${slot}"]`))

describe("SeasonLine in business mode", () => {
  it("labels the eight months of the season", () => {
    const { container } = render(<SeasonLine season={2027} mode="business" bars={bars} today="2027-06-15" />)
    const months = slots(container, "season-month").map((m) => m.textContent)
    expect(months).toHaveLength(8)
    expect(months[0]).toContain("Apr")
    expect(months[7]).toContain("Nov")
  })

  it("draws one bar per entry and none for the other months", () => {
    const { container } = render(<SeasonLine season={2027} mode="business" bars={bars} today="2027-06-15" />)
    const drawn = slots(container, "season-bar").map((b) => b.dataset.month)
    expect(drawn).toEqual(["4", "7", "10"])
  })

  it("describes the season with the formatted committed amount", () => {
    render(<SeasonLine season={2027} mode="business" bars={bars} today="2027-06-15" />)
    const label = screen.getByRole("img").getAttribute("aria-label") ?? ""
    expect(label).toContain("Season 2027")
    expect(label).toContain("$4,695 committed across April, July and October")
    expect(label).toContain("$290 charged so far")
  })

  it("reads the caption into the description and shows it", () => {
    const caption = "No passes sold yet. The line fills in as customers reserve their season."
    render(<SeasonLine season={2027} mode="business" bars={[]} caption={caption} today="2027-06-15" />)
    expect(screen.getByText(caption)).toBeInTheDocument()
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain(caption)
  })

  it("marks today inside the season", () => {
    const { container } = render(<SeasonLine season={2027} mode="business" bars={bars} today="2027-06-15" />)
    const marker = slots(container, "season-today")[0]
    expect(marker.textContent).toBe("Today")
    expect(marker.dataset.pinned).toBeUndefined()
  })

  it("pins today at the start before the season", () => {
    const { container } = render(<SeasonLine season={2027} mode="business" bars={bars} today="2027-03-20" />)
    const marker = slots(container, "season-today")[0]
    expect(marker.textContent).toBe("Before the season")
    expect(marker.dataset.pinned).toBe("start")
  })

  it("pins today at the end after the season", () => {
    const { container } = render(<SeasonLine season={2027} mode="business" bars={bars} today="2027-12-03" />)
    const marker = slots(container, "season-today")[0]
    expect(marker.textContent).toBe("After the season")
    expect(marker.dataset.pinned).toBe("end")
  })
})

describe("SeasonLine in customer mode", () => {
  it("draws three dots with their states", () => {
    const { container } = render(<SeasonLine season={2027} mode="customer" visits={visits} today="2027-06-15" />)
    const dots = slots(container, "season-dot")
    expect(dots.map((d) => d.dataset.state)).toEqual(["completed", "scheduled", "window"])
    expect(dots.map((d) => d.dataset.month)).toEqual(["4", "7", "10"])
  })

  it("rings the reserved blowout and labels it", () => {
    const { container } = render(<SeasonLine season={2027} mode="customer" visits={visits} today="2027-06-15" />)
    const blowout = slots(container, "season-dot")[2]
    expect(blowout.dataset.reserved).toBe("true")
    expect(screen.getByText("Reserved")).toBeInTheDocument()
    expect(screen.getByText("Turn-on")).toBeInTheDocument()
    expect(screen.getByText("Inspection")).toBeInTheDocument()
    expect(screen.getByText("Blowout")).toBeInTheDocument()
  })

  it("keeps a visit name on one line in a narrow column", () => {
    // On a phone the month column is about 37px; "Turn-on" would otherwise break at its hyphen into "Turn-" and "on".
    render(<SeasonLine season={2027} mode="customer" visits={visits} today="2027-06-15" />)
    expect(screen.getByText("Turn-on")).toHaveClass("whitespace-nowrap")
  })

  it("does not call a finished blowout reserved", () => {
    const done = visits.map((v) => ({ ...v, completedAt: "2027-10-12T16:00:00Z", chargedAt: "2027-10-12T16:30:00Z" }))
    const { container } = render(<SeasonLine season={2027} mode="customer" visits={done} today="2027-11-01" />)
    expect(slots(container, "season-dot").map((d) => d.dataset.state)).toEqual(["completed", "completed", "completed"])
    expect(slots(container, "season-dot")[2].dataset.reserved).toBeUndefined()
    expect(screen.queryByText("Reserved")).not.toBeInTheDocument()
  })

  it("reads windows the same way the money metrics do", () => {
    const loose: PassVisit[] = [
      { kind: "turn-on", window: "early April", amount: 145 },
      { kind: "inspection", window: "Late April to May", amount: 145 },
      { kind: "blowout", window: "Oct 13", amount: 95 },
    ]
    const { container } = render(<SeasonLine season={2027} mode="customer" visits={loose} today="2027-06-15" />)
    expect(slots(container, "season-dot").map((d) => d.dataset.month)).toEqual(["4", "4", "10"])
  })

  it("shows two visits that share a month side by side and names both", () => {
    const twoInJuly: PassVisit[] = [
      visits[0],
      { kind: "inspection", window: "July", amount: 145, scheduledAt: "2027-07-14T15:00:00Z" },
      { kind: "blowout", window: "July 28", amount: 95 },
    ]
    const { container } = render(<SeasonLine season={2027} mode="customer" visits={twoInJuly} today="2027-06-15" />)
    const july = slots(container, "season-dot").filter((d) => d.dataset.month === "7")
    expect(july).toHaveLength(2)
    expect(july[0].parentElement?.parentElement).toBe(july[1].parentElement?.parentElement)
    const label = screen.getByRole("img").getAttribute("aria-label") ?? ""
    expect(label).toContain("inspection scheduled for July 14")
    expect(label).toContain("blowout in July 28")
  })

  it("describes the customer's season in one sentence", () => {
    render(<SeasonLine season={2027} mode="customer" visits={visits} today="2027-06-15" />)
    const label = screen.getByRole("img").getAttribute("aria-label") ?? ""
    expect(label).toContain("Your 2027 season")
    expect(label).toContain("turn-on done on April 20")
    expect(label).toContain("inspection scheduled for July 14")
    expect(label).toContain("blowout reserved for the week of October 11")
  })
})
