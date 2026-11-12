import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import type { Attention } from "@/lib/admin/types"
import { NeedsAttention } from "./NeedsAttention"

const now = "2026-11-12T18:00:00Z"
const items: Attention[] = [
  { kind: "charge-failed", passId: "p3", message: "Card declined for the spring turn-on; customer emailed an update link", since: "2026-11-10T15:04:00Z" },
  { kind: "jobs-failed", passId: "p7", message: "Jobber jobs for pass TH-2027-0007 were not created; retrying", since: "2026-11-11T22:41:00Z" },
  { kind: "week-full", message: "The week of October 11 is full", since: "2026-11-12T17:20:00Z" },
  { kind: "card-expiring", passId: "p5", message: "Card on file expires before the October blowout", since: "2026-11-12T08:00:00Z" },
]

const rows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="needs-attention"] > li'))
const iconOf = (row: HTMLElement) => row.querySelector<HTMLElement>('[data-slot="attention-icon"]') as HTMLElement

describe("NeedsAttention", () => {
  it("renders one row per item with its message and the time since", () => {
    render(<NeedsAttention items={items} now={now} />)
    expect(rows()).toHaveLength(4)
    expect(screen.getByText("Card declined for the spring turn-on; customer emailed an update link")).toBeInTheDocument()
    expect(screen.getByText("2 days ago")).toBeInTheDocument()
    expect(screen.getByText("19 hours ago")).toBeInTheDocument()
    expect(screen.getByText("40 minutes ago")).toBeInTheDocument()
    expect(screen.getByText("10 hours ago")).toBeInTheDocument()
  })

  it("colours the icon circle by kind", () => {
    render(<NeedsAttention items={items} now={now} />)
    const [charge, jobs, week, card] = rows().map(iconOf)
    expect(charge).toHaveClass("bg-warning/10", "text-warning")
    expect(jobs).toHaveClass("bg-warning/10", "text-warning")
    expect(week).toHaveClass("bg-primary/10", "text-primary-dark")
    expect(card).toHaveClass("bg-stone", "text-muted-foreground")
    expect(charge.querySelector("svg")).not.toBeNull()
    expect(rows().map((r) => r.dataset.kind)).toEqual(["charge-failed", "jobs-failed", "week-full", "card-expiring"])
  })

  it("links a row to its pass and leaves a row without one unlinked", () => {
    render(<NeedsAttention items={items} now={now} />)
    const links = screen.getAllByRole("link")
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["#pass-p3", "#pass-p7", "#pass-p5"])
    expect(rows()[2].querySelector("a")).toBeNull()
  })

  it("shows the empty state when nothing needs attention", () => {
    render(<NeedsAttention items={[]} now={now} />)
    expect(rows()).toHaveLength(0)
    expect(screen.getByRole("status")).toHaveTextContent("Nothing needs you right now")
    expect(screen.getByText("Failed charges, missing jobs and expiring cards show up here.")).toBeInTheDocument()
  })
})
