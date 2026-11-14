import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import type { Attention } from "@/lib/admin/types"
import { NeedsAttention } from "./NeedsAttention"

const now = "2026-11-12T18:00:00Z"
const items: Attention[] = [
  { kind: "charge-failed", passId: "p3", message: "Card declined for the spring turn-on; customer emailed an update link", since: "2026-11-10T15:04:00Z" },
  { kind: "jobs-failed", passId: "p7", message: "Jobber jobs for pass TH-2027-0007 were not created; retrying", since: "2026-11-11T22:41:00Z" },
  { kind: "card-expiring", message: "A card on file with no pass yet expires next month", since: "2026-11-12T17:20:00Z" },
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

  it("names the kind for a screen reader before the message", () => {
    render(<NeedsAttention items={items} now={now} />)
    const hidden = rows().map((r) => r.querySelector(".sr-only")?.textContent)
    expect(hidden).toEqual(["Charge failed: ", "Task needs a retry: ", "Card expiring: ", "Card expiring: "])
  })

  it("colours the icon circle by kind", () => {
    render(<NeedsAttention items={items} now={now} />)
    const [charge, jobs, , card] = rows().map(iconOf)
    expect(charge).toHaveClass("bg-warning/10", "text-warning")
    expect(jobs).toHaveClass("bg-warning/10", "text-warning")
    expect(card).toHaveClass("bg-stone", "text-muted-foreground")
    expect(charge.querySelector("svg")).not.toBeNull()
    expect(rows().map((r) => r.dataset.kind)).toEqual(["charge-failed", "jobs-failed", "card-expiring", "card-expiring"])
  })

  it("links a row to its pass and leaves a row without one unlinked", () => {
    render(<NeedsAttention items={items} now={now} />)
    const links = screen.getAllByRole("link")
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/admin/passes?pass=p3", "/admin/passes?pass=p7", "/admin/passes?pass=p5"])
    expect(rows()[2].querySelector("a")).toBeNull()
  })

  it("gives every row one action, labelled by its kind", () => {
    render(<NeedsAttention items={items} now={now} />)
    const actions = Array.from(document.querySelectorAll('[data-slot="attention-action"]')).map((b) => b.textContent)
    expect(actions).toEqual(["Send card link", "Retry", "Send card link", "Send card link"])
    expect(screen.getByRole("button", { name: /^Retry: Jobber jobs for pass TH-2027-0007/ })).toBeInTheDocument()
  })

  it("shows the empty state when nothing needs attention", () => {
    render(<NeedsAttention items={[]} now={now} />)
    expect(rows()).toHaveLength(0)
    expect(document.querySelector('[data-slot="empty-state"]')).toHaveTextContent("Nothing needs you right now")
    expect(screen.getByText("Failed charges, visits that need a day and visits nobody marked done show up here.")).toBeInTheDocument()
  })

  it("shows visits not closed with the dashed circle, a muted icon and a link to the Schedule", () => {
    render(<NeedsAttention items={[{ kind: "not-closed", message: "3 visits from before today are not marked done yet.", since: "2026-11-09T17:00:00Z" }]} now={now} />)
    const [row] = rows()
    expect(row.querySelector(".sr-only")?.textContent).toBe("Jobs not marked done: ")
    expect(iconOf(row)).toHaveClass("bg-stone", "text-muted-foreground")
    expect(row.querySelector("a")).toHaveAttribute("href", "/admin/schedule")
  })

  it("links an unplaced visit to that visit on Visits", () => {
    render(<NeedsAttention items={[{ kind: "unplaced", visitId: "v 1", message: "Percy could not be placed.", since: "2026-11-09T17:00:00Z" }]} now={now} />)
    expect(rows()[0]!.querySelector("a")).toHaveAttribute("href", "/admin/visits?visit=v%201")
  })
})
